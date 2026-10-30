import Event from "@/lib/models/Events";
import connect from "@/lib/mongoose";
import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";

/** One event by Mongo id or atlas slug (e.g. "short-film"). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await connect();

    const event = await Event.findOne(
      isValidObjectId(id) ? { _id: id } : { slug: id.toLowerCase() },
    )
      .select(
        "_id slug eventName category kind date time duration venue description banner rules clubs isTeamEvent pocs minMembersPerTeam maxMembersPerTeam teamLimit isPaidEvent fees prizePool isActive doc",
      )
      .lean();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error("Fetch Event Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
