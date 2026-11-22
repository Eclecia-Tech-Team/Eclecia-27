"use server";

import mongoose from "mongoose";
import connect from "@/lib/mongoose";
import Event from "@/lib/models/Events";
import Registration from "@/lib/models/Registrations";
import Team from "@/lib/models/Team";
import User from "@/lib/models/User";
import { parseAndVerifyProfileQrPayload } from "@/lib/qr-token";
import { guard } from "@/lib/admin/session";
import { audit } from "@/lib/admin/audit";

/** Two packets for the same person need at least this long between them. */
const FOOD_GAP_MS = 2 * 60 * 60 * 1000;
const isId = (id: unknown): id is string => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);

export interface CheckInResult {
  status: "success" | "warning" | "denied" | "error";
  message: string;
  name?: string;
  email?: string;
  team?: string;
  /** Registration id, for the desk's Undo button. */
  regId?: string;
  /** Extra line for the volunteer (e.g. team below minimum size). */
  note?: string;
}

const timeIST = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(d));

/**
 * Scan at the gate: "entry" checks the pass holder in for the event, "food"
 * issues a packet (only after entry, within the event's limit and gap). Every
 * write is a conditional update, so two desks scanning the same pass at once
 * can't both admit or both hand out food.
 */
export async function checkIn(input: { eventId: string; qr: string; action: "entry" | "food" }): Promise<CheckInResult> {
  const g = await guard("checkin", true);
  if (!g.ok) return { status: "error", message: g.error };
  if (!isId(input.eventId) || (input.action !== "entry" && input.action !== "food")) {
    return { status: "error", message: "Pick an event first." };
  }

  const userId = parseAndVerifyProfileQrPayload(String(input.qr ?? "").trim());
  if (!userId || !isId(userId)) return { status: "denied", message: "Not an Eclecia pass. Ask them to open Profile → Pass QR." };

  await connect();
  const [event, user, reg] = await Promise.all([
    Event.findById(input.eventId).select("eventName isTeamEvent minMembersPerTeam isFoodProvided maxFoodServingsPerParticipant").lean<{
      eventName: string;
      isTeamEvent: boolean;
      minMembersPerTeam?: number;
      isFoodProvided?: boolean;
      maxFoodServingsPerParticipant?: number;
    }>(),
    User.findById(userId).select("fullName username email").lean<{ fullName?: string; username?: string; email?: string }>(),
    Registration.findOne({ eventId: input.eventId, participant: userId })
      .select("_id teamId verified checkedIn checkedInAt foodServedCount lastFoodServedAt")
      .lean<{ _id: mongoose.Types.ObjectId; teamId?: mongoose.Types.ObjectId; verified: boolean; checkedIn: boolean; checkedInAt?: Date; foodServedCount?: number; lastFoodServedAt?: Date }>(),
  ]);
  if (!event) return { status: "error", message: "Event not found." };
  const name = user?.fullName || user?.username || "Participant";
  const team = reg?.teamId ? await Team.findById(reg.teamId).select("teamName teamCode team").lean<{ teamName?: string; teamCode: string; team: unknown[] }>() : null;
  const min = event.minMembersPerTeam ?? 1;
  const who = {
    name,
    email: user?.email,
    team: team ? team.teamName || team.teamCode : undefined,
    regId: reg?._id.toString(),
    note: team && event.isTeamEvent && team.team.length < min ? `Team has ${team.team.length} of the ${min} members needed.` : undefined,
  };

  if (!reg) return { ...who, status: "denied", message: `${name} isn't registered for ${event.eventName}.` };
  if (!reg.verified) return { ...who, status: "denied", message: `${name}'s registration isn't verified yet (payment pending?).` };

  if (input.action === "entry") {
    const by = g.admin;
    const done = await Registration.findOneAndUpdate(
      { _id: reg._id, checkedIn: { $ne: true } },
      { $set: { checkedIn: true, checkedInAt: new Date(), checkedInByEmail: by.email, ...(isId(by.id) ? { checkedInBy: by.id } : {}) } },
    );
    if (!done) {
      const at = reg.checkedInAt ? ` at ${timeIST(reg.checkedInAt)}` : "";
      return { ...who, status: "warning", message: `${name} already checked in${at}.` };
    }
    return { ...who, status: "success", message: `${name} is in.` };
  }

  if (!event.isFoodProvided) return { ...who, status: "error", message: `${event.eventName} doesn't serve food.` };
  if (!reg.checkedIn) return { ...who, status: "denied", message: `Check ${name} in first.` };
  const max = Math.max(1, event.maxFoodServingsPerParticipant ?? 1);
  const now = new Date();
  const issued = await Registration.findOneAndUpdate(
    {
      _id: reg._id,
      checkedIn: true,
      foodServedCount: { $lt: max },
      $or: [{ lastFoodServedAt: { $exists: false } }, { lastFoodServedAt: null }, { lastFoodServedAt: { $lte: new Date(now.getTime() - FOOD_GAP_MS) } }],
    },
    { $inc: { foodServedCount: 1 }, $set: { lastFoodServedAt: now } },
    { new: true },
  ).lean<{ foodServedCount: number }>();
  if (issued) return { ...who, status: "success", message: `Packet ${issued.foodServedCount} of ${max} issued.` };

  // Refused: re-read to say why.
  const fresh = await Registration.findById(reg._id).select("foodServedCount lastFoodServedAt").lean<{ foodServedCount?: number; lastFoodServedAt?: Date }>();
  const served = fresh?.foodServedCount ?? 0;
  if (served >= max) return { ...who, status: "denied", message: `Already had ${served} of ${max} packet${max === 1 ? "" : "s"}.` };
  const last = fresh?.lastFoodServedAt;
  const wait = last ? FOOD_GAP_MS - (Date.now() - new Date(last).getTime()) : 0;
  return { ...who, status: "denied", message: last ? `Last packet at ${timeIST(last)}. Next one in ${Math.max(1, Math.ceil(wait / 60000))} min.` : "Couldn't issue food. Scan again." };
}

export interface DeskMatch {
  id: string;
  name: string;
  email: string;
  phone: string;
  team: string;
  verified: boolean;
  checkedIn: boolean;
}

/** For people without their phone: find this event's registrations by name, email or phone. */
export async function findAtDesk(input: { eventId: string; q: string }): Promise<{ ok: true; matches: DeskMatch[] } | { ok: false; error: string }> {
  const g = await guard("checkin");
  if (!g.ok) return g;
  const q = String(input.q ?? "").trim();
  if (!isId(input.eventId) || q.length < 2) return { ok: true, matches: [] };
  await connect();
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  // Search within this event's registrants (not all users), so common names never crowd them out.
  const rows = await Registration.aggregate<{
    _id: mongoose.Types.ObjectId;
    verified: boolean;
    checkedIn: boolean;
    user: { fullName?: string; username: string; email: string; phoneNumber?: string };
    team?: { teamName?: string };
  }>([
    { $match: { eventId: new mongoose.Types.ObjectId(input.eventId) } },
    { $lookup: { from: "users", localField: "participant", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    { $match: { $or: [{ "user.fullName": re }, { "user.username": re }, { "user.email": re }, { "user.phoneNumber": re }] } },
    { $limit: 10 },
    { $lookup: { from: "teams", localField: "teamId", foreignField: "_id", as: "team" } },
    { $set: { team: { $first: "$team" } } },
  ]);
  return {
    ok: true,
    matches: rows.map((r) => ({
      id: r._id.toString(),
      name: r.user.fullName || r.user.username,
      email: r.user.email,
      phone: r.user.phoneNumber ?? "",
      team: r.team?.teamName ?? "",
      verified: r.verified,
      checkedIn: r.checkedIn,
    })),
  };
}

/** Headcount for the desk: checked in out of verified. */
export async function deskCount(eventId: string): Promise<{ ok: true; checkedIn: number; verified: number } | { ok: false; error: string }> {
  const g = await guard("checkin");
  if (!g.ok) return g;
  if (!isId(eventId)) return { ok: true, checkedIn: 0, verified: 0 };
  await connect();
  const [checkedIn, verified] = await Promise.all([
    Registration.countDocuments({ eventId, checkedIn: true }),
    Registration.countDocuments({ eventId, verified: true }),
  ]);
  return { ok: true, checkedIn, verified };
}

/** Undo the last scan at the desk (wrong person, wrong button). Logged. */
export async function undoScan(input: { regId: string; action: "entry" | "food" }): Promise<{ ok: true } | { ok: false; error: string }> {
  const g = await guard("checkin", true);
  if (!g.ok) return g;
  if (!isId(input.regId)) return { ok: false, error: "Nothing to undo." };
  await connect();
  const res =
    input.action === "food"
      ? await Registration.updateOne({ _id: input.regId, foodServedCount: { $gt: 0 } }, { $inc: { foodServedCount: -1 }, $unset: { lastFoodServedAt: 1 } })
      : await Registration.updateOne(
          { _id: input.regId, checkedIn: true, foodServedCount: { $lte: 0 } },
          { $set: { checkedIn: false }, $unset: { checkedInAt: 1, checkedInBy: 1, checkedInByEmail: 1 } },
        );
  if (!res.modifiedCount) return { ok: false, error: input.action === "food" ? "No packet to take back." : "Can't undo: food was already issued, fix it from Registrations." };
  await audit(g.admin, input.action === "food" ? "desk: food packet undone" : "desk: check-in undone", input.regId);
  return { ok: true };
}
