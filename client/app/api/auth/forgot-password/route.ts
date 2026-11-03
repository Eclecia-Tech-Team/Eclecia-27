import { NextResponse } from "next/server";
import connect from "@/lib/mongoose";
import User from "@/lib/models/User";
import { firstIssue, forgotPasswordSchema } from "@/lib/validations/auth";
import { sendPasswordResetOtpEmail } from "@/lib/auth-mail";
import { generateOtp, hashOtp, otpExpiryDate } from "@/lib/otp";
import { isValidDeviceId, setOtpSession } from "@/lib/otp-session-store";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    const parsed = forgotPasswordSchema.safeParse(body);
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

    const normalizedEmail = parsed.data.email.toLowerCase();

    await connect();
    const user = await User.findOne({ email: normalizedEmail });

    // Registration already reveals whether an email exists, so be direct here too.
    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email address." },
        { status: 404 }
      );
    }

    if (user.provider === "google") {
      return NextResponse.json(
        { error: "This account is linked with Google. Please sign in using Google." },
        { status: 409 }
      );
    }

    const otp = generateOtp();
    await setOtpSession({
      email: normalizedEmail,
      deviceId,
      otpHash: hashOtp(otp),
      expiresAt: otpExpiryDate(15),
    });

    await sendPasswordResetOtpEmail(normalizedEmail, otp);

    return NextResponse.json({
      success: true,
      message: "A password reset OTP has been sent to your email.",
    });
  } catch (err) {
    console.error("[forgot-password] error:", err);
    return NextResponse.json(
      { error: "Unable to process request. Please try again later." },
      { status: 500 }
    );
  }
}
