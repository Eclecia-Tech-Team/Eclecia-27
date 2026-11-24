import mongoose from "mongoose";
import connect from "@/lib/mongoose";
import Event from "@/lib/models/Events";
import EventNotice from "@/lib/models/EventNotice";
import EventResult, { type IResultEntry } from "@/lib/models/EventResult";
import Registration from "@/lib/models/Registrations";
import Team from "@/lib/models/Team";
import User from "@/lib/models/User";
import AdminUser from "@/lib/models/AdminUser";
import AdminAction from "@/lib/models/AdminAction";
import type { EventInput } from "@/lib/admin/event-input";
import type { AdminArea, AdminRole } from "@/lib/admin/access";

const oid = (id: string) => new mongoose.Types.ObjectId(id);
const isId = (id: unknown): id is string => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : null);

export const PAGE_SIZE = 50;

/* ---------- Overview ---------- */

export async function getOverview() {
  await connect();
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const [users, complete, regs, verified, checkedIn, teams, events, open, byEvent, signups, regDays] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isProfileComplete: true }),
    Registration.countDocuments(),
    Registration.countDocuments({ verified: true }),
    Registration.countDocuments({ checkedIn: true }),
    Team.countDocuments(),
    Event.countDocuments(),
    Event.countDocuments({ isActive: true }),
    Registration.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $group: { _id: "$eventId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    User.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } }, count: { $sum: 1 } } },
    ]),
    Registration.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } }, count: { $sum: 1 } } },
    ]),
  ]);

  const names = await Event.find().select("eventName category").lean<{ _id: mongoose.Types.ObjectId; eventName: string; category: string }[]>();
  const nameById = new Map(names.map((e) => [e._id.toString(), e]));
  const counted = new Set(byEvent.map((r) => r._id?.toString()));

  // Last 14 days, oldest first, zero-filled.
  const day = (offset: number) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(Date.now() - offset * 86400000));
  const su = new Map(signups.map((d) => [d._id, d.count]));
  const rd = new Map(regDays.map((d) => [d._id, d.count]));
  const days = Array.from({ length: 14 }, (_, i) => day(13 - i)).map((date) => ({ date, signups: su.get(date) ?? 0, registrations: rd.get(date) ?? 0 }));

  return {
    users,
    complete,
    regs,
    verified,
    checkedIn,
    teams,
    events,
    open,
    days,
    byEvent: [
      ...byEvent
        .filter((r) => nameById.has(r._id?.toString()))
        .map((r) => ({ id: r._id.toString(), name: nameById.get(r._id.toString())!.eventName, count: r.count })),
      ...names.filter((e) => !counted.has(e._id.toString())).map((e) => ({ id: e._id.toString(), name: e.eventName, count: 0 })),
    ],
  };
}

/* ---------- Events ---------- */

export interface EventRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  kind: string;
  isActive: boolean;
  isTeamEvent: boolean;
  isPaidEvent: boolean;
  fees: number;
  registrations: number;
  teams: number;
  rules: number;
}

export async function listEvents(): Promise<EventRow[]> {
  await connect();
  const [events, regCounts, teamCounts] = await Promise.all([
    Event.find()
      .select("slug eventName category kind isActive isTeamEvent isPaidEvent fees rules")
      .sort({ category: 1, eventName: 1 })
      .lean<
        {
          _id: mongoose.Types.ObjectId;
          slug: string;
          eventName: string;
          category: string;
          kind?: string;
          isActive: boolean;
          isTeamEvent: boolean;
          isPaidEvent: boolean;
          fees?: number;
          rules?: string[];
        }[]
      >(),
    Registration.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([{ $group: { _id: "$eventId", n: { $sum: 1 } } }]),
    Team.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([{ $group: { _id: "$eventId", n: { $sum: 1 } } }]),
  ]);
  const regs = new Map(regCounts.map((r) => [r._id.toString(), r.n]));
  const teams = new Map(teamCounts.map((r) => [r._id.toString(), r.n]));
  return events.map((e) => ({
    id: e._id.toString(),
    slug: e.slug,
    name: e.eventName,
    category: e.category,
    kind: e.kind ?? "",
    isActive: e.isActive,
    isTeamEvent: e.isTeamEvent,
    isPaidEvent: e.isPaidEvent,
    fees: e.fees ?? 0,
    registrations: regs.get(e._id.toString()) ?? 0,
    teams: teams.get(e._id.toString()) ?? 0,
    rules: e.rules?.length ?? 0,
  }));
}

/** Light list for pickers (filters, notices, check-in, mail). */
export async function eventOptions() {
  await connect();
  const events = await Event.find()
    .select("eventName category isTeamEvent isFoodProvided")
    .sort({ eventName: 1 })
    .lean<{ _id: mongoose.Types.ObjectId; eventName: string; category: string; isTeamEvent: boolean; isFoodProvided?: boolean }[]>();
  return events.map((e) => ({
    id: e._id.toString(),
    name: e.eventName,
    category: e.category,
    isTeamEvent: e.isTeamEvent,
    isFoodProvided: Boolean(e.isFoodProvided),
  }));
}
export type EventOption = Awaited<ReturnType<typeof eventOptions>>[number];

export async function getEventForEdit(id: string): Promise<(EventInput & { id: string; registrations: number }) | null> {
  if (!isId(id)) return null;
  await connect();
  const e = await Event.findById(id).lean<Record<string, unknown> & { _id: mongoose.Types.ObjectId }>();
  if (!e) return null;
  const str = (k: string) => (typeof e[k] === "string" ? (e[k] as string) : "");
  const num = (k: string, d: number) => (typeof e[k] === "number" ? (e[k] as number) : d);
  return {
    id: e._id.toString(),
    registrations: await Registration.countDocuments({ eventId: e._id }),
    eventName: str("eventName"),
    slug: str("slug"),
    category: e.category as EventInput["category"],
    kind: str("kind"),
    description: str("description"),
    duration: str("duration"),
    venue: str("venue"),
    scheduleDate: str("scheduleDate"),
    startTime: str("startTime"),
    endTime: str("endTime"),
    banner: str("banner"),
    doc: str("doc"),
    rules: (e.rules as string[]) ?? [],
    clubs: (e.clubs as string[]) ?? [],
    pocs: ((e.pocs as { name: string; mobile: string }[]) ?? []).map((p) => ({ name: p.name, mobile: p.mobile })),
    isTeamEvent: Boolean(e.isTeamEvent),
    minMembersPerTeam: num("minMembersPerTeam", 1),
    maxMembersPerTeam: num("maxMembersPerTeam", 1),
    teamLimit: typeof e.teamLimit === "number" ? e.teamLimit : null,
    isPaidEvent: Boolean(e.isPaidEvent),
    fees: num("fees", 0),
    prizePool: str("prizePool"),
    isActive: Boolean(e.isActive),
    isFoodProvided: Boolean(e.isFoodProvided),
    maxFoodServingsPerParticipant: num("maxFoodServingsPerParticipant", 1),
  };
}

/* ---------- Notices ---------- */

export interface NoticeRow {
  id: string;
  eventId: string | null;
  eventName: string | null;
  title: string;
  body: string;
  tone: "info" | "update" | "important";
  pinned: boolean;
  expiresOn: string;
  expired: boolean;
  createdAt: string;
}

export async function listNotices(eventId?: string): Promise<NoticeRow[]> {
  await connect();
  const filter = eventId === "all" ? { eventId: null } : isId(eventId) ? { eventId: oid(eventId) } : {};
  const notices = await EventNotice.find(filter)
    .populate("eventId", "eventName")
    .sort({ pinned: -1, createdAt: -1 })
    .limit(300)
    .lean<
      {
        _id: mongoose.Types.ObjectId;
        eventId: { _id: mongoose.Types.ObjectId; eventName: string } | null;
        title: string;
        body: string;
        tone: NoticeRow["tone"];
        pinned: boolean;
        expiresAt?: Date;
        createdAt: Date;
      }[]
    >();
  return notices.map((n) => ({
    id: n._id.toString(),
    eventId: n.eventId?._id.toString() ?? null,
    eventName: n.eventId?.eventName ?? null,
    title: n.title,
    body: n.body,
    tone: n.tone,
    pinned: n.pinned,
    expiresOn: n.expiresAt ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(n.expiresAt) : "",
    expired: Boolean(n.expiresAt && n.expiresAt.getTime() < Date.now()),
    createdAt: n.createdAt.toISOString(),
  }));
}

/* ---------- Registrations ---------- */

export interface RegistrationFilter {
  eventId?: string;
  status?: string;
  q?: string;
  page?: number;
}

export interface RegistrationRow {
  id: string;
  eventId: string;
  eventName: string;
  participant: { id: string; name: string; username: string; email: string; phone: string; college: string; stream: string };
  team: { id: string; name: string; code: string; payment: string | null; size: number; min: number; isLeader: boolean } | null;
  verified: boolean;
  checkedIn: boolean;
  checkedInAt: string | null;
  food: number;
  createdAt: string;
}

async function registrationQuery(f: RegistrationFilter) {
  const query: Record<string, unknown> = {};
  if (isId(f.eventId)) query.eventId = oid(f.eventId);
  if (f.status === "verified") query.verified = true;
  if (f.status === "unverified") query.verified = false;
  if (f.status === "checked-in") query.checkedIn = true;
  if (f.status === "not-checked-in") query.checkedIn = false;
  const q = f.q?.trim();
  if (q) {
    const re = new RegExp(escapeRe(q), "i");
    // Within one event, search only its registrants so common names never get cut off.
    const scope = isId(f.eventId)
      ? { _id: { $in: await Registration.distinct("participant", { eventId: oid(f.eventId) }) } }
      : {};
    const [users, teams] = await Promise.all([
      User.find({ ...scope, $or: [{ email: re }, { username: re }, { fullName: re }, { phoneNumber: re }] }).select("_id").limit(5000).lean<{ _id: mongoose.Types.ObjectId }[]>(),
      Team.find({ ...(isId(f.eventId) ? { eventId: oid(f.eventId) } : {}), $or: [{ teamCode: re }, { teamName: re }] }).select("_id").limit(2000).lean<{ _id: mongoose.Types.ObjectId }[]>(),
    ]);
    query.$or = [{ participant: { $in: users.map((u) => u._id) } }, { teamId: { $in: teams.map((t) => t._id) } }];
  }
  return query;
}

type PopulatedReg = {
  _id: mongoose.Types.ObjectId;
  eventId: { _id: mongoose.Types.ObjectId; eventName: string; minMembersPerTeam?: number } | null;
  participant: { _id: mongoose.Types.ObjectId; fullName?: string; username: string; email: string; phoneNumber?: string; college?: string; stream?: string } | null;
  teamId: { _id: mongoose.Types.ObjectId; teamName?: string; teamCode: string; paymentStatus?: string; teamLeader: mongoose.Types.ObjectId; team: mongoose.Types.ObjectId[] } | null;
  verified: boolean;
  checkedIn: boolean;
  checkedInAt?: Date;
  foodServedCount?: number;
  createdAt: Date;
};

function toRow(r: PopulatedReg): RegistrationRow {
  const p = r.participant;
  return {
    id: r._id.toString(),
    eventId: r.eventId?._id.toString() ?? "",
    eventName: r.eventId?.eventName ?? "(deleted event)",
    participant: {
      id: p?._id.toString() ?? "",
      name: p?.fullName || p?.username || "(deleted user)",
      username: p?.username ?? "",
      email: p?.email ?? "",
      phone: p?.phoneNumber ?? "",
      college: p?.college ?? "",
      stream: p?.stream ?? "",
    },
    team: r.teamId
      ? {
          id: r.teamId._id.toString(),
          name: r.teamId.teamName ?? "",
          code: r.teamId.teamCode,
          payment: r.teamId.paymentStatus ?? null,
          size: r.teamId.team?.length ?? 0,
          min: r.eventId?.minMembersPerTeam ?? 1,
          isLeader: Boolean(p && r.teamId.teamLeader?.toString() === p._id.toString()),
        }
      : null,
    verified: r.verified,
    checkedIn: r.checkedIn,
    checkedInAt: iso(r.checkedInAt),
    food: r.foodServedCount ?? 0,
    createdAt: r.createdAt.toISOString(),
  };
}

const populateReg = <T,>(q: T) =>
  (q as unknown as mongoose.Query<unknown, unknown>)
    .populate("eventId", "eventName minMembersPerTeam")
    .populate("participant", "fullName username email phoneNumber college stream")
    .populate("teamId", "teamName teamCode paymentStatus teamLeader team");

export async function listRegistrations(f: RegistrationFilter) {
  await connect();
  const query = await registrationQuery(f);
  const page = Math.max(1, f.page ?? 1);
  const [total, rows] = await Promise.all([
    Registration.countDocuments(query),
    populateReg(Registration.find(query).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE)).lean<PopulatedReg[]>(),
  ]);
  return { total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), rows: rows.map(toRow) };
}

/** Everything matching the filter, for CSV export. */
export async function exportRegistrations(f: RegistrationFilter) {
  await connect();
  const query = await registrationQuery(f);
  const rows = await populateReg(Registration.find(query).sort({ eventId: 1, teamId: 1, createdAt: 1 }).limit(20000)).lean<PopulatedReg[]>();
  return rows.map(toRow);
}

/* ---------- Participants ---------- */

export interface ParticipantRow {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  college: string;
  stream: string;
  provider: string;
  verified: boolean;
  isProfileComplete: boolean;
  events: number;
  createdAt: string;
}

export async function listParticipants(f: { q?: string; filter?: string; page?: number }) {
  await connect();
  const query: Record<string, unknown> = {};
  const q = f.q?.trim();
  if (q) {
    const re = new RegExp(escapeRe(q), "i");
    query.$or = [{ email: re }, { username: re }, { fullName: re }, { phoneNumber: re }, { college: re }];
  }
  if (f.filter === "complete") query.isProfileComplete = true;
  if (f.filter === "incomplete") query.isProfileComplete = { $ne: true };
  const page = Math.max(1, f.page ?? 1);
  const [total, users] = await Promise.all([
    User.countDocuments(query),
    User.find(query)
      .select("username email fullName phoneNumber college stream provider verified isProfileComplete createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean<(Omit<ParticipantRow, "id" | "events" | "createdAt"> & { _id: mongoose.Types.ObjectId; createdAt: Date })[]>(),
  ]);
  const counts = await Registration.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
    { $match: { participant: { $in: users.map((u) => u._id) } } },
    { $group: { _id: "$participant", n: { $sum: 1 } } },
  ]);
  const n = new Map(counts.map((c) => [c._id.toString(), c.n]));
  return {
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    rows: users.map((u) => ({
      id: u._id.toString(),
      username: u.username,
      email: u.email,
      fullName: u.fullName ?? "",
      phoneNumber: u.phoneNumber ?? "",
      college: u.college ?? "",
      stream: u.stream ?? "",
      provider: u.provider ?? "credentials",
      verified: Boolean(u.verified),
      isProfileComplete: Boolean(u.isProfileComplete),
      events: n.get(u._id.toString()) ?? 0,
      createdAt: u.createdAt.toISOString(),
    })),
  };
}

/* ---------- Results ---------- */

export async function listResults() {
  await connect();
  const [events, results] = await Promise.all([
    Event.find().select("eventName category isTeamEvent").sort({ category: 1, eventName: 1 }).lean<{ _id: mongoose.Types.ObjectId; eventName: string; category: string; isTeamEvent: boolean }[]>(),
    EventResult.find().select("eventId isPublished entries updatedAt").lean<{ eventId: mongoose.Types.ObjectId; isPublished: boolean; entries: IResultEntry[]; updatedAt: Date }[]>(),
  ]);
  const byEvent = new Map(results.map((r) => [r.eventId.toString(), r]));
  return events.map((e) => {
    const r = byEvent.get(e._id.toString());
    return {
      id: e._id.toString(),
      name: e.eventName,
      category: e.category,
      isTeamEvent: e.isTeamEvent,
      state: !r ? ("none" as const) : r.isPublished ? ("published" as const) : ("draft" as const),
      winners: r?.entries.length ?? 0,
    };
  });
}

export async function getResultEditor(eventId: string) {
  if (!isId(eventId)) return null;
  await connect();
  const event = await Event.findById(eventId).select("eventName slug isTeamEvent").lean<{ _id: mongoose.Types.ObjectId; eventName: string; slug: string; isTeamEvent: boolean }>();
  if (!event) return null;
  const [result, teams, solos] = await Promise.all([
    EventResult.findOne({ eventId }).lean<{ entries: IResultEntry[]; isPublished: boolean }>(),
    event.isTeamEvent
      ? Team.find({ eventId }).populate("team", "fullName username").sort({ teamName: 1 }).lean<{ _id: mongoose.Types.ObjectId; teamName?: string; teamCode: string; team: { fullName?: string; username: string }[] }[]>()
      : [],
    event.isTeamEvent
      ? []
      : Registration.find({ eventId }).populate("participant", "fullName username").lean<{ participant: { fullName?: string; username: string } | null }[]>(),
  ]);
  return {
    event: { id: event._id.toString(), name: event.eventName, slug: event.slug, isTeamEvent: event.isTeamEvent },
    isPublished: result?.isPublished ?? false,
    entries: (result?.entries ?? []).map((e) => ({
      place: e.place,
      teamName: e.teamName ?? "",
      teamId: e.teamId?.toString() ?? null,
      names: e.names ?? [],
      note: e.note ?? "",
    })),
    teams: teams.map((t) => ({
      id: t._id.toString(),
      name: t.teamName || t.teamCode,
      code: t.teamCode,
      members: (t.team ?? []).map((m) => m.fullName || m.username),
    })),
    people: solos.filter((r) => r.participant).map((r) => r.participant!.fullName || r.participant!.username).sort(),
  };
}

/* ---------- Admins ---------- */

export async function listAdmins() {
  await connect();
  const admins = await AdminUser.find()
    .select("email role areas invitedBy passwordSetAt lastLoginAt createdAt")
    .sort({ createdAt: 1 })
    .lean<{ _id: mongoose.Types.ObjectId; email: string; role: AdminRole; areas?: AdminArea[]; invitedBy: string; passwordSetAt?: Date | null; lastLoginAt?: Date | null }[]>();
  return admins.map((a) => ({
    id: a._id.toString(),
    email: a.email,
    role: a.role,
    areas: a.areas ?? [],
    invitedBy: a.invitedBy,
    joined: Boolean(a.passwordSetAt),
    lastLoginAt: iso(a.lastLoginAt),
  }));
}
export type AdminRow = Awaited<ReturnType<typeof listAdmins>>[number];

/* ---------- Activity ---------- */

export async function listActivity(limit = 100) {
  await connect();
  const rows = await AdminAction.find().sort({ createdAt: -1 }).limit(limit).lean<{ _id: mongoose.Types.ObjectId; by: string; action: string; target: string; detail: string; createdAt: Date }[]>();
  return rows.map((r) => ({ id: r._id.toString(), by: r.by, action: r.action, target: r.target, detail: r.detail, at: r.createdAt.toISOString() }));
}

/**
 * Venue names already typed on events, for the editor's suggestions while
 * there is no fixed venue list. Spellings that differ only in case or spacing
 * count as one; the most used spelling wins.
 */
export async function venueSuggestions(): Promise<string[]> {
  await connect();
  const rows = await Event.aggregate<{ _id: string; n: number }>([
    { $match: { venue: { $exists: true, $nin: ["", "TBA"] } } },
    { $group: { _id: { $trim: { input: "$venue" } }, n: { $sum: 1 } } },
  ]);
  const groups = new Map<string, { name: string; top: number }>();
  for (const r of rows) {
    if (!r._id || r._id.toUpperCase() === "TBA") continue;
    const key = r._id.toLowerCase().replace(/\s+/g, " ");
    const seen = groups.get(key);
    if (!seen || r.n > seen.top) groups.set(key, { name: r._id, top: r.n });
  }
  return [...groups.values()].map((v) => v.name).sort((a, b) => a.localeCompare(b));
}
