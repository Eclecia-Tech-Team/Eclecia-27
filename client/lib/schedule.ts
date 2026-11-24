import { connection } from "next/server";
import { ATLAS_CATEGORIES, atlasArt } from "@/constants/events";
import { FEST_DAYS, VENUES, isFestDate, minutesOf, TIME_RE, type FestDay } from "@/constants/schedule";
import { getAtlasCategories } from "@/lib/events";
import Event from "@/lib/models/Events";
import connect from "@/lib/mongoose";
import type { IEvent } from "@/types/interface";

/** One event as the schedule shows it. Plain data, safe to hand to the client. */
export interface ScheduleEvent {
  slug: string;
  name: string;
  kind: string;
  world: string;
  /** Small artwork for medallions. */
  art: string;
  /** Key into ScheduleData.venues; null = venue to be announced. */
  venue: string | null;
  /** Minutes after midnight, fest time. */
  start: number | null;
  end: number | null;
}

export interface ScheduleDay extends Pick<FestDay, "date" | "roman" | "day" | "weekday" | "short"> {
  /** Events with a start time, in time order. */
  timed: ScheduleEvent[];
  /** On this day, time not fixed yet. */
  untimed: ScheduleEvent[];
}

export interface ScheduleWorld {
  id: string;
  name: string;
  kind: string;
  art: string;
  events: { slug: string; name: string; art: string }[];
}

export interface ScheduleData {
  days: ScheduleDay[];
  /** No day yet. */
  unscheduled: ScheduleEvent[];
  /** Every venue in use, in display order: the fixed list first, then any typed by hand. */
  venues: { key: string; name: string }[];
  /** Whether anything has a day yet. Before that, the page shows the line-up instead. */
  announced: boolean;
  totalEvents: number;
  /** For the "still being written" state. */
  worlds: ScheduleWorld[];
  /** When this was read (ms); the page's clock starts here. */
  readAt: number;
}

export type EventRecord = Pick<IEvent, "slug" | "eventName" | "category" | "kind" | "banner" | "scheduleDate" | "startTime" | "endTime" | "venueId" | "venue">;
type AtlasWorld = Awaited<ReturnType<typeof getAtlasCategories>>[number];

const THUMBS = "/assets/opt/events/mobile/thumbnails/events";

/** 160px artwork for bundled events (the full pieces are 1000px); admin-added events fall back to their banner. */
function eventThumb(worldId: string | undefined, slug: string, banner?: string | null) {
  const bundled = worldId && ATLAS_CATEGORIES.some((c) => c.id === worldId && c.events.some((e) => e.id === slug));
  if (bundled) return `${THUMBS}/${worldId}/${slug}/artwork.webp`;
  return banner || atlasArt.shared("planet-base");
}

const worldIdOf = (name: string) => ATLAS_CATEGORIES.find((c) => c.name === name)?.id;
const isTba = (v: string | null | undefined) => !v || !v.trim() || v.trim().toUpperCase() === "TBA";
const typedVenueKey = (name: string) => `other:${name.trim().toLowerCase().replace(/\s+/g, " ")}`;

export async function getSchedule(): Promise<ScheduleData> {
  // Read per request: a prerender would need the database at build time.
  await connection();
  await connect();
  const [records, atlas] = await Promise.all([
    Event.find()
      .select("slug eventName category kind banner scheduleDate startTime endTime venueId venue")
      .lean<EventRecord[]>(),
    getAtlasCategories(),
  ]);
  return buildSchedule(records, atlas, Date.now());
}

/** Sorts events into days, buckets and venue order. Pure, so it can be tested without a database. */
export function buildSchedule(records: EventRecord[], atlas: AtlasWorld[], readAt: number): ScheduleData {
  // Venues: listed ones keep their fixed order; typed-in ones follow, busiest first.
  const typed = new Map<string, { name: string; count: number }>();
  const venueOf = (r: EventRecord): string | null => {
    if (r.venueId && VENUES.some((v) => v.id === r.venueId)) return r.venueId;
    if (isTba(r.venue)) return null;
    const key = typedVenueKey(r.venue);
    const seen = typed.get(key);
    typed.set(key, { name: seen?.name ?? r.venue.trim(), count: (seen?.count ?? 0) + 1 });
    return key;
  };

  const days: ScheduleDay[] = FEST_DAYS.map((d) => ({ date: d.date, roman: d.roman, day: d.day, weekday: d.weekday, short: d.short, timed: [], untimed: [] }));
  const unscheduled: ScheduleEvent[] = [];
  const used = new Set<string>();

  for (const r of records) {
    const worldId = worldIdOf(r.category);
    const start = r.startTime && TIME_RE.test(r.startTime) ? minutesOf(r.startTime) : null;
    const endRaw = r.endTime && TIME_RE.test(r.endTime) ? minutesOf(r.endTime) : null;
    const venue = venueOf(r);
    if (venue) used.add(venue);
    const event: ScheduleEvent = {
      slug: r.slug,
      name: r.eventName,
      kind: r.kind ?? "",
      world: r.category,
      art: eventThumb(worldId, r.slug, r.banner),
      venue,
      start,
      end: start !== null && endRaw !== null && endRaw > start ? endRaw : null,
    };
    const day = r.scheduleDate && isFestDate(r.scheduleDate) ? days.find((d) => d.date === r.scheduleDate) : undefined;
    if (!day) unscheduled.push(event);
    else if (start === null) day.untimed.push(event);
    else day.timed.push(event);
  }

  const venues = [
    ...VENUES.filter((v) => used.has(v.id)).map((v) => ({ key: v.id, name: v.name })),
    ...[...typed.entries()]
      .sort((a, b) => b[1].count - a[1].count || a[1].name.localeCompare(b[1].name))
      .map(([key, v]) => ({ key, name: v.name })),
  ];
  const order = new Map(venues.map((v, i) => [v.key, i]));
  const rank = (e: ScheduleEvent) => (e.venue ? (order.get(e.venue) ?? 999) : 1000);
  const byName = (a: ScheduleEvent, b: ScheduleEvent) => a.name.localeCompare(b.name);
  for (const d of days) {
    d.timed.sort((a, b) => a.start! - b.start! || rank(a) - rank(b) || byName(a, b));
    d.untimed.sort((a, b) => rank(a) - rank(b) || byName(a, b));
  }
  unscheduled.sort((a, b) => a.world.localeCompare(b.world) || byName(a, b));

  return {
    days,
    unscheduled,
    venues,
    announced: days.some((d) => d.timed.length + d.untimed.length > 0),
    totalEvents: records.length,
    worlds: atlas
      .filter((w) => w.events.length)
      .map((w) => ({
        id: w.id,
        name: w.name,
        kind: w.kind,
        art: atlasArt.category(w.id),
        events: w.events.map((e) => ({ slug: e.id, name: e.name, art: eventThumb(w.id, e.id, e.image) })),
      })),
    readAt,
  };
}
