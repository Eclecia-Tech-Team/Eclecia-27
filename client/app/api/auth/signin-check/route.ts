import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connect from "@/lib/mongoose";
import User from "@/lib/models/User";
import { signInSchema } from "@/lib/validations/auth";
import { sendOtpEmail } from "@/lib/auth-mail";
import { generateOtp, hashOtp, otpExpiryDate } from "@/lib/otp";
import { isValidDeviceId, setOtpSession } from "@/lib/otp-session-store";

/**
 * Pre-flight for credentials sign-in: NextAuth's authorize() can only say
 * yes/no, so this tells the client *why* (wrong password, Google account,
 * unverified email; the last one also sends a fresh OTP).
 */
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    const parsed = signInSchema.safeParse(body);
    const deviceId = (body as { deviceId?: unknown } | null)?.deviceId;

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
    }

    if (!isValidDeviceId(deviceId)) {
      return NextResponse.json(
        { error: "Invalid device session. Please refresh and try again." },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    await connect();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.provider === "google") {
      return NextResponse.json(
        {
          error: "This email is registered with Google. Please sign in using Google.",
          provider: "google",
        },
        { status: 409 }
      );
    }

    const valid = user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (!user.verified) {
      const otp = generateOtp();
      await setOtpSession({
        email: normalizedEmail,
        deviceId,
        otpHash: hashOtp(otp),
        expiresAt: otpExpiryDate(10),
      });
      await sendOtpEmail(normalizedEmail, otp);

      return NextResponse.json({
        requiresVerification: true,
        message: "Your email is not verified. A new OTP has been sent.",
      });
    }

    return NextResponse.json({ canSignIn: true });
  } catch (err) {
    console.error("[signin-check] error", err);
    return NextResponse.json(
      { error: "Unable to process sign-in. Please try again." },
      { status: 500 }
    );
  }
}
