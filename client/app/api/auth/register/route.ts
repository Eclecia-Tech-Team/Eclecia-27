import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connect from "@/lib/mongoose";
import User from "@/lib/models/User";
import { firstIssue, registerApiSchema } from "@/lib/validations/auth";
import { sendOtpEmail } from "@/lib/auth-mail";
import { generateOtp, hashOtp, otpExpiryDate } from "@/lib/otp";
import { isValidDeviceId, setOtpSession } from "@/lib/otp-session-store";

async function issueOtp(email: string, deviceId: string) {
  const otp = generateOtp();
  await setOtpSession({ email, deviceId, otpHash: hashOtp(otp), expiresAt: otpExpiryDate(10) });
  await sendOtpEmail(email, otp);
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null);
    if (body === null || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request. Please provide username, email, and password." },
        { status: 400 }
      );
    }

    const parsed = registerApiSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: firstIssue(parsed.error), fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const deviceId = (body as { deviceId?: unknown }).deviceId;
    if (!isValidDeviceId(deviceId)) {
      return NextResponse.json(
        { error: "Invalid device session. Please refresh and try again." },
        { status: 400 }
      );
    }

    const { username, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    await connect();

    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      if (existingEmail.provider === "google") {
        return NextResponse.json(
          { error: "This email is registered with Google. Please sign in using Google." },
          { status: 409 }
        );
      }

      // Signed up before but never verified: same password re-sends the code.
      if (
        !existingEmail.verified &&
        existingEmail.passwordHash &&
        (await bcrypt.compare(password, existingEmail.passwordHash))
      ) {
        await issueOtp(existingEmail.email, deviceId);
        return NextResponse.json({
          success: true,
          requiresVerification: true,
          message: "Account already exists but is not verified. A new OTP has been sent.",
        });
      }

      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const existingUsername = await User.exists({
      username: new RegExp(`^${username}$`, "i"),
    });
    if (existingUsername) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }

    await User.create({
      username,
      email: normalizedEmail,
      provider: "credentials",
      passwordHash: await bcrypt.hash(password, 10),
      avatar: Math.floor(Math.random() * 10) + 1,
      verified: false,
    });

    await issueOtp(normalizedEmail, deviceId);

    return NextResponse.json(
      {
        success: true,
        requiresVerification: true,
        message: "OTP sent. Please verify your email to complete account setup.",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[register] unhandled_error", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
