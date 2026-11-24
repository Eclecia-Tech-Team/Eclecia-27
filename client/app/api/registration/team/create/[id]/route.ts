import { NextResponse } from "next/server";
import Event from "@/lib/models/Events";
import Team from "@/lib/models/Team";
import CampusAmbassador from "@/lib/models/CampusAmbassador";
import generateCode from "@/lib/generateTeamID";
import { confirmByMail, createRegistration, fail, isEventFull, loadRegistrant, paymentNote } from "@/lib/registration";

/** Create a team for a team event, with the visitor as leader. Body: `{ teamName }`. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { teamName?: unknown; refCode?: string };
    const teamName = typeof body.teamName === "string" ? body.teamName.trim() : "";
    const rawRefCode = typeof body.refCode === "string" ? body.refCode.trim().toUpperCase() : "";
    if (teamName.length < 2 || teamName.length > 40) {
      return NextResponse.json({ error: "Team name must be 2 to 40 characters." }, { status: 400 });
    }

    const ctx = await loadRegistrant(id);
    if (ctx instanceof NextResponse) return ctx;
    const { user, event } = ctx;

    if (!event.isTeamEvent) return fail(400, "WRONG_FORMAT", "This is a solo event.");
    if (await isEventFull(event)) return fail(400, "FULL", "This event has no team slots left.");

    let validRefCode: string | undefined = undefined;
    if (rawRefCode) {
      const ambassadorExists = await CampusAmbassador.exists({ ambassadorCode: rawRefCode });
      if (ambassadorExists) {
        validRefCode = rawRefCode;
        await CampusAmbassador.updateOne(
          { ambassadorCode: rawRefCode },
          { $inc: { referralCount: 1 } }
        );
      }
    }

    // Codes are random; retry the rare collision on the unique index.
    let team;
    for (let attempt = 0; !team; attempt++) {
      try {
        team = await Team.create({
          eventId: event._id,
          teamCode: `ECL-${generateCode()}`,
          teamName,
          teamLeader: user._id,
          team: [user._id],
          ...(event.isPaidEvent ? { paymentStatus: "pending" } : {}),
        });
      } catch (error) {
        const dup = (error as { code?: number; keyPattern?: Record<string, number> });
        if (dup.code !== 11000 || !dup.keyPattern?.teamCode || attempt >= 4) throw error;
      }
    }

    let registration;
    try {
      registration = await createRegistration({
        eventId: event._id,
        participant: user._id,
        isInTeam: true,
        teamId: team._id,
        verified: !event.isPaidEvent,
        ...(validRefCode ? { referredByCode: validRefCode } : {}),
      });
    } catch (error) {
      await Team.deleteOne({ _id: team._id });
      throw error;
    }
    await Event.updateOne({ _id: event._id }, { $addToSet: { registrations: team._id } });
    const { registrationCode } = registration;
    confirmByMail(user, event, registrationCode, { teamName, teamCode: team.teamCode, isTeamLeader: true });

    return NextResponse.json(
      {
        message: `Team "${teamName}" created. Share code ${team.teamCode} with your teammates. Your registration ID is ${registrationCode}.${paymentNote(event, registrationCode)}`,
        teamCode: team.teamCode,
        registrationCode,
      },
      { status: 201 },
    );
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return fail(400, "ALREADY_REGISTERED", "You're already registered for this event.");
    }
    console.error("[registration/team/create]", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
