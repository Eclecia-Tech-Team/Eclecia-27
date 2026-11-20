import { getEmailLayout } from "./EmailLayout";

interface CustomAnnouncementEmailProps {
  headline: string;
  subheadline?: string;
  badge?: string;
  messageHtml: string;
  actionButton?: {
    label: string;
    url: string;
  };
}

/**
 * Celestial Broadcast / Custom Announcement Template
 * Used by admin/team dispatches to announce live updates, schedule drops, and stage line-ups.
 */
export function getCustomAnnouncementEmailHtml({
  headline,
  subheadline,
  badge = "CELESTIAL TRANSMISSION",
  messageHtml,
  actionButton,
}: CustomAnnouncementEmailProps): string {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.eclecia-hitk.in").replace(/\/+$/, "");

  const content = `
    <div style="margin: 0 0 20px; font-size: 15px; line-height: 26px; color: #ece4d2;">
      ${messageHtml}
    </div>

    <p style="margin: 24px 0 0; font-size: 12px; line-height: 20px; color: rgba(236,228,210,0.45); font-style: italic; text-align: center;">
      This is an automated festival dispatch. Please do not reply directly to this transmission.
    </p>
  `;

  return getEmailLayout({
    previewText: `${headline} — Eclecia'27 Dispatch`,
    badge,
    headline,
    subheadline,
    content,
    actionButton,
    footerNote: "Eclecia'27 &bull; Heritage Institute of Technology &bull; 15–17 January 2027",
    siteUrl,
  });
}
