"use server";

import connect from "@/lib/mongoose";
import Event from "@/lib/models/Events";
import EventNotice from "@/lib/models/EventNotice";
import EventResult from "@/lib/models/EventResult";
import Registration from "@/lib/models/Registrations";
import Team from "@/lib/models/Team";
import { invalidateAtlas } from "@/lib/events";
import { guard } from "@/lib/admin/session";
import { audit } from "@/lib/admin/audit";
import { eventInput, firstIssue, type EventInput } from "@/lib/admin/event-input";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const isId = (id: unknown): id is string => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);

function duplicateMessage(err: unknown): string | null {
  const e = err as { code?: number; keyPattern?: Record<string, unknown> };
  if (e?.code !== 11000) return null;
  if (e.keyPattern?.slug) return "Another event already uses that URL name.";
  if (e.keyPattern?.eventName) return "Another event already has that name.";
  return "That clashes with another event.";
}

/** Create (no id) or update an event. Returns its id and slug. */
export async function saveEvent(id: string | null, input: EventInput): Promise<ActionResult<{ id: string; slug: string }>> {
  const g = await guard("events", true);
  if (!g.ok) return g;
  const parsed = eventInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const data = parsed.data;

  await connect();
  try {
    if (!id) {
      const created = await Event.create(data);
      invalidateAtlas();
      await audit(g.admin, "created event", created.eventName);
      return { ok: true, id: created._id.toString(), slug: created.slug };
    }
    if (!isId(id)) return { ok: false, error: "Event not found." };
    const event = await Event.findById(id);
    if (!event) return { ok: false, error: "Event not found." };

    if (event.isTeamEvent !== data.isTeamEvent || event.isPaidEvent !== data.isPaidEvent) {
      // Both decide how registrations were created (teams vs solo, verified vs pending payment).
      const taken = await Registration.exists({ eventId: event._id });
      if (taken) {
        return {
          ok: false,
          error: `People have already registered, so it can't switch between ${event.isTeamEvent !== data.isTeamEvent ? "solo and team" : "free and paid"} now.`,
        };
      }
    }
    if (data.isTeamEvent && data.maxMembersPerTeam < event.maxMembersPerTeam) {
      const tooBig = await Team.exists({ eventId: event._id, [`team.${data.maxMembersPerTeam}`]: { $exists: true } });
      if (tooBig) return { ok: false, error: `A team already has more than ${data.maxMembersPerTeam} member${data.maxMembersPerTeam === 1 ? "" : "s"}.` };
    }

    const changed = Object.keys(data).filter((k) => JSON.stringify(event.get(k)) !== JSON.stringify((data as Record<string, unknown>)[k]));
    event.set(data);
    await event.save();
    invalidateAtlas();
    if (changed.length) await audit(g.admin, "edited event", event.eventName, changed.join(", "));
    return { ok: true, id: event._id.toString(), slug: event.slug };
  } catch (err) {
    const dup = duplicateMessage(err);
    if (dup) return { ok: false, error: dup };
    console.error("[admin] save event", err);
    return { ok: false, error: "Couldn't save the event." };
  }
}

/** Open or close registrations without opening the editor. */
export async function setEventOpen(id: string, isActive: boolean): Promise<ActionResult> {
  const g = await guard("events", true);
  if (!g.ok) return g;
  if (!isId(id)) return { ok: false, error: "Event not found." };
  await connect();
  const event = await Event.findOneAndUpdate({ _id: id }, { $set: { isActive: Boolean(isActive) } }).select("eventName");
  if (!event) return { ok: false, error: "Event not found." };
  await audit(g.admin, isActive ? "opened registrations" : "closed registrations", event.eventName);
  return { ok: true };
}

/**
 * Deletes a closed event nobody has registered for, with its notices and
 * results. Must be closed first, so no registration can land mid-delete.
 */
export async function deleteEvent(id: string): Promise<ActionResult> {
  const g = await guard("events", true);
  if (!g.ok) return g;
  if (!isId(id)) return { ok: false, error: "Event not found." };
  await connect();
  const count = await Registration.countDocuments({ eventId: id });
  if (count > 0) {
    return { ok: false, error: `${count} registration${count === 1 ? "" : "s"} exist. Close registrations instead of deleting.` };
  }
  const event = await Event.findOneAndDelete({ _id: id, isActive: false });
  if (!event) {
    return (await Event.exists({ _id: id })) ? { ok: false, error: "Close registrations first, then delete." } : { ok: false, error: "Event not found." };
  }
  if (await Registration.exists({ eventId: id })) {
    // Someone registered in the instant between the count and the delete: put it back.
    await Event.collection.insertOne(event.toObject());
    return { ok: false, error: "Someone just registered. Close registrations instead." };
  }
  await Promise.all([EventNotice.deleteMany({ eventId: id }), EventResult.deleteOne({ eventId: id }), Team.deleteMany({ eventId: id })]);
  invalidateAtlas();
  await audit(g.admin, "deleted event", event.eventName);
  return { ok: true };
}
