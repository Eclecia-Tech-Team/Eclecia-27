import { NextResponse } from "next/server";
import Event from "@/lib/models/Events";
import Registration from "@/lib/models/Registrations";
import { confirmByMail, fail, isEventFull, loadRegistrant, paymentNote } from "@/lib/registration";

/** Register the signed-in visitor for a solo event. `id`: event id or slug. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await loadRegistrant(id);
    if (ctx instanceof NextResponse) return ctx;
    const { user, event } = ctx;

    if (event.isTeamEvent) return fail(400, "WRONG_FORMAT", "This is a team event: create or join a team.");
    if (await isEventFull(event)) return fail(400, "FULL", "This event is full.");

    const registration = await Registration.create({
      eventId: event._id,
      participant: user._id,
      isInTeam: false,
      verified: !event.isPaidEvent,
    });
    await Event.updateOne({ _id: event._id }, { $addToSet: { registrations: registration._id } });
    confirmByMail(user, event);

    return NextResponse.json({ message: `You're registered for ${event.eventName}.${paymentNote(event)}` }, { status: 201 });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return fail(400, "ALREADY_REGISTERED", "You're already registered for this event.");
    }
    console.error("[registration/solo]", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
