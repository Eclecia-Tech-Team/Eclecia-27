"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import connect from "@/lib/mongoose";
import AdminUser from "@/lib/models/AdminUser";
import { sendAdminOtpEmail } from "@/lib/auth-mail";
import { generateOtp, hashOtp, otpExpiryDate } from "@/lib/otp";
import { clearOtpSession, isValidDeviceId, otpSentRecently, setOtpSession, verifyOtp } from "@/lib/otp-session-store";
import { endAdminSession, getAdmin, safeEqual, startAdminSession } from "@/lib/admin/session";
import { audit, throttle } from "@/lib/admin/audit";

export type AuthResult = { ok: true; firstLogin?: boolean } | { ok: false; error: string };

/** Wrong passwords allowed per email from one network, and per network overall, per window. */
const PER_EMAIL_IP = 5;
const PER_IP = 30;
const WINDOW_MIN = 15;
/** Minimum gap between two codes to the same inbox. */
const RESEND_GAP_SEC = 30;
/** Same reply for unknown email and wrong password: the form doesn't reveal who is staff. */
const WRONG = "Wrong email or password.";
const SLOW_DOWN = `Too many attempts from this network. Try again in ${WINDOW_MIN} minutes.`;
/** Compared against when the email is unknown, so both paths take as long. */
const DUMMY_HASH = bcrypt.hashSync("eclecia-admin-timing-pad", 10);

const norm = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : "");

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Step 1: email + password. On a first sign-in (invited, no password yet) the
 * chosen password is held with the emailed code and only saved once the code
 * checks out, so nobody who merely knows an invited address can claim it.
 *
 * Throttled per email+network and per network, never per account: a stranger
 * can't lock a volunteer out from somewhere else.
 */
export async function adminLogin(input: { email: string; password: string; deviceId: string }): Promise<AuthResult> {
  const email = norm(input.email);
  const password = typeof input.password === "string" ? input.password : "";
  if (!email || !password) return { ok: false, error: "Enter your email and password." };
  if (!isValidDeviceId(input.deviceId)) return { ok: false, error: "Refresh the page and try again." };

  const ip = await clientIp();
  const pairKey = `admin:${email}|${ip}`;
  const ipKey = `admin-ip:${ip}`;
  if ((await throttle.blocked(pairKey, PER_EMAIL_IP)) || (await throttle.blocked(ipKey, PER_IP))) return { ok: false, error: SLOW_DOWN };

  await connect();
  const admin = await AdminUser.findOne({ email });
  const fail = async () => {
    await Promise.all([throttle.hit(pairKey, WINDOW_MIN), throttle.hit(ipKey, WINDOW_MIN)]);
    return { ok: false as const, error: WRONG };
  };
  if (!admin) {
    await bcrypt.compare(password, DUMMY_HASH);
    return fail();
  }

  let payload: string | undefined;
  const firstLogin = !admin.passwordSetAt;
  if (firstLogin) {
    if (password.length < 8) return { ok: false, error: "First sign-in: choose a password of at least 8 characters." };
    payload = await bcrypt.hash(password, 10);
  } else if (!(await admin.comparePassword(password))) {
    return fail();
  }

  if (await otpSentRecently(email, "admin", RESEND_GAP_SEC)) {
    return { ok: false, error: `A code was just sent. Wait ${RESEND_GAP_SEC} seconds before asking for another.` };
  }
  const otp = generateOtp();
  await setOtpSession({ email, deviceId: input.deviceId, otpHash: hashOtp(otp), expiresAt: otpExpiryDate(10), scope: "admin", payload });
  try {
    await sendAdminOtpEmail(email, otp);
  } catch (err) {
    console.error("[admin] otp mail failed", err);
    return { ok: false, error: "Couldn't send the code. Try again in a minute." };
  }
  await throttle.clear(pairKey);
  return { ok: true, firstLogin };
}

/** Step 2: the emailed code. */
export async function adminVerify(input: { email: string; otp: string; deviceId: string }): Promise<AuthResult> {
  const email = norm(input.email);
  const otp = typeof input.otp === "string" ? input.otp.replace(/\s/g, "") : "";
  if (!email || !/^\d{6}$/.test(otp)) return { ok: false, error: "Enter the 6-digit code." };
  if (!isValidDeviceId(input.deviceId)) return { ok: false, error: "Refresh the page and try again." };

  const { status, payload } = await verifyOtp(email, input.deviceId, otp, "admin");
  if (status === "missing") return { ok: false, error: "That code expired or had too many wrong tries. Go back and sign in again." };
  if (status === "invalid") return { ok: false, error: "That code isn't right." };

  await connect();
  const admin = await AdminUser.findOne({ email });
  if (!admin) return { ok: false, error: WRONG };
  if (!admin.passwordSetAt) {
    if (!payload) return { ok: false, error: "Go back and choose your password again." };
    admin.passwordHash = payload;
    admin.passwordSetAt = new Date();
  }
  admin.lastLoginAt = new Date();
  await admin.save();
  await clearOtpSession(email, input.deviceId, "admin");
  await startAdminSession(admin._id.toString(), admin.sessionVersion ?? 0);
  return { ok: true };
}

/** Break-glass entry with ADMIN_MASTER_KEY (for the very first invite). Off when the key isn't set. */
export async function adminMasterKey(input: { key: string }): Promise<AuthResult> {
  const expected = process.env.ADMIN_MASTER_KEY;
  const key = typeof input.key === "string" ? input.key.trim() : "";
  if (!expected) return { ok: false, error: "Master key sign-in is turned off." };
  const ipKey = `admin-master:${await clientIp()}`;
  if (await throttle.blocked(ipKey, 5)) return { ok: false, error: SLOW_DOWN };
  if (!key || !safeEqual(key, expected)) {
    await throttle.hit(ipKey, WINDOW_MIN);
    return { ok: false, error: "That isn't the master key." };
  }
  await startAdminSession("master");
  await audit({ email: "master key" }, "master key sign-in", await clientIp());
  return { ok: true };
}

/** Signs out everywhere: older cookies on other devices stop working too. */
export async function adminLogout() {
  const admin = await getAdmin();
  if (admin && admin.id !== "master") {
    await connect();
    await AdminUser.updateOne({ _id: admin.id }, { $inc: { sessionVersion: 1 } });
  }
  await endAdminSession();
}
