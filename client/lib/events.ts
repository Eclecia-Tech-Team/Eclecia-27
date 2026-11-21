import { connection } from "next/server";
import { cache } from "react";
import { ATLAS_CATEGORIES, type AtlasCategory, type AtlasEvent } from "@/constants/events";
import Event from "@/lib/models/Events";
import AtlasCategoryModel from "@/lib/models/AtlasCategory";
import connect from "@/lib/mongoose";
import type { IEvent } from "@/types/interface";

type AtlasEventRecord = Pick<IEvent, "slug" | "eventName" | "category" | "kind" | "description" | "clubs" | "banner">;
export type EventSummary = Pick<IEvent, "slug" | "eventName" | "description">;

/** Fixed display order for the seven worlds. */
const CATEGORY_ORDER = [
  "celeste",
  "taal-tarang",
  "anubhuti",
  "bakya-rongo",
  "aetheria",
  "cadence",
  "brahmand",
] as const;

/**
 * Lookup filter for a Mongo id or atlas slug. Not `isValidObjectId`: it accepts
 * any 12-character string, which would swallow slugs like "general-quiz".
 */
export const eventLookup = (id: string) =>
  /^[a-f\d]{24}$/i.test(id) ? { _id: id } : { slug: id.toLowerCase() };

/** How long one server instance reuses the atlas line-up before re-reading Mongo. */
const ATLAS_TTL_MS = 60_000;
let atlasCache: { at: number; value: Promise<AtlasCategory[]> } | null = null;

/** Drop this instance's atlas copy (after an admin edit) so the next visit re-reads Mongo. */
export function invalidateAtlas() {
  atlasCache = null;
}

/**
 * The seven worlds — category copy from MongoDB, events from Mongo or
 * canonical defaults. Rendered per request, but the database read is shared
 * for a minute so navigating to /events doesn't wait on Mongo every time.
 */
export async function getAtlasCategories(): Promise<AtlasCategory[]> {
  // Read per request: a prerender would need the database at build time.
  await connection();
  const now = Date.now();
  if (!atlasCache || now - atlasCache.at > ATLAS_TTL_MS) {
    const value = readAtlasCategories();
    atlasCache = { at: now, value };
    // Never keep a failed read: the next request retries.
    value.catch(() => {
      if (atlasCache?.value === value) atlasCache = null;
    });
  }
  return atlasCache.value;
}

async function readAtlasCategories(): Promise<AtlasCategory[]> {
  await connect();

  // Fetch categories from MongoDB; fall back to constants if collection is empty.
  const dbCategories = await AtlasCategoryModel.find()
    .lean<{ id: string; name: string; kind: string; line: string; image: string }[]>();

  // Build a lookup by id from the DB results.
  const dbCategoryById = new Map(dbCategories.map((c) => [c.id, c]));

  // Fetch events from MongoDB.
  const records = await Event.find()
    .select("slug eventName category kind description clubs banner")
    .sort({ eventName: 1 })
    .lean<AtlasEventRecord[]>();

  // Resolve each category in canonical order, merging DB data with constants fallback.
  return CATEGORY_ORDER.map((catId) => {
    const constant = ATLAS_CATEGORIES.find((c) => c.id === catId)!;
    const dbCat = dbCategoryById.get(catId);

    const categoryMeta = {
      id: catId,
      name: dbCat?.name ?? constant.name,
      kind: dbCat?.kind ?? constant.kind,
      line: dbCat?.line ?? constant.line,
    };

    // Event.category stores the canonical world name, whatever the DB copy renames it to.
    const matchedRecords = records.filter((r) => r.category === constant.name);
    const toAtlas = (record: AtlasEventRecord, fallback?: AtlasEvent): AtlasEvent => ({
      id: record.slug,
      name: record.eventName,
      description: record.description,
      kind: record.kind || fallback?.kind || "",
      club: record.clubs?.length ? record.clubs.join(", ") : fallback?.club || "",
      image: record.banner || undefined,
    });

    // No events in Mongo yet (fresh database): show the canonical line-up.
    // Otherwise Mongo decides: canonical events keep their order, events added
    // from the admin panel follow, and deleted ones drop out.
    let events: AtlasEvent[];
    if (!records.length) {
      events = constant.events;
    } else {
      const canonical = new Map(constant.events.map((e, i) => [e.id, i]));
      events = matchedRecords
        .slice()
        .sort((a, b) => (canonical.get(a.slug) ?? 1e3) - (canonical.get(b.slug) ?? 1e3) || a.eventName.localeCompare(b.eventName))
        .map((r) => toAtlas(r, constant.events.find((e) => e.id === r.slug)));
    }

    return {
      ...categoryMeta,
      events,
    };
  });
}

/** Cached per request: metadata and the page share one query. */
export const getEventSummary = cache(async (id: string) => {
  await connect();
  return Event.findOne(eventLookup(id))
    .select("slug eventName description")
    .lean<EventSummary | null>();
});
