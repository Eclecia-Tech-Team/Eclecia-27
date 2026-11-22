import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import connect from "@/lib/mongoose";
import User from "@/lib/models/User";
import { profileUpdateSchema } from "@/lib/validations/auth";
import { buildProfileQrPayload } from "@/lib/qr-token";

type ProfileUser = {
  username: string;
  email: string;
  avatar?: number;
  fullName?: string;
  phoneNumber?: string;
  college?: string;
  stream?: string;
  isProfileComplete?: boolean;
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connect();

    const user = (await User.findById(session.user.id)
      .select("username email avatar fullName phoneNumber college stream isProfileComplete")
      .lean()) as ProfileUser | null;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      username: user.username,
      email: user.email,
      avatar: user.avatar ?? null,
      fullName: user.fullName ?? "",
      phoneNumber: user.phoneNumber ?? "",
      college: user.college ?? "",
      stream: user.stream ?? "",
      isProfileComplete: user.isProfileComplete ?? false,
      qrPayload: buildProfileQrPayload(session.user.id),
    });
  } catch (error) {
    console.error("GET /api/user/profile error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = profileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.flatten().fieldErrors;
      const msg = Object.values(firstError).flat().filter(Boolean)[0] as string;
      return NextResponse.json({ error: msg || "Invalid input" }, { status: 400 });
    }

    const { avatar, username, fullName, phoneNumber, college, stream } = parsed.data;

    await connect();

    const update: Record<string, unknown> = {};
    if (avatar !== undefined) update.avatar = avatar;
    if (username !== undefined) update.username = username.trim();
    if (fullName !== undefined) update.fullName = fullName.trim();
    if (phoneNumber !== undefined) update.phoneNumber = phoneNumber.trim();
    if (college !== undefined) update.college = college.trim();
    if (stream !== undefined) update.stream = stream.trim();

    const currentUser = (await User.findById(session.user.id)
      .select("username email avatar fullName phoneNumber college stream isProfileComplete")
      .lean()) as ProfileUser | null;

    const mergedUser = { ...currentUser, ...update };

    const isProfileComplete =
      Boolean(mergedUser.username) &&
      Boolean(mergedUser.email) &&
      Boolean(mergedUser.fullName) &&
      Boolean(mergedUser.phoneNumber) &&
      Boolean(mergedUser.college) &&
      Boolean(mergedUser.stream);

    update.isProfileComplete = isProfileComplete;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({
        username: currentUser?.username,
        email: currentUser?.email,
        avatar: currentUser?.avatar ?? null,
        fullName: currentUser?.fullName ?? "",
        phoneNumber: currentUser?.phoneNumber ?? "",
        college: currentUser?.college ?? "",
        stream: currentUser?.stream ?? "",
        isProfileComplete: currentUser?.isProfileComplete ?? false,
        qrPayload: buildProfileQrPayload(session.user.id),
      });
    }

    if (username !== undefined && username.toLowerCase() !== (currentUser?.username || "").toLowerCase()) {
      const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const existing = await User.findOne({
        username: new RegExp(`^${escaped}$`, "i"),
        _id: { $ne: new mongoose.Types.ObjectId(session.user.id) },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Username is already taken" },
          { status: 409 }
        );
      }
    }

    const user = (await User.findByIdAndUpdate(
      session.user.id,
      { $set: update },
      { new: true }
    )
      .select("username email avatar fullName phoneNumber college stream isProfileComplete")
      .lean()) as ProfileUser | null;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      username: user.username,
      email: user.email,
      avatar: user.avatar ?? null,
      fullName: user.fullName ?? "",
      phoneNumber: user.phoneNumber ?? "",
      college: user.college ?? "",
      stream: user.stream ?? "",
      isProfileComplete: user.isProfileComplete ?? false,
      qrPayload: buildProfileQrPayload(session.user.id),
    });
  } catch (error) {
    // Two people grabbing the same name at once: the unique index wins, say it plainly.
    if ((error as { code?: number })?.code === 11000) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }
    console.error("PATCH /api/user/profile error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
