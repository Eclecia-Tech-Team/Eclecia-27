import { Resend } from "resend";
import {
  getWelcomeEmailHtml,
  getOtpEmailHtml,
  getEventRegistrationEmailHtml,
  getTeamInvitationEmailHtml,
  getCustomAnnouncementEmailHtml,
} from "@/components/emails";

const from = process.env.MAIL_FROM ?? "Eclecia'27 <tech@eclecia-hitk.in>";
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function send(to: string, subject: string, html: string, devNote: string) {
  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      throw new Error('Invalid/Missing environment variable: "RESEND_API_KEY"');
    }
    console.info(`[mail:dev] to=${to} subject="${subject}" ${devNote}`);
    return;
  }
  const { error } = await resend.emails.send({ from, to: [to], subject, html });
  if (error) throw new Error(`Resend: ${error.message}`);
}

/**
 * Send registration verification OTP email.
 */
export async function sendOtpEmail(to: string, otp: string) {
  const html = getOtpEmailHtml({ otp, type: "verification", email: to });
  return send(to, "Your Eclecia'27 Verification Cipher", html, `otp=${otp}`);
}

/**
 * Send password reset verification OTP email.
 */
export async function sendPasswordResetOtpEmail(to: string, otp: string) {
  const html = getOtpEmailHtml({ otp, type: "reset", email: to });
  return send(to, "Reset Your Eclecia'27 Password", html, `otp=${otp}`);
}

/**
 * Send celestial welcome email upon successful signup or verification.
 * Highlights that events are live and requests completion of personal dossier.
 */
export async function sendWelcomeEmail(to: string, username?: string) {
  const html = getWelcomeEmailHtml({ email: to, username });
  return send(
    to,
    "Welcome to Eclecia'27 — Events Are Live & Action Required",
    html,
    `welcome user=${username || to}`
  );
}

/**
 * Send confirmation email after registering for an event.
 */
export async function sendEventRegistrationEmail(
  to: string,
  params: {
    participantName: string;
    eventName: string;
    category: string;
    teamName?: string;
    isTeamLeader?: boolean;
    teamCode?: string;
    venue?: string;
    schedule?: string;
  }
) {
  const html = getEventRegistrationEmailHtml(params);
  return send(
    to,
    `Registration Confirmed: ${params.eventName} — Eclecia'27`,
    html,
    `event_reg=${params.eventName}`
  );
}

/**
 * Send team/guild invitation email.
 */
export async function sendTeamInvitationEmail(
  to: string,
  params: {
    leaderName: string;
    teamName: string;
    eventName: string;
    teamCode: string;
  }
) {
  const html = getTeamInvitationEmailHtml({
    recipientEmail: to,
    ...params,
  });
  return send(
    to,
    `Guild Summons: Join ${params.teamName} for ${params.eventName} — Eclecia'27`,
    html,
    `team_invite=${params.teamName}`
  );
}

/**
 * Send custom or announcement dispatch to multiple users or a user.
 */
export async function sendAnnouncementEmail(
  to: string,
  params: {
    headline: string;
    subheadline?: string;
    badge?: string;
    messageHtml: string;
    actionButton?: {
      label: string;
      url: string;
    };
  }
) {
  const html = getCustomAnnouncementEmailHtml(params);
  return send(
    to,
    `${params.headline} — Eclecia'27 Dispatch`,
    html,
    `announcement=${params.headline}`
  );
}
