import { getEmailLayout } from "./EmailLayout";

interface WelcomeEmailProps {
  email: string;
  username?: string;
}

/**
 * Celestial Welcome Email Template
 * Welcomes new citizens to Eclecia'27.
 * Highlights that events are officially LIVE.
 * Asks the user to fill their profile details / personal dossier in the dashboard to qualify for event registrations.
 * Emphasizes that this is an automated dispatch and we will not write back to this address.
 */
export function getWelcomeEmailHtml({ email, username }: WelcomeEmailProps): string {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.eclecia-hitk.in").replace(/\/+$/, "");
  const profileUrl = `${siteUrl}/profile`;
  const eventsUrl = `${siteUrl}/events`;
  const citizenName = username || email.split("@")[0] || "Citizen";

  const content = `
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 26px; color: #ece4d2;">
      Greetings, <strong style="color: #ffd875;">${citizenName}</strong>.
    </p>

    <p style="margin: 0 0 18px; font-size: 15px; line-height: 26px; color: rgba(236,228,210,0.85);">
      Your vessel has docked in the celestial amphitheatre of <strong>Eclecia'27</strong>. Your festival account is now active, granting you entry to the Eastern Realm's grandest cultural symposium.
    </p>

    <!-- Celestial Notice Box: Events are LIVE -->
    <div style="margin: 22px 0; padding: 18px 20px; background: rgba(217,164,65,0.06); border-left: 3px solid #d9a441; border-top: 1px solid rgba(217,164,65,0.2); border-right: 1px solid rgba(217,164,65,0.2); border-bottom: 1px solid rgba(217,164,65,0.2);">
      <p style="margin: 0 0 6px; font-family: 'Courier New', Courier, monospace; font-size: 11px; font-weight: bold; color: #ffd875; letter-spacing: 0.2em; text-transform: uppercase;">
        ✦ FESTIVAL UPDATE: COMPETITIONS & EVENTS ARE LIVE ✦
      </p>
      <p style="margin: 0; font-size: 14px; line-height: 22px; color: #ece4d2;">
        All 7 creative realms — <em>Cadence, Celeste, Taal Tarang, Aetheria, Anubhuti, BakyaRongo,</em> and <em>Brahmand</em> — are officially accepting registrations. Explore solo quests and assemble your guilds now.
      </p>
    </div>

    <!-- Action Prompt: Fill Personal Dossier -->
    <div style="margin: 24px 0; padding: 20px 22px; background: #0c1117; border: 1px solid rgba(217,164,65,0.35); text-align: left;">
      <h3 style="margin: 0 0 10px; font-family: 'Georgia', serif; font-size: 18px; color: #ffd875; font-weight: normal;">
        Action Required: Complete Your Personal Dossier
      </h3>
      <p style="margin: 0 0 14px; font-size: 14px; line-height: 23px; color: rgba(236,228,210,0.8);">
        To qualify for official event registrations, verify team rosters, and generate your <strong>Celestial QR Checkpoint Pass</strong>, you must fill in your profile credentials:
      </p>
      
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 14px;">
        <tr>
          <td style="padding: 4px 0; font-size: 13px; color: #ece4d2;">
            <span style="color: #d9a441; margin-right: 8px;">01 //</span> Legal Full Name
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-size: 13px; color: #ece4d2;">
            <span style="color: #d9a441; margin-right: 8px;">02 //</span> Phone / Contact Frequency
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-size: 13px; color: #ece4d2;">
            <span style="color: #d9a441; margin-right: 8px;">03 //</span> College / Academic Institution
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-size: 13px; color: #ece4d2;">
            <span style="color: #d9a441; margin-right: 8px;">04 //</span> Department & Academic Stream
          </td>
        </tr>
      </table>

      <p style="margin: 0; font-size: 13px; line-height: 20px; color: #6ee7b7;">
        ✓ Head to your <strong>Profile Dashboard</strong> to unlock your festival credentials and your gate pass.
      </p>
    </div>

    <!-- Quick Links Grid -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0 12px;">
      <tr>
        <td style="padding: 12px; background: rgba(16,23,31,0.6); border: 1px solid rgba(217,164,65,0.2); width: 50%; vertical-align: top;">
          <p style="margin: 0 0 4px; font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #d9a441; letter-spacing: 0.15em; text-transform: uppercase;">
            EXPLORE THE ARENA
          </p>
          <a href="${eventsUrl}" target="_blank" style="font-size: 13px; color: #ffffff; text-decoration: none; font-weight: bold;">
            Browse Live Events &rarr;
          </a>
        </td>
        <td style="width: 12px;"></td>
        <td style="padding: 12px; background: rgba(16,23,31,0.6); border: 1px solid rgba(217,164,65,0.2); width: 50%; vertical-align: top;">
          <p style="margin: 0 0 4px; font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #d9a441; letter-spacing: 0.15em; text-transform: uppercase;">
            YOUR DOSSIER
          </p>
          <a href="${profileUrl}" target="_blank" style="font-size: 13px; color: #ffffff; text-decoration: none; font-weight: bold;">
            Open Profile Dashboard &rarr;
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 22px 0 0; font-size: 13px; line-height: 22px; color: rgba(236,228,210,0.5); font-style: italic; text-align: center;">
      Note: Our transmissions are dispatch-only. We will not be monitoring replies to this email address. Please visit the official portal for inquiries or assistance.
    </p>
  `;

  return getEmailLayout({
    previewText: "Welcome to Eclecia'27 — Events are now live! Complete your personal dossier in your profile dashboard.",
    badge: "CITIZEN REGISTRY ONBOARDING",
    headline: "Welcome to the Cosmos of Eclecia",
    subheadline: "Your festival chronicle begins now. The gates are open.",
    content,
    actionButton: {
      label: "Complete Your Dossier",
      url: profileUrl,
    },
    footerNote: "Eclecia'27 &bull; Heritage Institute of Technology &bull; 15–17 January 2027",
    siteUrl,
  });
}
