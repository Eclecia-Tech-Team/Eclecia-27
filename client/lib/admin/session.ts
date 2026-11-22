import crypto from "crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import connect from "@/lib/mongoose";
import AdminUser from "@/lib/models/AdminUser";
import { can, canManageAdmins, type AdminArea, type AdminIdentity } from "@/lib/admin/access";

const COOKIE = "ecl_admin";
const MAX_AGE_SEC = 12 * 60 * 60;

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET || process.env.AUTH_SECRET;
  if (!s) throw new Error('Missing environment variable: "ADMIN_SESSION_SECRET" or "AUTH_SECRET"');
  return s;
}

const sign = (data: string) => crypto.createHmac("sha256", secret()).update(data).digest("base64url");

/** Constant-time string compare (hashing first so lengths never leak). */
export function safeEqual(a: string, b: string) {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** Master-key sessions are tied to the key itself: rotating ADMIN_MASTER_KEY ends them. */
const masterVersion = () => crypto.createHash("sha256").update(`v:${process.env.ADMIN_MASTER_KEY ?? ""}`).digest("hex").slice(0, 16);

/**
 * Sets the panel cookie. id is an AdminUser id (with its sessionVersion), or
 * "master" for the master key.
 */
export async function startAdminSession(id: string, version: number | string = 0) {
  const v = id === "master" ? masterVersion() : version;
  const body = Buffer.from(JSON.stringify({ id, v, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SEC })).toString("base64url");
  (await cookies()).set(COOKIE, `${body}.${sign(body)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function endAdminSession() {
  (await cookies()).delete(COOKIE);
}

function readToken(token: string | undefined): { id: string; v: unknown } | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || !safeEqual(sig, sign(body))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { id?: unknown; v?: unknown; exp?: unknown };
    if (typeof data.id !== "string" || typeof data.exp !== "number") return null;
    if (data.exp <= Math.floor(Date.now() / 1000)) return null;
    return { id: data.id, v: data.v };
  } catch {
    return null;
  }
}

/**
 * The signed-in admin, re-read from the database on every request so a role
 * change or removal takes effect at once instead of when the cookie expires.
 */
export const getAdmin = cache(async (): Promise<AdminIdentity | null> => {
  const token = readToken((await cookies()).get(COOKIE)?.value);
  if (!token) return null;
  const { id } = token;
  if (id === "master") {
    if (!process.env.ADMIN_MASTER_KEY || token.v !== masterVersion()) return null;
    return { id: "master", email: "master key", role: "master", areas: [] };
  }
  if (!/^[a-f\d]{24}$/i.test(id)) return null;
  await connect();
  const user = await AdminUser.findById(id)
    .select("email role areas sessionVersion")
    .lean<{ email: string; role: AdminIdentity["role"]; areas?: AdminArea[]; sessionVersion?: number }>();
  if (!user || (user.sessionVersion ?? 0) !== token.v) return null;
  return { id, email: user.email, role: user.role, areas: user.areas ?? [] };
});

export type Guarded = { ok: true; admin: AdminIdentity } | { ok: false; error: string };

/** For server actions: the admin if allowed, else an error to hand back. */
export async function guard(area: AdminArea | "admins", write = false): Promise<Guarded> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "Your session ended. Sign in again." };
  const allowed = area === "admins" ? canManageAdmins(admin) : can(admin, area, write);
  return allowed ? { ok: true, admin } : { ok: false, error: "Your role can't do that." };
}
