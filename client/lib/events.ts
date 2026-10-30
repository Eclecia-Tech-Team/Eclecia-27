import { connection } from "next/server";
import { cache } from "react";
import { ATLAS_CATEGORIES, type AtlasCategory } from "@/constants/events";
import Event from "@/lib/models/Events";
import connect from "@/lib/mongoose";
import type { IEvent } from "@/types/interface";

type AtlasEventRecord = Pick<IEvent, "slug" | "eventName" | "category" | "kind" | "description">;
export type EventSummary = Pick<IEvent, "slug" | "eventName" | "description">;

/**
 * Lookup filter for a Mongo id or atlas slug. Not `isValidObjectId`: it accepts
 * any 12-character string, which would swallow slugs like "general-quiz".
 */
export const eventLookup = (id: string) =>
  /^[a-f\d]{24}$/i.test(id) ? { _id: id } : { slug: id.toLowerCase() };

/** The seven worlds (order and copy from constants), holding their events from Mongo. */
export async function getAtlasCategories(): Promise<AtlasCategory[]> {
  // Read per request: a prerender would need the database at build time.
  await connection();
  await connect();

  const records = await Event.find()
    .select("slug eventName category kind description")
    .sort({ eventName: 1 })
    .lean<AtlasEventRecord[]>();

  return ATLAS_CATEGORIES.map((category) => ({
    ...category,
    events: records
      .filter((record) => record.category === category.name)
      .map((record) => ({
        id: record.slug,
        name: record.eventName,
        description: record.description,
        kind: record.kind ?? "",
      })),
  }));
}

/** Cached per request: metadata and the page share one query. */
export const getEventSummary = cache(async (id: string) => {
  await connect();
  return Event.findOne(eventLookup(id))
    .select("slug eventName description")
    .lean<EventSummary | null>();
});
