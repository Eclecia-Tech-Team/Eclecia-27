import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connect from "@/lib/mongoose";
import User from "@/lib/models/User";
import { firstIssue, resetPasswordSchema } from "@/lib/validations/auth";
import { checkOtp, clearOtpSession, isValidDeviceId } from "@/lib/otp-session-store";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    const parsed = resetPasswordSchema.safeParse(body);
    const deviceId = (body as { deviceId?: unknown } | null)?.deviceId;

    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
    }

    if (!isValidDeviceId(deviceId)) {
      return NextResponse.json(
        { error: "Invalid device session. Please refresh and try again." },
        { status: 400 }
      );
    }

    const { email, otp, newPassword } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    if ((await checkOtp(normalizedEmail, deviceId, otp)) !== "ok") {
      return NextResponse.json({ error: "Invalid or expired OTP." }, { status: 400 });
    }

    await connect();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    // Receiving the code proves the inbox, so this also verifies the account.
    if (!user.verified) {
      user.verified = true;
      user.emailVerified = new Date();
    }
    await user.save();

    await clearOtpSession(normalizedEmail, deviceId);

    return NextResponse.json({
      success: true,
      message: "Your password has been reset successfully. Please sign in with your new password.",
    });
  } catch (err) {
    console.error("[reset-password] error:", err);
    return NextResponse.json(
      { error: "Unable to process request. Please try again later." },
      { status: 500 }
    );
  }
}
