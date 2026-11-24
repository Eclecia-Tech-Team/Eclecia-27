import { NextResponse } from "next/server";
import Event from "@/lib/models/Events";
import CampusAmbassador from "@/lib/models/CampusAmbassador";
import { confirmByMail, createRegistration, fail, isEventFull, loadRegistrant, paymentNote } from "@/lib/registration";

/** Register the signed-in visitor for a solo event. `id`: event id or slug. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { refCode?: string };
    const rawRefCode = typeof body.refCode === "string" ? body.refCode.trim().toUpperCase() : "";

    const ctx = await loadRegistrant(id);
    if (ctx instanceof NextResponse) return ctx;
    const { user, event } = ctx;

    if (event.isTeamEvent) return fail(400, "WRONG_FORMAT", "This is a team event: create or join a team.");
    if (await isEventFull(event)) return fail(400, "FULL", "This event is full.");

    let validRefCode: string | undefined = undefined;
    if (rawRefCode) {
      const ambassadorExists = await CampusAmbassador.exists({ ambassadorCode: rawRefCode });
      if (ambassadorExists) {
        validRefCode = rawRefCode;
        await CampusAmbassador.updateOne(
          { ambassadorCode: rawRefCode },
          { $inc: { referralCount: 1 } }
        );
      }
    }

    const registration = await createRegistration({
      eventId: event._id,
      participant: user._id,
      isInTeam: false,
      verified: !event.isPaidEvent,
      ...(validRefCode ? { referredByCode: validRefCode } : {}),
    });
    await Event.updateOne({ _id: event._id }, { $addToSet: { registrations: registration._id } });
    confirmByMail(user, event, registration.registrationCode);

    return NextResponse.json(
      {
        message: `You're registered for ${event.eventName}. Your registration ID is ${registration.registrationCode}.${paymentNote(event, registration.registrationCode)}`,
        registrationCode: registration.registrationCode,
      },
      { status: 201 },
    );
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return fail(400, "ALREADY_REGISTERED", "You're already registered for this event.");
    }
    console.error("[registration/solo]", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
