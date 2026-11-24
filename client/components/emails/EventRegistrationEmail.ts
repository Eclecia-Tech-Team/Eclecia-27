import { esc, getEmailLayout } from "./EmailLayout";

interface EventRegistrationEmailProps {
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
}

/**
 * Celestial Event Registration Confirmation Template
 * Sent to users upon registering for an event (solo or team).
 */
export function getEventRegistrationEmailHtml({
  participantName,
  eventName,
  category,
  registrationCode,
  isPayer,
  isPaidEvent,
  teamName,
  isTeamLeader = false,
  teamCode,
  venue = "Heritage Institute of Technology Campus",
  schedule = "15–17 January 2027",
}: EventRegistrationEmailProps): string {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.eclecia-hitk.in").replace(/\/+$/, "");
  const profileUrl = `${siteUrl}/profile`;

  const content = `
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 26px; color: #ece4d2;">
      Salutations, <strong style="color: #ffd875;">${esc(participantName)}</strong>.
    </p>

    <p style="margin: 0 0 20px; font-size: 15px; line-height: 26px; color: rgba(236,228,210,0.85);">
      Your enrollment in the celestial trial has been officially sanctioned. You are registered to compete in <strong>${esc(eventName)}</strong> under the realm of <strong>${esc(category)}</strong>.
    </p>

    <!-- Event Dossier Certificate Box -->
    <div style="margin: 24px 0; padding: 22px; background: #0c1117; border: 1px solid rgba(217,164,65,0.4); box-shadow: inset 0 0 20px rgba(217,164,65,0.05);">
      <p style="margin: 0 0 14px; font-family: 'Courier New', Courier, monospace; font-size: 11px; font-weight: bold; letter-spacing: 0.25em; color: #ffd875; text-transform: uppercase; border-bottom: 1px solid rgba(217,164,65,0.2); pb: 8px;">
        EVENT DISPATCH CREDENTIALS
      </p>

      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: rgba(236,228,210,0.6); width: 40%;">EVENT:</td>
          <td style="padding: 6px 0; font-size: 14px; color: #ffffff; font-weight: bold;">${esc(eventName)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: rgba(236,228,210,0.6);">CREATIVE REALM:</td>
          <td style="padding: 6px 0; font-size: 14px; color: #ffd875;">${esc(category)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: rgba(236,228,210,0.6);">REGISTRATION ID:</td>
          <td style="padding: 6px 0; font-family: 'Courier New', monospace; font-size: 15px; color: #ffd875; font-weight: bold; letter-spacing: 0.15em;">${esc(registrationCode)}</td>
        </tr>
        ${
          teamName
            ? `<tr>
                <td style="padding: 6px 0; font-size: 13px; color: rgba(236,228,210,0.6);">GUILD / TEAM:</td>
                <td style="padding: 6px 0; font-size: 14px; color: #ffffff; font-weight: bold;">${esc(teamName)} ${
                isTeamLeader ? '<span style="color:#6ee7b7; font-size:11px;">[LEADER]</span>' : ""
              }</td>
              </tr>`
            : ""
        }
        ${
          teamCode
            ? `<tr>
                <td style="padding: 6px 0; font-size: 13px; color: rgba(236,228,210,0.6);">TEAM CODE:</td>
                <td style="padding: 6px 0; font-family: 'Courier New', monospace; font-size: 15px; color: #6ee7b7; font-weight: bold; letter-spacing: 0.15em;">${esc(teamCode)}</td>
              </tr>`
            : ""
        }
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: rgba(236,228,210,0.6);">LOCATION:</td>
          <td style="padding: 6px 0; font-size: 13px; color: #ece4d2;">${esc(venue)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: rgba(236,228,210,0.6);">DATES:</td>
          <td style="padding: 6px 0; font-size: 13px; color: #ece4d2;">${esc(schedule)}</td>
        </tr>
      </table>
    </div>

    ${
      isPaidEvent
        ? `<div style="margin: 20px 0; padding: 16px 20px; background: rgba(217,164,65,0.06); border-left: 3px solid #ffd875;">
      <p style="margin: 0 0 6px; font-family: 'Courier New', Courier, monospace; font-size: 11px; font-weight: bold; color: #ffd875; letter-spacing: 0.15em; text-transform: uppercase;">
        ENTRY FEE
      </p>
      <p style="margin: 0; font-size: 13px; line-height: 22px; color: #ece4d2;">
        ${
          isPayer
            ? `Enter your registration ID <strong>${esc(registrationCode)}</strong> on the payment page to pay the fee${teamName ? " for your whole team" : ""}. Your entry is confirmed once the payment is verified.`
            : "Your team leader pays the fee for the whole team with their registration ID. Your entry is confirmed once it's verified."
        }
      </p>
    </div>`
        : ""
    }

    <!-- Checkpoint pass instructions -->
    <div style="margin: 20px 0; padding: 16px 20px; background: rgba(217,164,65,0.06); border-left: 3px solid #6ee7b7;">
      <p style="margin: 0 0 6px; font-family: 'Courier New', Courier, monospace; font-size: 11px; font-weight: bold; color: #6ee7b7; letter-spacing: 0.15em; text-transform: uppercase;">
        VENUE ENTRY INSTRUCTIONS
      </p>
      <p style="margin: 0; font-size: 13px; line-height: 22px; color: #ece4d2;">
        Ensure your <strong>Personal Dossier</strong> is 100% complete in your profile dashboard to generate your <strong>Celestial QR Checkpoint Pass</strong>. You must present this QR code at the festival gates.
      </p>
    </div>

    <p style="margin: 20px 0 0; font-size: 12px; line-height: 20px; color: rgba(236,228,210,0.45); font-style: italic; text-align: center;">
      This is an automated festival dispatch. Please do not reply directly to this transmission.
    </p>
  `;

  return getEmailLayout({
    previewText: `Registration Confirmed: ${eventName} — Eclecia'27`,
    badge: "REGISTRATION SANCTIONED",
    headline: "Arena Registration Confirmed",
    subheadline: `You are enlisted for ${eventName} at Eclecia'27.`,
    content,
    actionButton: {
      label: "View Pass & Dossier",
      url: profileUrl,
    },
    footerNote: "Eclecia'27 &bull; Heritage Institute of Technology &bull; 15–17 January 2027",
    siteUrl,
  });
}
