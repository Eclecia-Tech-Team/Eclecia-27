import { ASSETS } from "@/constants/assets";

interface EmailLayoutProps {
  previewText?: string;
  badge?: string;
  headline: string;
  subheadline?: string;
  content: string;
  actionButton?: {
    label: string;
    url: string;
  };
  footerNote?: string;
  siteUrl?: string;
}

/**
 * Base celestial-themed HTML email layout.
 * Optimized for broad email client support (Gmail, Outlook, Apple Mail, mobile).
 * Features Eclecia's gold (#d9a441) and parchment (#ece4d2) architectural palette on obsidian/black (#07090c).
 */
/** Escape text for HTML. Every name, title and team that reaches an email goes through this. */
export const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function getEmailLayout({
  previewText = "Eclecia'27 — The Annual Cultural Festival of Heritage Institute of Technology",
  badge = "OFFICIAL DISPATCH",
  headline,
  subheadline,
  content,
  actionButton,
  footerNote = "All celestial events, competitions, and stage showcases are now officially live.",
  siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.eclecia-hitk.in").replace(/\/+$/, ""),
}: EmailLayoutProps): string {
  const ecleciaLogo = ASSETS.cloudinary.ecleciaLogo;
  const hitkLogo = ASSETS.cloudinary.hitkLogo;
  const dividerImg = ASSETS.cloudinary.divider;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="dark only">
  <meta name="supported-color-schemes" content="dark only">
  <title>${esc(headline)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset & Base Styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #030406;
      color: #ece4d2;
      font-family: 'Georgia', 'Times New Roman', serif;
    }
    /* Mobile responsive adjustments */
    @media screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
      }
      .mobile-padding {
        padding-left: 18px !important;
        padding-right: 18px !important;
      }
      .headline-text {
        font-size: 26px !important;
        line-height: 32px !important;
      }
      .otp-code {
        font-size: 32px !important;
        letter-spacing: 0.3em !important;
      }
      .button-cell {
        width: 100% !important;
        display: block !important;
      }
      .button-link {
        display: block !important;
        width: auto !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 8px; background-color: #030406; color: #ece4d2; -webkit-font-smoothing: antialiased;">
  <!-- Hidden Preheader Preview Text -->
  <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    ${esc(previewText)}
    &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;
  </div>

  <!-- Main Outer Container -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="padding: 10px 0 20px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;" class="email-container">
          
          <!-- Outer Double Golden Chamber Border -->
          <tr>
            <td style="background: #080b0f; border: 1px solid #d9a441; box-shadow: 0 10px 40px rgba(0,0,0,0.9), 0 0 25px rgba(217,164,65,0.15); border-radius: 4px; overflow: hidden; position: relative;">
              
              <!-- Top Architectural Header Strip -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding: 24px 28px 16px; border-bottom: 1px solid rgba(217,164,65,0.25); background: linear-gradient(180deg, #10161f 0%, #080b0f 100%);" class="mobile-padding">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <!-- Left: Eclecia & HITK Marks -->
                        <td align="left" style="vertical-align: middle;">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="vertical-align: middle; padding-right: 12px;">
                                <a href="${siteUrl}" target="_blank" style="text-decoration: none;">
                                  <img src="${ecleciaLogo}" alt="Eclecia'27" width="46" height="46" style="display: block; border: 0; object-fit: contain;">
                                </a>
                              </td>
                              <td style="vertical-align: middle; width: 1px; height: 32px; background-color: rgba(217,164,65,0.35);"></td>
                              <td style="vertical-align: middle; padding-left: 12px;">
                                <a href="https://www.heritageit.edu" target="_blank" style="text-decoration: none;">
                                  <img src="${hitkLogo}" alt="Heritage Institute of Technology" width="40" height="40" style="display: block; border: 0; object-fit: contain;">
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>

                        <!-- Right: Festival Details & Year -->
                        <td align="right" style="vertical-align: middle;">
                          <p style="margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #d9a441; letter-spacing: 0.25em; text-transform: uppercase;">
                            ECLECIA'27
                          </p>
                          <p style="margin: 3px 0 0; font-family: 'Georgia', serif; font-size: 11px; color: rgba(236,228,210,0.6); letter-spacing: 0.1em;">
                            15–17 JAN 2027
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Main Body Content Section -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding: 32px 32px 24px;" class="mobile-padding">
                    
                    <!-- Celestial Dispatch Badge -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin-bottom: 20px;">
                      <tr>
                        <td style="border: 1px solid rgba(217,164,65,0.4); background-color: rgba(217,164,65,0.08); padding: 4px 14px; text-align: center;">
                          <span style="font-family: 'Courier New', Courier, monospace; font-size: 10px; font-weight: bold; letter-spacing: 0.25em; color: #ffd875; text-transform: uppercase;">
                            ${esc(badge)}
                          </span>
                        </td>
                      </tr>
                    </table>

                    <!-- Headline Title -->
                    <h1 class="headline-text" style="margin: 0 0 10px; text-align: center; font-family: 'Georgia', 'Times New Roman', serif; font-size: 30px; font-weight: normal; line-height: 38px; color: #ffffff; letter-spacing: 0.04em;">
                      ${esc(headline)}
                    </h1>

                    <!-- Subheadline (if provided) -->
                    ${
                      subheadline
                        ? `<p style="margin: 0 0 20px; text-align: center; font-family: 'Georgia', serif; font-size: 15px; line-height: 24px; color: rgba(217,164,65,0.85); font-style: italic;">
                            ${esc(subheadline)}
                          </p>`
                        : ""
                    }

                    <!-- Center Ornamental Lotus Divider -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 18px 0 24px;">
                      <tr>
                        <td align="center" style="vertical-align: middle;">
                          <img src="${dividerImg}" alt="" width="180" height="18" style="display: block; border: 0; opacity: 0.75; max-width: 100%;">
                        </td>
                      </tr>
                    </table>

                    <!-- Rich Content Block -->
                    <div style="font-family: 'Georgia', 'Times New Roman', serif; font-size: 15px; line-height: 26px; color: #ece4d2;">
                      ${content}
                    </div>

                    <!-- Action Button (Optional CTA) -->
                    ${
                      actionButton
                        ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 32px 0 12px;">
                            <tr>
                              <td align="center">
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td class="button-cell" align="center" style="background: linear-gradient(135deg, #d9a441 0%, #ffd875 50%, #d9a441 100%); border: 1px solid #ffd875; box-shadow: 0 0 20px rgba(217,164,65,0.4);">
                                      <a href="${actionButton.url}" target="_blank" class="button-link" style="display: inline-block; padding: 13px 32px; font-family: 'Georgia', serif; font-size: 13px; font-weight: bold; color: #080b0f; text-decoration: none; text-transform: uppercase; letter-spacing: 0.2em; text-align: center;">
                                        ${actionButton.label} &rarr;
                                      </a>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>`
                        : ""
                    }

                  </td>
                </tr>
              </table>

              <!-- Celestial Footer Framing -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding: 24px 28px 28px; background: #05070a; border-top: 1px solid rgba(217,164,65,0.2); text-align: center;" class="mobile-padding">
                    
                    <p style="margin: 0 0 12px; font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #ffd875; letter-spacing: 0.15em; text-transform: uppercase;">
                      ${footerNote}
                    </p>

                    <p style="margin: 0 0 16px; font-family: 'Georgia', serif; font-size: 12px; line-height: 20px; color: rgba(236,228,210,0.55);">
                      Heritage Institute of Technology, Kolkata &bull; 994, Chowbaga Rd, Anandapur, East Kolkata Twp, Kolkata 700107
                    </p>

                    <div style="margin: 14px 0 0; padding-top: 14px; border-top: 1px solid rgba(217,164,65,0.12);">
                      <p style="margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 10px; color: rgba(217,164,65,0.5); letter-spacing: 0.18em; text-transform: uppercase;">
                        This is an automated festival dispatch. Please do not reply directly to this transmission.
                      </p>
                    </div>

                  </td>
                </tr>
              </table>

            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
