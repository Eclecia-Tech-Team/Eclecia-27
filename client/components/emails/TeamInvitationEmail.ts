import { esc, getEmailLayout } from "./EmailLayout";

interface TeamInvitationEmailProps {
  recipientEmail: string;
  leaderName: string;
  teamName: string;
  eventName: string;
  teamCode: string;
}

/**
 * Celestial Guild / Team Invitation Template
 * Sent to prospective team members when a leader recruits or adds them to a squad.
 */
export function getTeamInvitationEmailHtml({
  leaderName,
  teamName,
  eventName,
  teamCode,
}: TeamInvitationEmailProps): string {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.eclecia-hitk.in").replace(/\/+$/, "");
  const profileUrl = `${siteUrl}/profile`;

  const content = `
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 26px; color: #ece4d2;">
      Greetings, Traveler.
    </p>

    <p style="margin: 0 0 20px; font-size: 15px; line-height: 26px; color: rgba(236,228,210,0.85);">
      Guild Leader <strong style="color: #ffd875;">${esc(leaderName)}</strong> has summoned you to join their guild <strong>${esc(teamName)}</strong> for the upcoming battle in <strong>${esc(eventName)}</strong> at Eclecia'27.
    </p>

    <!-- Team Code Invitation Box -->
    <div style="margin: 24px 0; padding: 22px; background: #0c1117; border: 2px solid #d9a441; box-shadow: 0 0 25px rgba(217,164,65,0.2); text-align: center;">
      <p style="margin: 0 0 6px; font-family: 'Courier New', Courier, monospace; font-size: 11px; letter-spacing: 0.25em; color: rgba(217,164,65,0.8); text-transform: uppercase;">
        GUILD RECRUITMENT CIPHER
      </p>
      <p style="margin: 0 0 12px; font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: bold; letter-spacing: 0.3em; color: #ffd875;">
        ${esc(teamCode)}
      </p>
      <p style="margin: 0; font-size: 13px; color: #6ee7b7;">
        Event: <strong>${esc(eventName)}</strong> &bull; Guild: <strong>${esc(teamName)}</strong>
      </p>
    </div>

    <!-- Instructions -->
    <div style="margin: 20px 0; padding: 16px 20px; background: rgba(217,164,65,0.05); border-left: 3px solid #d9a441;">
      <p style="margin: 0 0 6px; font-family: 'Courier New', Courier, monospace; font-size: 11px; font-weight: bold; color: #ffd875; letter-spacing: 0.15em; text-transform: uppercase;">
        HOW TO ACCEPT SUMMONS
      </p>
      <p style="margin: 0 0 8px; font-size: 13px; line-height: 22px; color: #ece4d2;">
        1. Sign in to your account at <strong>Eclecia'27</strong>.
      </p>
      <p style="margin: 0 0 8px; font-size: 13px; line-height: 22px; color: #ece4d2;">
        2. Navigate to your <strong>Profile Dashboard &rarr; Guilds</strong> tab.
      </p>
      <p style="margin: 0; font-size: 13px; line-height: 22px; color: #ece4d2;">
        3. Enter your team code <strong>${esc(teamCode)}</strong> to join the squad roster.
      </p>
    </div>

    <p style="margin: 20px 0 0; font-size: 12px; line-height: 20px; color: rgba(236,228,210,0.45); font-style: italic; text-align: center;">
      This is an automated festival dispatch. Please do not reply directly to this transmission.
    </p>
  `;

  return getEmailLayout({
    previewText: `Guild Summons: Join ${teamName} for ${eventName} at Eclecia'27`,
    badge: "GUILD RECRUITMENT DISPATCH",
    headline: "You Have Been Summoned",
    subheadline: `${leaderName} invites you to battle alongside ${teamName}.`,
    content,
    actionButton: {
      label: "Open Guilds Deck",
      url: profileUrl,
    },
    footerNote: "Eclecia'27 &bull; Heritage Institute of Technology &bull; 15–17 January 2027",
    siteUrl,
  });
}
