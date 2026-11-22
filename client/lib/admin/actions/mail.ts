"use server";

import connect from "@/lib/mongoose";
import Event from "@/lib/models/Events";
import Registration from "@/lib/models/Registrations";
import User from "@/lib/models/User";
import { getCustomAnnouncementEmailHtml } from "@/components/emails";
import { sendBroadcast } from "@/lib/auth-mail";
import { guard } from "@/lib/admin/session";
import { audit } from "@/lib/admin/audit";
import { fillVars, textToEmailHtml, type MailVars } from "@/lib/admin/mail-body";
import type { ActionResult } from "./events";

/** Who gets the mail. */
export type Audience =
  | { kind: "everyone" }
  | { kind: "incomplete" }
  | { kind: "event"; eventId: string; verifiedOnly: boolean }
  | { kind: "emails"; emails: string };

/** One send is capped so a slip can't email the whole database twice over. */
const MAX_RECIPIENTS = 5000;

type Recipient = MailVars & { email: string };
type Person = { _id: unknown; email: string; fullName?: string; username?: string };
const nameOf = (u: Person) => u.fullName || u.username || "there";

async function resolve(audience: Audience): Promise<Recipient[] | string> {
  await connect();
  switch (audience.kind) {
    case "everyone":
    case "incomplete": {
      const users = await User.find(audience.kind === "incomplete" ? { isProfileComplete: { $ne: true } } : {})
        .select("email fullName username")
        .limit(MAX_RECIPIENTS + 1)
        .lean<Person[]>();
      return users.map((u) => ({ email: u.email, name: nameOf(u) }));
    }
    case "event": {
      if (!/^[a-f\d]{24}$/i.test(audience.eventId)) return "Pick an event.";
      const event = await Event.findById(audience.eventId).select("eventName").lean<{ eventName: string }>();
      if (!event) return "Event not found.";
      const regs = await Registration.find({ eventId: audience.eventId, ...(audience.verifiedOnly ? { verified: true } : {}) })
        .populate("participant", "email fullName username")
        .populate("teamId", "teamName teamCode")
        .lean<{ participant: Person | null; teamId?: { teamName?: string; teamCode?: string } | null }[]>();
      return regs
        .filter((r) => r.participant?.email)
        .map((r) => ({
          email: r.participant!.email,
          name: nameOf(r.participant!),
          event: event.eventName,
          team: r.teamId?.teamName ?? "",
          teamCode: r.teamId?.teamCode ?? "",
        }));
    }
    default:
      return "Pick who gets this.";
    case "emails": {
      const emails = Array.from(
        new Set(
          String(audience.emails ?? "")
            .split(/[\s,;]+/)
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean),
        ),
      );
      const bad = emails.find((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
      if (bad) return `"${bad}" isn't an email address.`;
      const known = await User.find({ email: { $in: emails } }).select("email fullName username").lean<Person[]>();
      const byEmail = new Map(known.map((u) => [u.email, u]));
      return emails.map((email) => {
        const u = byEmail.get(email);
        return { email, name: u ? nameOf(u) : "there" };
      });
    }
  }
}

/** How many people an audience reaches, before sending. */
export async function countAudience(audience: Audience): Promise<ActionResult<{ count: number }>> {
  const g = await guard("mail");
  if (!g.ok) return g;
  const list = await resolve(audience);
  if (typeof list === "string") return { ok: false, error: list };
  return { ok: true, count: new Set(list.map((r) => r.email)).size };
}

export async function sendMail(input: { audience: Audience; subject: string; body: string }): Promise<ActionResult<{ sent: number }>> {
  const g = await guard("mail", true);
  if (!g.ok) return g;
  const subject = String(input.subject ?? "").trim();
  const body = String(input.body ?? "").trim();
  if (!subject || subject.length > 150) return { ok: false, error: "Subject: 1–150 characters." };
  if (!body || body.length > 20000) return { ok: false, error: "Write the message." };

  const list = await resolve(input.audience);
  if (typeof list === "string") return { ok: false, error: list };
  const unique = Array.from(new Map(list.map((r) => [r.email, r])).values());
  if (!unique.length) return { ok: false, error: "Nobody matches that audience." };
  if (unique.length > MAX_RECIPIENTS) return { ok: false, error: `That's over ${MAX_RECIPIENTS} people. Narrow the audience.` };

  const messages = unique.map((r) => {
    const s = fillVars(subject, r);
    return {
      to: r.email,
      subject: s,
      html: getCustomAnnouncementEmailHtml({ headline: s, badge: "ECLECIA'27 DISPATCH", messageHtml: textToEmailHtml(fillVars(body, r)) }),
    };
  });
  const { sent, error } = await sendBroadcast(messages);
  const who = input.audience.kind === "event" ? `event registrants` : input.audience.kind;
  await audit(g.admin, "sent mail", subject, `${sent} of ${messages.length} delivered · audience: ${who}${error ? ` · stopped: ${error}` : ""}`);
  if (error) return { ok: false, error: `Stopped after ${sent} of ${messages.length}: ${error}. The first ${sent} already got it; don't resend to everyone.` };
  return { ok: true, sent };
}
