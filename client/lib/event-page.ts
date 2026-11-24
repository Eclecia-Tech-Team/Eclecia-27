import { cache } from "react";
import { atlasArt } from "@/constants/events";
import connect from "@/lib/mongoose";
import Event from "@/lib/models/Events";
import EventNotice, { type IEventNotice } from "@/lib/models/EventNotice";
import EventResult, { PLACE_LABEL, type IResultEntry } from "@/lib/models/EventResult";
import Registration from "@/lib/models/Registrations";
import Team from "@/lib/models/Team";
import User from "@/lib/models/User";
import { eventLookup, getAtlasCategories } from "@/lib/events";
import { registrationLive } from "@/lib/registration";
import type { IEvent } from "@/types/interface";

/** Everything the event page renders, as plain serialisable data. */
export interface EventPageData {
  event: {
    id: string;
    slug: string;
    name: string;
    kind: string;
    description: string;
    date: string;
    time: string;
    duration: string;
    venue: string;
    rules: string[];
    clubs: string[];
    pocs: { name: string; mobile: string }[];
    isTeamEvent: boolean;
    minMembers: number;
    maxMembers: number;
    isActive: boolean;
    isPaidEvent: boolean;
    fees: number;
    prizePool: string;
    doc: string;
    art: string;
  };
  category: { id: string; name: string; kind: string; line: string } | null;
  siblings: { slug: string; name: string; kind: string; art: string }[];
  notices: {
    id: string;
    title: string;
    body: string;
    tone: IEventNotice["tone"];
    pinned: boolean;
    festWide: boolean;
    postedAt: string;
  }[];
  /** Published podium, in place order; null until results are out. */
  results: { place: string; teamName: string; names: string[]; note: string }[] | null;
  viewer: {
    signedIn: boolean;
    profileComplete: boolean;
    registration: { id: string; code: string; verified: boolean; isInTeam: boolean } | null;
    team: {
      id: string;
      code: string;
      name: string;
      isLeader: boolean;
      paymentStatus: string | null;
      members: { id: string; name: string; isLeader: boolean; isYou: boolean }[];
    } | null;
  };
}

type EventRecord = IEvent & { _id: { toString(): string } };

/** Public event data, cached per request (metadata and page share it). */
export const getEventRecord = cache(async (id: string) => {
  await connect();
  return Event.findOne(eventLookup(id))
    .select("-registrations")
    .lean<EventRecord | null>();
});

export async function getEventPage(id: string, userId?: string): Promise<EventPageData | null> {
  const record = await getEventRecord(id);
  if (!record) return null;

  const now = new Date();
  const [categories, noticeDocs, viewer, result] = await Promise.all([
    getAtlasCategories(),
    EventNotice.find({
      $and: [
        { $or: [{ eventId: record._id }, { eventId: null }] },
        { $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }] },
      ],
    })
      .sort({ pinned: -1, createdAt: -1 })
      .limit(30)
      .lean<(IEventNotice & { _id: { toString(): string } })[]>(),
    userId ? loadViewer(record, userId) : null,
    EventResult.findOne({ eventId: record._id, isPublished: true }).select("entries").lean<{ entries: IResultEntry[] } | null>(),
  ]);

  const category = categories.find((c) => c.name === record.category) ?? null;
  const slug = record.slug;

  return {
    event: {
      id: record._id.toString(),
      slug,
      name: record.eventName,
      kind: record.kind ?? "",
      description: record.description,
      date: record.date,
      time: record.time,
      duration: record.duration,
      venue: record.venue,
      rules: record.rules ?? [],
      clubs: record.clubs ?? [],
      pocs: (record.pocs ?? []).map((p) => ({ name: p.name, mobile: p.mobile })),
      isTeamEvent: record.isTeamEvent,
      minMembers: record.minMembersPerTeam ?? 1,
      maxMembers: record.maxMembersPerTeam ?? 1,
      // Closed everywhere until the site-wide switch is on.
      isActive: record.isActive && registrationLive(),
      isPaidEvent: record.isPaidEvent,
      fees: record.fees ?? 0,
      prizePool: record.prizePool ?? "TBD",
      doc: record.doc ?? "",
      art: category ? atlasArt.event(category.id, slug, record.banner || undefined) : record.banner || "",
    },
    category: category ? { id: category.id, name: category.name, kind: category.kind, line: category.line } : null,
    siblings: category
      ? category.events
          .filter((e) => e.id !== slug)
          .map((e) => ({ slug: e.id, name: e.name, kind: e.kind, art: atlasArt.event(category.id, e.id, e.image) }))
      : [],
    notices: noticeDocs.map((n) => ({
      id: n._id.toString(),
      title: n.title,
      body: n.body,
      tone: n.tone,
      pinned: n.pinned,
      festWide: !n.eventId,
      postedAt: new Date(n.createdAt).toISOString(),
    })),
    results: result?.entries.length
      ? result.entries.map((e) => ({
          place: PLACE_LABEL[e.place] ?? e.place,
          teamName: e.teamName ?? "",
          names: e.names ?? [],
          note: e.note ?? "",
        }))
      : null,
    viewer: viewer ?? { signedIn: false, profileComplete: false, registration: null, team: null },
  };
}

type Person = { _id: { toString(): string }; username?: string; fullName?: string };

async function loadViewer(record: EventRecord, userId: string): Promise<EventPageData["viewer"]> {
  const [user, registration] = await Promise.all([
    User.findById(userId).select("isProfileComplete").lean<{ isProfileComplete?: boolean } | null>(),
    Registration.findOne({ eventId: record._id, participant: userId })
      .select("_id registrationCode verified isInTeam teamId")
      .lean<{ _id: { toString(): string }; registrationCode?: string; verified: boolean; isInTeam: boolean; teamId?: unknown } | null>(),
  ]);
  if (!user) return { signedIn: false, profileComplete: false, registration: null, team: null };

  let team: EventPageData["viewer"]["team"] = null;
  if (registration?.teamId) {
    const doc = await Team.findById(registration.teamId)
      .populate("team", "username fullName")
      .lean<{ _id: { toString(): string }; teamCode: string; teamName?: string; teamLeader: { toString(): string }; team: Person[]; paymentStatus?: string } | null>();
    if (doc) {
      const leaderId = doc.teamLeader.toString();
      team = {
        id: doc._id.toString(),
        code: doc.teamCode,
        name: doc.teamName ?? "",
        isLeader: leaderId === userId,
        paymentStatus: doc.paymentStatus ?? null,
        members: doc.team
          .map((m) => ({
            id: m._id.toString(),
            name: m.fullName || m.username || "Member",
            isLeader: m._id.toString() === leaderId,
            isYou: m._id.toString() === userId,
          }))
          .sort((a, b) => Number(b.isLeader) - Number(a.isLeader)),
      };
    }
  }

  return {
    signedIn: true,
    profileComplete: Boolean(user.isProfileComplete),
    registration: registration
      ? {
          id: registration._id.toString(),
          code: registration.registrationCode ?? "",
          verified: registration.verified,
          isInTeam: registration.isInTeam,
        }
      : null,
    team,
  };
}
