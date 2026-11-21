import { NextResponse } from "next/server";
import Registration from "@/lib/models/Registrations";
import Team from "@/lib/models/Team";
import User from "@/lib/models/User";
import { confirmByMail, fail, loadRegistrant, paymentNote } from "@/lib/registration";

/** Join an existing team of this event by its code. Body: `{ teamCode }`. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { teamCode?: unknown };
    const teamCode = typeof body.teamCode === "string" ? body.teamCode.trim().toUpperCase() : "";
    if (!teamCode) return fail(400, "BAD_CODE", "Enter your team's code.");

    const ctx = await loadRegistrant(id);
    if (ctx instanceof NextResponse) return ctx;
    const { user, event } = ctx;
    if (!event.isTeamEvent) return fail(400, "WRONG_FORMAT", "This is a solo event.");

    const found = await Team.findOne({ teamCode });
    if (!found) return fail(404, "BAD_CODE", "No team has that code.");
    if (String(found.eventId) !== String(event._id)) {
      return fail(400, "BAD_CODE", "That code belongs to a team in a different event.");
    }

    // Seat claimed atomically, so two people can't both take the last spot.
    const team = await Team.findOneAndUpdate(
      { _id: found._id, team: { $ne: user._id }, $expr: { $lt: [{ $size: "$team" }, event.maxMembersPerTeam] } },
      { $addToSet: { team: user._id } },
      { new: true },
    );
    if (!team) return fail(400, "TEAM_FULL", `This team is full (${event.maxMembersPerTeam} members max).`);

    try {
      await Registration.create({
        eventId: event._id,
        participant: user._id,
        isInTeam: true,
        teamId: team._id,
        verified: !event.isPaidEvent || team.paymentStatus === "completed",
      });
    } catch (error) {
      await Team.updateOne({ _id: team._id }, { $pull: { team: user._id } });
      throw error;
    }

    const leader = await User.findById(team.teamLeader).select("fullName username").lean<{ fullName?: string; username: string }>();
    confirmByMail(user, event, { teamName: team.teamName, teamCode: team.teamCode, isTeamLeader: false });

    return NextResponse.json(
      {
        message: `You joined ${team.teamName ? `"${team.teamName}"` : "the team"}${leader ? `, led by ${leader.fullName || leader.username}` : ""}.${paymentNote(event)}`,
      },
      { status: 201 },
    );
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return fail(400, "ALREADY_REGISTERED", "You're already registered for this event.");
    }
    console.error("[registration/team/join]", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
