import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import connect from "@/lib/mongoose";
import Team from "@/lib/models/Team";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connect();
    const { id } = await params;
    const { teamName } = await req.json();

    if (!id || !teamName) {
      return NextResponse.json(
        { success: false, message: "Team ID and Team Name are required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid Team ID" },
        { status: 400 }
      );
    }

    const team = await Team.findById(id);
    if (!team) {
      return NextResponse.json(
        { success: false, message: "Team not found" },
        { status: 404 }
      );
    }

    if (String(team.teamLeader) !== session.user.id) {
      return NextResponse.json(
        { success: false, message: "Only the Team Leader can update team name" },
        { status: 403 }
      );
    }

    const updatedTeam = await Team.findByIdAndUpdate(
      id,
      { teamName: String(teamName).trim() },
      { new: true, runValidators: true }
    );

    return NextResponse.json(
      { success: true, message: "Team name updated successfully", data: updatedTeam },
      { status: 200 }
    );
  } catch (error) {
    console.error("PATCH Team Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
