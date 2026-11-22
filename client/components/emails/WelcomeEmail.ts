import { esc, getEmailLayout } from "./EmailLayout";

interface WelcomeEmailProps {
  email: string;
  username?: string;
}

/**
 * Welcome Email Template for Eclecia'27.
 * Welcomes new participants to Eclecia'27.
 * Directs users to explore events and complete their profile details on their profile dashboard
 * (without which they cannot register for events once registrations open).
 */
export function getWelcomeEmailHtml({ email, username }: WelcomeEmailProps): string {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.eclecia-hitk.in").replace(/\/+$/, "");
  const profileUrl = `${siteUrl}/profile`;
  const eventsUrl = `${siteUrl}/events`;
  const participantName = esc(username || email.split("@")[0] || "Participant");

  const content = `
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 26px; color: #ece4d2;">
      Greetings, <strong style="color: #ffd875;">${participantName}</strong>.
    </p>

    <p style="margin: 0 0 18px; font-size: 15px; line-height: 26px; color: rgba(236,228,210,0.85);">
      Welcome to <strong>Eclecia'27</strong>, the annual cultural fest of Heritage Institute of Technology, Kolkata. Your festival account is now active.
    </p>

    <!-- Explore Events Notice -->
    <div style="margin: 22px 0; padding: 18px 20px; background: rgba(217,164,65,0.06); border-left: 3px solid #d9a441; border-top: 1px solid rgba(217,164,65,0.2); border-right: 1px solid rgba(217,164,65,0.2); border-bottom: 1px solid rgba(217,164,65,0.2);">
      <p style="margin: 0 0 6px; font-family: 'Courier New', Courier, monospace; font-size: 11px; font-weight: bold; color: #ffd875; letter-spacing: 0.2em; text-transform: uppercase;">
        EXPLORE EVENTS & ARENAS
      </p>
      <p style="margin: 0; font-size: 14px; line-height: 22px; color: #ece4d2;">
        Take a look at the events lined up across our creative arenas — <em>Cadence, Celeste, Taal Tarang, Aetheria, Anubhuti, BakyaRongo,</em> and <em>Brahmand</em>. Start exploring the competitions and get your team ready.
      </p>
    </div>

    <!-- Profile Completion Notice -->
    <div style="margin: 24px 0; padding: 20px 22px; background: #0c1117; border: 1px solid rgba(217,164,65,0.35); text-align: left;">
      <h3 style="margin: 0 0 10px; font-family: 'Georgia', serif; font-size: 18px; color: #ffd875; font-weight: normal;">
        Action Required: Complete Your Profile
      </h3>
      <p style="margin: 0 0 14px; font-size: 14px; line-height: 23px; color: rgba(236,228,210,0.8);">
        Please head over to your <strong>Profile Dashboard</strong> and complete your profile. All four profile details are mandatory — you will not be able to register for events or join teams until your profile is complete:
      </p>
      
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 14px;">
        <tr>
          <td style="padding: 4px 0; font-size: 13px; color: #ece4d2;">
            <span style="color: #d9a441; margin-right: 8px;">01 //</span> Full Name
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-size: 13px; color: #ece4d2;">
            <span style="color: #d9a441; margin-right: 8px;">02 //</span> Phone Number
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-size: 13px; color: #ece4d2;">
            <span style="color: #d9a441; margin-right: 8px;">03 //</span> College / University
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-size: 13px; color: #ece4d2;">
            <span style="color: #d9a441; margin-right: 8px;">04 //</span> Department / Stream
          </td>
        </tr>
      </table>

      <p style="margin: 0; font-size: 13px; line-height: 20px; color: #6ee7b7;">
        Completing your profile will also activate your Festival Pass QR code for entry.
      </p>
    </div>

    <!-- Quick Links Grid -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0 12px;">
      <tr>
        <td style="padding: 12px; background: rgba(16,23,31,0.6); border: 1px solid rgba(217,164,65,0.2); width: 50%; vertical-align: top;">
          <p style="margin: 0 0 4px; font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #d9a441; letter-spacing: 0.15em; text-transform: uppercase;">
            BROWSE
          </p>
          <a href="${eventsUrl}" target="_blank" style="font-size: 13px; color: #ffffff; text-decoration: none; font-weight: bold;">
            Explore Events &rarr;
          </a>
        </td>
        <td style="width: 12px;"></td>
        <td style="padding: 12px; background: rgba(16,23,31,0.6); border: 1px solid rgba(217,164,65,0.2); width: 50%; vertical-align: top;">
          <p style="margin: 0 0 4px; font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #d9a441; letter-spacing: 0.15em; text-transform: uppercase;">
            DASHBOARD
          </p>
          <a href="${profileUrl}" target="_blank" style="font-size: 13px; color: #ffffff; text-decoration: none; font-weight: bold;">
            Profile Dashboard &rarr;
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 22px 0 0; font-size: 13px; line-height: 22px; color: rgba(236,228,210,0.5); font-style: italic; text-align: center;">
      Note: This is an automated notification. Please do not reply directly to this email. For any queries, please visit our website.
    </p>
  `;

  return getEmailLayout({
    previewText: "Welcome to Eclecia'27: The Annual Cultural Fest of Heritage Institute of Technology, Kolkata. Complete your profile dashboard to prepare for event registrations.",
    badge: "ACCOUNT ACTIVATED",
    headline: "Welcome to Eclecia'27",
    subheadline: "The Annual Cultural Fest of Heritage Institute of Technology, Kolkata",
    content,
    actionButton: {
      label: "Complete Profile",
      url: profileUrl,
    },
    footerNote: "Eclecia'27 &bull; Heritage Institute of Technology &bull; Kolkata",
    siteUrl,
  });
}
