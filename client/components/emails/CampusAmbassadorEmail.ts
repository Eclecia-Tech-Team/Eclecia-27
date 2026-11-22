import { esc, getEmailLayout } from "./EmailLayout";

interface CampusAmbassadorEmailProps {
  name: string;
  college: string;
  graduationYear: number;
  ambassadorCode: string;
}

/**
 * Celestial Campus Ambassador Welcome & Credential Template
 * Sent to users immediately after joining the Ambassador Guild.
 */
export function getCampusAmbassadorEmailHtml({
  name,
  college,
  graduationYear,
  ambassadorCode,
}: CampusAmbassadorEmailProps): string {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.eclecia-hitk.in"
  ).replace(/\/+$/, "");
  const camUrl = `${siteUrl}/cam`;

  const content = `
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 26px; color: #ece4d2;">
      Greetings, <strong style="color: #ffd875;">${esc(name)}</strong>.
    </p>

    <p style="margin: 0 0 20px; font-size: 15px; line-height: 26px; color: rgba(236,228,210,0.85);">
      You have officially been inducted into the <strong style="color: #ffd875;">Celestial Ambassador Guild</strong> of Eclecia'27. As our appointed emissary representing <strong>${esc(college)}</strong> (Batch of ${graduationYear}), you hold the mantle to lead your campus and champion our cultural movement.
    </p>

    <!-- Ambassador Code Box -->
    <div style="margin: 28px 0; padding: 24px; border: 1px solid rgba(217, 164, 65, 0.4); background: linear-gradient(180deg, rgba(19, 17, 13, 0.95) 0%, rgba(10, 11, 13, 0.98) 100%); text-align: center;">
      <p style="margin: 0 0 8px; font-size: 10px; font-weight: 600; letter-spacing: 0.28em; text-transform: uppercase; color: rgba(217,164,65,0.85);">
        Your Official Ambassador Code
      </p>
      <p style="margin: 0 0 12px; font-family: 'Courier New', Courier, monospace; font-size: 28px; font-weight: bold; letter-spacing: 0.22em; color: #ffd875;">
        ${esc(ambassadorCode)}
      </p>
      <p style="margin: 0; font-size: 13px; line-height: 20px; color: rgba(236,228,210,0.65);">
        Share this code with your college peers during their event registrations. Every participant entering your code will be credited directly to your ambassador record.
      </p>
    </div>

    <!-- Ambassador Privileges -->
    <div style="margin: 24px 0 28px; padding: 20px 24px; border-left: 2px solid #d9a441; background: rgba(217, 164, 65, 0.05);">
      <p style="margin: 0 0 12px; font-size: 11px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: #ffd875;">
        Celestial Privileges & Honours
      </p>
      <ul style="margin: 0; padding-left: 18px; font-size: 14px; line-height: 24px; color: rgba(236,228,210,0.8);">
        <li style="margin-bottom: 6px;"><strong>Certificate of Excellence:</strong> Official certification from Heritage Institute of Technology, Kolkata.</li>
        <li style="margin-bottom: 6px;"><strong>Exclusive Gifts & Hampers:</strong> Unlock exclusive hampers, gifts, and branded keepsakes.</li>
        <li style="margin-bottom: 6px;"><strong>Leadership Recognition:</strong> Distinctive campus leadership spotlight and networking opportunities with the central organizing team.</li>
        <li><strong>Performance Rewards:</strong> Unlock rewards, trophies, and commendations based on campus outreach and participation.</li>
      </ul>
    </div>

    <p style="margin: 0 0 20px; font-size: 14px; line-height: 24px; color: rgba(236,228,210,0.7);">
      Access your live ambassador dashboard at any time to copy or share your credentials with your campus peers.
    </p>
  `;

  return getEmailLayout({
    previewText: `Your Eclecia'27 Ambassador Code: ${ambassadorCode}`,
    badge: "EMISSARY CREDENTIAL",
    headline: "Welcome to the Celestial Guild",
    subheadline: `Official Appointment · ${college} · Eclecia'27`,
    content,
    actionButton: {
      label: "Open Ambassador Pass",
      url: camUrl,
    },
    footerNote: "Eclecia'27 Celestial Ambassador Guild",
  });
}
