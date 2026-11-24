import { auth } from "@/auth";
import Registration from "@/lib/models/Registrations";
import connect from "@/lib/mongoose";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connect();

    const docs = await Registration.find({ participant: session.user.id })
      .populate("eventId", "slug eventName category date time venue banner isPaidEvent")
      .populate("teamId", "teamLeader")
      .select("-checkedIn -foodServedCount")
      .lean<(Record<string, unknown> & { teamId?: { teamLeader?: unknown } | null })[]>();

    // Solo registrants and team leaders pay with their registration ID; members don't.
    const registrations = docs.map(({ teamId, ...reg }) => ({
      ...reg,
      isPayer: !teamId || String(teamId.teamLeader) === session.user!.id,
    }));

    return NextResponse.json({ registrations }, { status: 200 });
  } catch (error) {
    console.error("Error in Fetching Registered events:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
