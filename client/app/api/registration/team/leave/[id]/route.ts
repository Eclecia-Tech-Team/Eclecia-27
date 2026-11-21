import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connect from "@/lib/mongoose";
import Event from "@/lib/models/Events";
import Registration from "@/lib/models/Registrations";
import Team from "@/lib/models/Team";
import { fail } from "@/lib/registration";

/**
 * Leave a team (`id`: team id). Members just leave. A leader alone in the team
 * disbands it; a leader with teammates must remove them first (from the
 * profile's Teams tab). Locked once a paid team's fee is completed.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return fail(401, "UNAUTHENTICATED", "Sign in first.");
    const userId = session.user.id;

    await connect();
    const { id } = await params;
    const team = await Team.findById(id);
    if (!team || !team.team.map(String).includes(userId)) {
      return fail(404, "NOT_FOUND", "You're not in this team.");
    }
    if (team.paymentStatus === "completed") {
      return fail(400, "FORBIDDEN", "Teams can't change after the fee is paid. Contact the coordinators.");
    }

    const isLeader = String(team.teamLeader) === userId;
    if (isLeader) {
      if (team.team.length > 1) {
        return fail(400, "FORBIDDEN", "Remove your teammates first (Profile → Teams), then leave to disband the team.");
      }
      await Registration.deleteMany({ teamId: team._id });
      await Event.updateOne({ _id: team.eventId }, { $pull: { registrations: team._id } });
      await Team.deleteOne({ _id: team._id });
      return NextResponse.json({ message: "Team disbanded. You're no longer registered." });
    }

    await Team.updateOne({ _id: team._id }, { $pull: { team: userId } });
    await Registration.deleteOne({ teamId: team._id, participant: userId });
    return NextResponse.json({ message: "You left the team." });
  } catch (error) {
    console.error("[registration/team/leave]", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
