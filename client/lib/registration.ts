import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connect from "@/lib/mongoose";
import Event, { type IEventDocument } from "@/lib/models/Events";
import Registration from "@/lib/models/Registrations";
import Team from "@/lib/models/Team";
import User, { type IUserDocument } from "@/lib/models/User";
import { eventLookup } from "@/lib/events";
import { sendEventRegistrationEmail } from "@/lib/auth-mail";

/**
 * Error codes the event page understands. `code` drives the client's next step
 * (sign in, finish profile, ...); `error` is the sentence shown to the visitor.
 */
export type RegistrationErrorCode =
  | "UNAUTHENTICATED"
  | "PROFILE_INCOMPLETE"
  | "NOT_FOUND"
  | "CLOSED"
  | "ALREADY_REGISTERED"
  | "WRONG_FORMAT"
  | "FULL"
  | "BAD_CODE"
  | "TEAM_FULL"
  | "FORBIDDEN";

export const fail = (status: number, code: RegistrationErrorCode, error: string) =>
  NextResponse.json({ code, error }, { status });

export interface Registrant {
  user: IUserDocument;
  event: IEventDocument;
}

/**
 * Everything every register route checks before writing: signed in, profile
 * complete (coordinators need a name, phone and college), event exists and is
 * open, and not already registered. Returns the response to send on failure.
 */
export async function loadRegistrant(eventId: string): Promise<Registrant | NextResponse> {
  // Same switch that hides the sign-in pages: nobody registers before launch.
  if (!registrationLive()) return fail(400, "CLOSED", "Registrations haven't opened yet.");
  const session = await auth();
  if (!session?.user?.id) return fail(401, "UNAUTHENTICATED", "Sign in to register.");

  await connect();
  const [user, event] = await Promise.all([
    User.findById(session.user.id) as Promise<IUserDocument | null>,
    Event.findOne(eventLookup(eventId)) as Promise<IEventDocument | null>,
  ]);
  if (!user) return fail(401, "UNAUTHENTICATED", "Sign in to register.");
  if (!event) return fail(404, "NOT_FOUND", "This event doesn't exist.");
  if (!user.isProfileComplete) {
    return fail(400, "PROFILE_INCOMPLETE", "Complete your profile (name, phone, college) before registering.");
  }
  if (!event.isActive) return fail(400, "CLOSED", "Registrations for this event aren't open.");
  if (await Registration.exists({ eventId: event._id, participant: user._id })) {
    return fail(400, "ALREADY_REGISTERED", "You're already registered for this event.");
  }
  return { user, event };
}

/**
 * Seats left under `teamLimit`: counted as solo registrations for solo events
 * and as teams for team events (one team is one entry). Unlimited if unset.
 */
export async function isEventFull(event: IEventDocument) {
  if (!event.teamLimit) return false;
  const taken = event.isTeamEvent
    ? await Team.countDocuments({ eventId: event._id })
    : await Registration.countDocuments({ eventId: event._id, isInTeam: false });
  return taken >= event.teamLimit;
}

/** Confirmation mail; never fails the registration it confirms. */
export function confirmByMail(
  user: IUserDocument,
  event: IEventDocument,
  team?: { teamName?: string; teamCode: string; isTeamLeader: boolean },
) {
  void sendEventRegistrationEmail(user.email, {
    participantName: user.fullName || user.username,
    eventName: event.eventName,
    category: event.category,
    teamName: team?.teamName,
    teamCode: team?.teamCode,
    isTeamLeader: team?.isTeamLeader,
    venue: event.venue && event.venue !== "TBA" ? event.venue : undefined,
    schedule: event.date && event.date !== "TBA" ? [event.date, event.time].filter(Boolean).join(", ") : undefined,
  }).catch((err) => console.error("[registration] mail_failed", err));
}

/** Paid events have no payment gateway yet: entries start unverified, confirmed by the team later. */
export const paymentNote = (event: IEventDocument) =>
  event.isPaidEvent ? " Your entry is confirmed once the fee is paid; payment details are posted on the event page." : "";

/** Site-wide registration is live. */
export const registrationLive = () => true;
