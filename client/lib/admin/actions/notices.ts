"use server";

import { z } from "zod";
import connect from "@/lib/mongoose";
import EventNotice, { NOTICE_TONES } from "@/lib/models/EventNotice";
import Event from "@/lib/models/Events";
import { guard } from "@/lib/admin/session";
import { audit } from "@/lib/admin/audit";
import { firstIssue } from "@/lib/admin/event-input";
import type { ActionResult } from "./events";

const noticeInput = z.object({
  /** null = every event page. */
  eventId: z.string().regex(/^[a-f\d]{24}$/i).nullable(),
  title: z.string().trim().min(1, "Give it a title").max(120, "Title: 120 characters max"),
  body: z.string().trim().min(1, "Write the notice").max(2000, "Notice: 2000 characters max"),
  tone: z.enum(NOTICE_TONES),
  pinned: z.boolean(),
  /** YYYY-MM-DD: hidden after that day ends (IST). Empty = never. */
  expiresOn: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Pick a valid date"),
});

export type NoticeInput = z.input<typeof noticeInput>;

export async function saveNotice(id: string | null, input: NoticeInput): Promise<ActionResult<{ id: string }>> {
  const g = await guard("notices", true);
  if (!g.ok) return g;
  const parsed = noticeInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { expiresOn, ...rest } = parsed.data;

  await connect();
  if (rest.eventId && !(await Event.exists({ _id: rest.eventId }))) return { ok: false, error: "That event no longer exists." };
  const doc = {
    ...rest,
    expiresAt: expiresOn ? new Date(`${expiresOn}T23:59:59+05:30`) : undefined,
  };

  if (!id) {
    const created = await EventNotice.create(doc);
    await audit(g.admin, "posted notice", rest.title);
    return { ok: true, id: created._id.toString() };
  }
  if (!/^[a-f\d]{24}$/i.test(id)) return { ok: false, error: "Notice not found." };
  const update = doc.expiresAt ? { $set: doc } : { $set: rest, $unset: { expiresAt: 1 } };
  const res = await EventNotice.updateOne({ _id: id }, update);
  if (!res.matchedCount) return { ok: false, error: "Notice not found." };
  await audit(g.admin, "edited notice", rest.title);
  return { ok: true, id };
}

export async function deleteNotice(id: string): Promise<ActionResult> {
  const g = await guard("notices", true);
  if (!g.ok) return g;
  if (!/^[a-f\d]{24}$/i.test(id)) return { ok: false, error: "Notice not found." };
  await connect();
  const gone = await EventNotice.findOneAndDelete({ _id: id }).select("title");
  if (gone) await audit(g.admin, "deleted notice", gone.title);
  return { ok: true };
}
