import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import connect from "@/lib/mongoose";
import User from "@/lib/models/User";
import { usernameSchema } from "@/lib/validations/auth";

/**
 * GET /api/user/username?name=…  →  { available, reason? }
 * Live check while someone edits their username. Signed-in only; their own
 * current name (any case) counts as available.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const name = new URL(request.url).searchParams.get("name") ?? "";
  const parsed = usernameSchema.safeParse(name);
  if (!parsed.success) {
    return NextResponse.json({ available: false, reason: parsed.error.issues[0]?.message ?? "Not a valid username" });
  }

  await connect();
  // Escaped anyway, though the schema already limits it to [a-zA-Z0-9_-].
  const escaped = parsed.data.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const taken = await User.exists({
    username: new RegExp(`^${escaped}$`, "i"),
    _id: { $ne: new mongoose.Types.ObjectId(session.user.id) },
  });
  return NextResponse.json(taken ? { available: false, reason: "Already taken" } : { available: true });
}
