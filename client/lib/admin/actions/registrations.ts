"use server";

import connect from "@/lib/mongoose";
import Event from "@/lib/models/Events";
import Registration from "@/lib/models/Registrations";
import Team from "@/lib/models/Team";
import User from "@/lib/models/User";
import { guard } from "@/lib/admin/session";
import { audit } from "@/lib/admin/audit";
import type { ActionResult } from "./events";

const isId = (id: unknown): id is string => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);

export interface RegistrationPatch {
  verified?: boolean;
  checkedIn?: boolean;
  foodServedCount?: number;
}

type RegDoc = { _id: unknown; eventId: unknown; participant: unknown; teamId?: unknown; verified: boolean; checkedIn: boolean; foodServedCount?: number };

async function describe(reg: RegDoc) {
  const [user, event] = await Promise.all([
    User.findById(reg.participant).select("fullName username email").lean<{ fullName?: string; username?: string; email?: string }>(),
    Event.findById(reg.eventId).select("eventName").lean<{ eventName: string }>(),
  ]);
  return `${user?.fullName || user?.username || user?.email || "?"} @ ${event?.eventName ?? "?"}`;
}

/**
 * Verify / check in / correct the food count of one registration. Each field
 * is authorised on its own: "verified" (waiving or confirming payment) needs
 * registrations access; check-in and food need check-in access.
 */
export async function updateRegistration(id: string, patch: RegistrationPatch): Promise<ActionResult> {
  const wantsVerify = typeof patch.verified === "boolean";
  const wantsDesk = typeof patch.checkedIn === "boolean" || typeof patch.foodServedCount === "number";
  if (!wantsVerify && !wantsDesk) return { ok: true };
  const gate = wantsDesk ? await guard("checkin", true) : null;
  if (gate && !gate.ok) return gate;
  const reg = wantsVerify ? await guard("registrations", true) : null;
  if (reg && !reg.ok) return reg;
  const admin = (gate ?? reg)!;
  if (!admin.ok) return admin;
  if (!isId(id)) return { ok: false, error: "Registration not found." };

  await connect();
  const doc = await Registration.findById(id).lean<RegDoc>();
  if (!doc) return { ok: false, error: "Registration not found." };

  if (wantsVerify && doc.teamId) {
    const team = await Team.findById(doc.teamId).select("paymentStatus").lean<{ paymentStatus?: string }>();
    if (team?.paymentStatus) return { ok: false, error: "This is a paid team: set the team's payment instead, so all members stay in step." };
  }
  const verified = wantsVerify ? patch.verified! : doc.verified;
  if (patch.checkedIn === true && !verified) return { ok: false, error: "Not verified yet (payment pending?), so they can't be checked in." };

  const $set: Record<string, unknown> = {};
  const $unset: Record<string, 1> = {};
  if (wantsVerify) $set.verified = patch.verified;
  if (typeof patch.checkedIn === "boolean") {
    $set.checkedIn = patch.checkedIn;
    if (patch.checkedIn) {
      $set.checkedInAt = new Date();
      $set.checkedInByEmail = admin.admin.email;
      if (isId(admin.admin.id)) $set.checkedInBy = admin.admin.id;
    } else {
      $unset.checkedInAt = 1;
      $unset.checkedInBy = 1;
      $unset.checkedInByEmail = 1;
    }
  }
  if (typeof patch.foodServedCount === "number") {
    $set.foodServedCount = Math.max(0, Math.min(20, Math.round(patch.foodServedCount)));
  }
  await Registration.updateOne({ _id: id }, { $set, ...(Object.keys($unset).length ? { $unset } : {}) });

  const what = [
    wantsVerify && (patch.verified ? "verified" : "unverified"),
    typeof patch.checkedIn === "boolean" && (patch.checkedIn ? "checked in" : "check-in undone"),
    typeof patch.foodServedCount === "number" && `food ${doc.foodServedCount ?? 0} → ${$set.foodServedCount}`,
  ]
    .filter(Boolean)
    .join(", ");
  await audit(admin.admin, what, await describe(doc));
  return { ok: true };
}

/**
 * A paid team's payment. Marking it completed verifies every member's
 * registration (only once the team meets the event's minimum size); pending
 * or failed un-verifies them.
 */
export async function setTeamPayment(teamId: string, status: "pending" | "completed" | "failed"): Promise<ActionResult> {
  const g = await guard("registrations", true);
  if (!g.ok) return g;
  if (!isId(teamId) || !["pending", "completed", "failed"].includes(status)) return { ok: false, error: "Team not found." };
  await connect();
  const team = await Team.findById(teamId).select("eventId team teamName teamCode paymentStatus").lean<{
    eventId: unknown;
    team: unknown[];
    teamName?: string;
    teamCode: string;
    paymentStatus?: string;
  }>();
  if (!team) return { ok: false, error: "Team not found." };
  const event = await Event.findById(team.eventId).select("eventName isPaidEvent minMembersPerTeam").lean<{ eventName: string; isPaidEvent: boolean; minMembersPerTeam?: number }>();
  if (!event?.isPaidEvent) return { ok: false, error: "That event is free; there's no payment to set." };
  const min = event.minMembersPerTeam ?? 1;
  if (status === "completed" && team.team.length < min) {
    return { ok: false, error: `The team has ${team.team.length} member${team.team.length === 1 ? "" : "s"}; ${event.eventName} needs at least ${min}.` };
  }
  await Team.updateOne({ _id: teamId }, { $set: { paymentStatus: status } });
  await Registration.updateMany({ teamId }, { $set: { verified: status === "completed" } });
  await audit(g.admin, `team payment ${team.paymentStatus ?? "none"} → ${status}`, `${team.teamName || team.teamCode} @ ${event.eventName}`);
  return { ok: true };
}
