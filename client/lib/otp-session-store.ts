import connect from "@/lib/mongoose";
import OtpSession from "@/lib/models/OtpSession";
import { hashOtp } from "@/lib/otp";

const OTP_SESSION_PREFIX = "otp:";
/** Wrong guesses allowed before the OTP is burned and a new one is needed. */
const MAX_ATTEMPTS = 5;

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

/** "otp" for festival accounts, "admin" for the panel: the two never collide. */
export type OtpScope = "otp" | "admin";

function keyFor(email: string, deviceId: string, scope: OtpScope = "otp") {
  const prefix = scope === "otp" ? OTP_SESSION_PREFIX : `${scope}_otp:`;
  return `${prefix}${normalizeEmail(email)}:${deviceId}`;
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
  scope?: OtpScope;
  /** Opaque data released only on a correct OTP (e.g. a pending password hash). */
  payload?: string;
}) {
  await connect();
  await OtpSession.findOneAndUpdate(
    { key: keyFor(params.email, params.deviceId, params.scope) },
    {
      email: normalizeEmail(params.email),
      otpHash: params.otpHash,
      attempts: 0,
      expiresAt: params.expiresAt,
      payload: params.payload ?? null,
    },
    { upsert: true },
  );
}

export type OtpCheck = "ok" | "missing" | "invalid";

/** Checks an OTP against the active session. Burns the session after too many misses. */
export async function checkOtp(email: string, deviceId: string, otp: string, scope?: OtpScope): Promise<OtpCheck> {
  return (await verifyOtp(email, deviceId, otp, scope)).status;
}

/** checkOtp, plus the session's payload when the OTP is right. */
export async function verifyOtp(
  email: string,
  deviceId: string,
  otp: string,
  scope?: OtpScope,
): Promise<{ status: OtpCheck; payload?: string }> {
  await connect();
  const key = keyFor(email, deviceId, scope);
  const session = await OtpSession.findOne({ key });
  if (!session || session.expiresAt.getTime() <= Date.now()) return { status: "missing" };
  if (session.attempts >= MAX_ATTEMPTS) return { status: "missing" };

  if (session.otpHash !== hashOtp(otp)) {
    // Atomic: parallel wrong guesses each count, so MAX_ATTEMPTS really caps them.
    const after = await OtpSession.findOneAndUpdate({ key }, { $inc: { attempts: 1 } }, { new: true });
    if (after && after.attempts >= MAX_ATTEMPTS) await OtpSession.deleteOne({ key });
    return { status: "invalid" };
  }
  return { status: "ok", payload: session.payload ?? undefined };
}

export async function clearOtpSession(email: string, deviceId: string, scope?: OtpScope) {
  await connect();
  await OtpSession.deleteOne({ key: keyFor(email, deviceId, scope) });
}

/**
 * Was a code sent to this email (any device) in the last `seconds`? Codes live
 * 10 minutes, so the send time is expiresAt minus that. Used to stop a form
 * being used to flood someone's inbox.
 */
export async function otpSentRecently(email: string, scope: OtpScope, seconds: number, ttlMinutes = 10) {
  await connect();
  const prefix = scope === "otp" ? OTP_SESSION_PREFIX : `${scope}_otp:`;
  const sentAfter = Date.now() - seconds * 1000;
  return Boolean(
    await OtpSession.exists({
      email: normalizeEmail(email),
      key: { $regex: `^${prefix}` },
      expiresAt: { $gt: new Date(sentAfter + ttlMinutes * 60_000) },
    }),
  );
}
