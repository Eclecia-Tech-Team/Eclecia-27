import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import connect from "@/lib/mongoose";
import Registration from "@/lib/models/Registrations";

export const dynamic = "force-dynamic";

type Code = "UNAUTHORIZED" | "NOT_FOUND" | "NOT_PAYER" | "NO_FEE" | "ALREADY_PAID" | "UNAVAILABLE";
const fail = (status: number, code: Code, error: string) =>
  NextResponse.json({ code, error }, { status, headers: { "Cache-Control": "no-store" } });

/** Constant-time compare of the `x-api-key` header against PAYMENT_API_KEY (hashed so lengths match). */
function authorised(request: Request) {
  const expected = process.env.PAYMENT_API_KEY;
  const given = request.headers.get("x-api-key");
  if (!expected || !given) return false;
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(given), h(expected));
}

type Populated = {
  isInTeam: boolean;
  verified: boolean;
  registrationCode: string;
  participant: { _id: { toString(): string }; fullName?: string; username: string; email: string; phoneNumber?: string; college?: string } | null;
  eventId: { eventName: string; isTeamEvent: boolean; isPaidEvent: boolean; fees?: number } | null;
  teamId: { teamName?: string; teamLeader: { toString(): string }; team: unknown[]; paymentStatus?: string } | null;
};

/**
 * Payment provider lookup: who is paying for what, by registration ID.
 * Solo registrants and team leaders pay; a team member's ID is refused (their leader pays for the team).
 * Auth: `x-api-key: <PAYMENT_API_KEY>`.
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!process.env.PAYMENT_API_KEY) return fail(503, "UNAVAILABLE", "Payment lookup isn't configured.");
  if (!authorised(request)) return fail(401, "UNAUTHORIZED", "Missing or invalid API key.");

  const code = decodeURIComponent((await params).code).trim().toUpperCase();
  if (!/^REG-[A-Z0-9]{8}$/.test(code)) return fail(404, "NOT_FOUND", "No registration has that ID.");

  try {
    await connect();
    const reg = await Registration.findOne({ registrationCode: code })
      .populate("participant", "fullName username email phoneNumber college")
      .populate("eventId", "eventName isTeamEvent isPaidEvent fees")
      .populate("teamId", "teamName teamLeader team paymentStatus")
      .lean<Populated | null>();
    if (!reg?.participant || !reg.eventId) return fail(404, "NOT_FOUND", "No registration has that ID.");

    const { participant: p, eventId: event, teamId: team } = reg;
    if (team && team.teamLeader.toString() !== p._id.toString()) {
      return fail(409, "NOT_PAYER", "This is a team member's ID. The team leader pays with their registration ID.");
    }
    if (!event.isPaidEvent || !event.fees) return fail(409, "NO_FEE", "This event has no entry fee.");
    const paid = team ? team.paymentStatus === "completed" : reg.verified;
    if (paid) return fail(409, "ALREADY_PAID", "The fee for this registration is already paid.");

    return NextResponse.json(
      {
        registrationId: reg.registrationCode,
        participantName: p.fullName || p.username,
        participantEmail: p.email,
        participantPhone: p.phoneNumber ?? "",
        participantCollege: p.college ?? "",
        eventName: event.eventName,
        eventFee: event.fees,
        eventType: event.isTeamEvent ? "team" : "solo",
        teamName: team?.teamName ?? null,
        teamMembers: team ? team.team.length : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[payment/registrations]", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
