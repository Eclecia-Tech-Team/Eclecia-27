import { NextResponse } from "next/server";
import connect from "@/lib/mongoose";
import User from "@/lib/models/User";
import { sendWelcomeEmail } from "@/lib/auth-mail";
import { checkOtp, clearOtpSession, isValidDeviceId } from "@/lib/otp-session-store";

interface VerifyOtpBody {
  email?: string;
  otp?: string;
  deviceId?: string;
}

export async function POST(request: Request) {
  try {
    const body = ((await request.json().catch(() => ({}))) ?? {}) as VerifyOtpBody;
    const email = body.email?.toLowerCase().trim();
    const otp = body.otp?.trim();
    const deviceId = body.deviceId;

    if (!email || !otp || !deviceId) {
      return NextResponse.json(
        { error: "Missing required fields: email, otp, deviceId" },
        { status: 400 }
      );
    }
    if (!isValidDeviceId(deviceId)) {
      return NextResponse.json(
        { error: "Invalid device session. Please refresh and try again." },
        { status: 400 }
      );
    }

    await connect();

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (user.provider === "google") {
      return NextResponse.json(
        { error: "This email is registered with Google. Please sign in with Google." },
        { status: 409 }
      );
    }

    const result = await checkOtp(email, deviceId, otp);
    if (result === "missing") {
      return NextResponse.json(
        { error: "No active OTP found. Please request a new OTP." },
        { status: 400 }
      );
    }
    if (result === "invalid") {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    const justVerified = !user.verified;
    user.emailVerified = new Date();
    user.verified = true;
    await user.save();
    await clearOtpSession(email, deviceId);

    if (justVerified) {
      await sendWelcomeEmail(email).catch((err) =>
        console.error("[verify-otp] welcome_mail_failed", err)
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[verify-otp] error", err);
    return NextResponse.json(
      { error: "Failed to verify OTP. Please try again." },
      { status: 500 }
    );
  }
}
