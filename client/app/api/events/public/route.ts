import Event from "@/lib/models/Events";
import connect from "@/lib/mongoose";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connect();

    const events = await Event.find()
      .select(
        "_id slug eventName category kind description banner clubs date time venue isTeamEvent prizePool maxMembersPerTeam minMembersPerTeam isActive",
      )
      .sort({ category: 1, eventName: 1 })
      .lean();

    return NextResponse.json(events);
  } catch (error) {
    console.error("Fetch Event Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
