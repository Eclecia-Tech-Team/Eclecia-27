import connect from "@/lib/mongoose";
import OtpSession from "@/lib/models/OtpSession";
import { hashOtp } from "@/lib/otp";

const OTP_SESSION_PREFIX = "otp:";
/** Wrong guesses allowed before the OTP is burned and a new one is needed. */
const MAX_ATTEMPTS = 5;

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

function keyFor(email: string, deviceId: string) {
  return `${OTP_SESSION_PREFIX}${normalizeEmail(email)}:${deviceId}`;
}

export function isValidDeviceId(deviceId: unknown): deviceId is string {
  return (
    typeof deviceId === "string" &&
    deviceId.length >= 16 &&
    deviceId.length <= 128 &&
    /^[a-zA-Z0-9_-]+$/.test(deviceId)
  );
}

export async function setOtpSession(params: {
  email: string;
  deviceId: string;
  otpHash: string;
  expiresAt: Date;
}) {
  await connect();
  await OtpSession.findOneAndUpdate(
    { key: keyFor(params.email, params.deviceId) },
    {
      email: normalizeEmail(params.email),
      otpHash: params.otpHash,
      attempts: 0,
      expiresAt: params.expiresAt,
    },
    { upsert: true },
  );
}

export type OtpCheck = "ok" | "missing" | "invalid";

/** Checks an OTP against the active session. Burns the session after too many misses. */
export async function checkOtp(email: string, deviceId: string, otp: string): Promise<OtpCheck> {
  await connect();
  const key = keyFor(email, deviceId);
  const session = await OtpSession.findOne({ key });
  if (!session || session.expiresAt.getTime() <= Date.now()) return "missing";

  if (session.otpHash !== hashOtp(otp)) {
    session.attempts += 1;
    if (session.attempts >= MAX_ATTEMPTS) await session.deleteOne();
    else await session.save();
    return "invalid";
  }
  return "ok";
}

export async function clearOtpSession(email: string, deviceId: string) {
  await connect();
  await OtpSession.deleteOne({ key: keyFor(email, deviceId) });
}
