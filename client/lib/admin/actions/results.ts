"use server";

import { z } from "zod";
import connect from "@/lib/mongoose";
import Event from "@/lib/models/Events";
import EventResult, { RESULT_PLACES } from "@/lib/models/EventResult";
import { guard } from "@/lib/admin/session";
import { audit } from "@/lib/admin/audit";
import { firstIssue } from "@/lib/admin/event-input";
import type { ActionResult } from "./events";

const resultInput = z.object({
  entries: z
    .array(
      z.object({
        place: z.enum(RESULT_PLACES),
        teamName: z.string().trim().max(60).default(""),
        teamId: z.string().regex(/^[a-f\d]{24}$/i).nullable().default(null),
        names: z.array(z.string().trim().max(80)).max(30),
        note: z.string().trim().max(200).default(""),
      }),
    )
    .max(20),
  isPublished: z.boolean(),
});

export type ResultInput = z.input<typeof resultInput>;

/** Save an event's podium; published results show on its page. */
export async function saveResult(eventId: string, input: ResultInput): Promise<ActionResult> {
  const g = await guard("results", true);
  if (!g.ok) return g;
  if (!/^[a-f\d]{24}$/i.test(eventId)) return { ok: false, error: "Event not found." };
  const parsed = resultInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const entries = parsed.data.entries
    .map((e) => ({ ...e, names: e.names.filter(Boolean), teamId: e.teamId ?? undefined }))
    .filter((e) => e.names.length || e.teamName)
    // Podium order regardless of the order they were typed in.
    .sort((a, b) => RESULT_PLACES.indexOf(a.place) - RESULT_PLACES.indexOf(b.place));
  if (parsed.data.isPublished && !entries.length) return { ok: false, error: "Add at least one winner before publishing." };

  await connect();
  const event = await Event.findById(eventId).select("eventName").lean<{ eventName: string }>();
  if (!event) return { ok: false, error: "Event not found." };
  const existing = await EventResult.findOne({ eventId }).select("isPublished publishedAt").lean<{ isPublished: boolean; publishedAt?: Date }>();
  await EventResult.updateOne(
    { eventId },
    {
      $set: {
        entries,
        isPublished: parsed.data.isPublished,
        // Keep the first publish time across later corrections.
        publishedAt: parsed.data.isPublished ? (existing?.isPublished && existing.publishedAt) || new Date() : null,
      },
    },
    { upsert: true },
  );
  const verb = parsed.data.isPublished ? (existing?.isPublished ? "updated published results" : "published results") : existing?.isPublished ? "unpublished results" : "saved results draft";
  await audit(g.admin, verb, event.eventName);
  return { ok: true };
}
