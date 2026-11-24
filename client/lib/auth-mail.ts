import { Resend } from "resend";
import {
  getEmailLayout,
  getWelcomeEmailHtml,
  getOtpEmailHtml,
  getEventRegistrationEmailHtml,
  getTeamInvitationEmailHtml,
  getCustomAnnouncementEmailHtml,
  getCampusAmbassadorEmailHtml,
} from "@/components/emails";

const from = process.env.MAIL_FROM ?? "Eclecia'27 <tech@eclecia-hitk.in>";
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

async function send(
  to: string,
  subject: string,
  html: string,
  devNote: string,
) {
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
 * Send welcome email upon successful signup or verification.
 */
export async function sendWelcomeEmail(to: string, username?: string) {
  const html = getWelcomeEmailHtml({ email: to, username });
  return send(
    to,
    "Welcome to Eclecia'27: The Annual Cultural Fest of Heritage Institute of Technology, Kolkata",
    html,
    `welcome user=${username || to}`,
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
    registrationCode: string;
    isPayer: boolean;
    isPaidEvent: boolean;
    teamName?: string;
    isTeamLeader?: boolean;
    teamCode?: string;
    venue?: string;
    schedule?: string;
  },
) {
  const html = getEventRegistrationEmailHtml(params);
  return send(
    to,
    `Registration Confirmed: ${params.eventName} — Eclecia'27`,
    html,
    `event_reg=${params.eventName}`,
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
  },
) {
  const html = getTeamInvitationEmailHtml({
    recipientEmail: to,
    ...params,
  });
  return send(
    to,
    `Guild Summons: Join ${params.teamName} for ${params.eventName} — Eclecia'27`,
    html,
    `team_invite=${params.teamName}`,
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
  },
) {
  const html = getCustomAnnouncementEmailHtml(params);
  return send(
    to,
    `${params.headline} — Eclecia'27 Dispatch`,
    html,
    `announcement=${params.headline}`,
  );
}

/**
 * Send ambassador induction and unique code email.
 */
export async function sendCampusAmbassadorEmail(
  to: string,
  params: {
    name: string;
    college: string;
    graduationYear: number;
    ambassadorCode: string;
  },
) {
  const html = getCampusAmbassadorEmailHtml(params);
  return send(
    to,
    `Your Ambassador Credential: ${params.ambassadorCode} — Eclecia'27`,
    html,
    `cam_code=${params.ambassadorCode}`,
  );
}

/** Panel sign-in code. */
export async function sendAdminOtpEmail(to: string, otp: string) {
  const html = getEmailLayout({
    previewText: `Your Eclecia'27 control room code: ${otp}`,
    badge: "CONTROL ROOM",
    headline: "Your sign-in code",
    subheadline:
      "Someone (hopefully you) is signing in to the Eclecia'27 admin panel.",
    content: `
      <p style="margin: 24px 0; text-align: center; font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: bold; letter-spacing: 0.35em; color: #ffd875;">${otp}</p>
      <p style="margin: 0; font-size: 14px; line-height: 24px; text-align: center; color: rgba(236,228,210,0.7);">It works once and expires in 10 minutes. If this wasn't you, change your password and tell the tech team.</p>`,
    footerNote: "Eclecia'27 control room",
  });
  return send(
    to,
    `Eclecia'27 control room code: ${otp}`,
    html,
    `admin_otp=${otp}`,
  );
}

/** Invitation to the admin panel. */
export async function sendAdminInviteEmail(
  to: string,
  role: string,
  loginUrl: string,
) {
  const html = getEmailLayout({
    previewText: "You've been added to the Eclecia'27 control room",
    badge: "CONTROL ROOM",
    headline: "You're on the crew",
    subheadline: `You've been added to the Eclecia'27 admin panel as ${role}.`,
    content: `
      <p style="margin: 0 0 12px; font-size: 15px; line-height: 26px; color: #ece4d2;">Open the panel, sign in with this email address and choose a password (8+ characters). We'll email you a one-time code to confirm it's you.</p>`,
    actionButton: { label: "Open the control room", url: loginUrl },
    footerNote: "Eclecia'27 control room",
  });
  return send(
    to,
    "You've been added to the Eclecia'27 control room",
    html,
    `admin_invite=${loginUrl}`,
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface BroadcastMessage {
  to: string;
  subject: string;
  html: string;
}

/**
 * Many personalised emails in Resend batches of 100. Returns how many went
 * out; stops at the first failed batch so a retry doesn't double-send much.
 */
export async function sendBroadcast(
  messages: BroadcastMessage[],
): Promise<{ sent: number; error?: string }> {
  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      throw new Error('Invalid/Missing environment variable: "RESEND_API_KEY"');
    }
    for (const m of messages)
      console.info(`[mail:dev] to=${m.to} subject="${m.subject}" broadcast`);
    return { sent: messages.length };
  }
  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages
      .slice(i, i + 100)
      .map((m) => ({ from, to: [m.to], subject: m.subject, html: m.html }));
    // Resend allows a couple of requests a second: pace batches, and back off on rate limits.
    if (i > 0) await sleep(700);
    let error: { message: string; name?: string } | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      ({ error } = await resend.batch.send(chunk));
      if (
        !error ||
        !/rate|429|too many/i.test(`${error.name} ${error.message}`)
      )
        break;
      await sleep(1500 * (attempt + 1));
    }
    if (error) return { sent, error: error.message };
    sent += chunk.length;
  }
  return { sent };
}
