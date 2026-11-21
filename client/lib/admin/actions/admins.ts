"use server";

import connect from "@/lib/mongoose";
import AdminUser from "@/lib/models/AdminUser";
import { sendAdminInviteEmail } from "@/lib/auth-mail";
import { guard } from "@/lib/admin/session";
import { audit } from "@/lib/admin/audit";
import { ROLE_INFO, isAdminRole, pickAreas, type AdminArea, type AdminRole } from "@/lib/admin/access";
import type { ActionResult } from "./events";

const isId = (id: unknown): id is string => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);

function checkRole(role: unknown, areas: unknown): { role: AdminRole; areas: AdminArea[] } | string {
  if (!isAdminRole(role)) return "Pick a role.";
  const picked = role === "custom" ? pickAreas(areas) : [];
  if (role === "custom" && !picked.length) return "Custom role: pick at least one area.";
  return { role, areas: picked };
}

export async function inviteAdmin(input: { email: string; role: string; areas: string[] }): Promise<ActionResult> {
  const g = await guard("admins");
  if (!g.ok) return g;
  const email = String(input.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email." };
  const r = checkRole(input.role, input.areas);
  if (typeof r === "string") return { ok: false, error: r };

  await connect();
  if (await AdminUser.exists({ email })) return { ok: false, error: "They're already on the list." };
  await AdminUser.create({ email, ...r, invitedBy: g.admin.email });
  await audit(g.admin, "invited admin", email, r.role === "custom" ? `custom: ${r.areas.join(", ")}` : r.role);

  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.eclecia-hitk.in").replace(/\/+$/, "");
  sendAdminInviteEmail(email, ROLE_INFO[r.role].label.toLowerCase(), `${site}/admin/login`).catch((err) =>
    console.error("[admin] invite mail failed", err),
  );
  return { ok: true };
}

export async function updateAdmin(id: string, input: { role: string; areas: string[] }): Promise<ActionResult> {
  const g = await guard("admins");
  if (!g.ok) return g;
  if (!isId(id)) return { ok: false, error: "Admin not found." };
  if (id === g.admin.id) return { ok: false, error: "You can't change your own role." };
  const r = checkRole(input.role, input.areas);
  if (typeof r === "string") return { ok: false, error: r };
  await connect();
  const target = await AdminUser.findById(id).select("email role").lean<{ email: string; role: AdminRole }>();
  if (!target) return { ok: false, error: "Admin not found." };
  if (target.role === "admin" && r.role !== "admin" && (await AdminUser.countDocuments({ role: "admin" })) <= 1) {
    return { ok: false, error: "That's the last admin. Make someone else admin first." };
  }
  await AdminUser.updateOne({ _id: id }, { $set: r });
  await audit(g.admin, "changed role", target.email, `${target.role} → ${r.role === "custom" ? `custom: ${r.areas.join(", ")}` : r.role}`);
  return { ok: true };
}

export async function removeAdmin(id: string): Promise<ActionResult> {
  const g = await guard("admins");
  if (!g.ok) return g;
  if (!isId(id)) return { ok: false, error: "Admin not found." };
  if (id === g.admin.id) return { ok: false, error: "You can't remove yourself." };
  await connect();
  const target = await AdminUser.findById(id).select("email role").lean<{ email: string; role: AdminRole }>();
  if (!target) return { ok: false, error: "Admin not found." };
  if (target.role === "admin" && (await AdminUser.countDocuments({ role: "admin" })) <= 1) {
    return { ok: false, error: "That's the last admin. Make someone else admin first." };
  }
  await AdminUser.deleteOne({ _id: id });
  await audit(g.admin, "removed admin", target.email, target.role);
  return { ok: true };
}

/** Forgotten or leaked password: signs them out everywhere; they choose a new one at next sign-in (code-confirmed). */
export async function resetAdminPassword(id: string): Promise<ActionResult> {
  const g = await guard("admins");
  if (!g.ok) return g;
  if (!isId(id)) return { ok: false, error: "Admin not found." };
  await connect();
  const target = await AdminUser.findOneAndUpdate(
    { _id: id },
    { $set: { passwordHash: null, passwordSetAt: null }, $inc: { sessionVersion: 1 } },
  ).select("email");
  if (!target) return { ok: false, error: "Admin not found." };
  await audit(g.admin, "reset password", target.email);
  return { ok: true };
}
