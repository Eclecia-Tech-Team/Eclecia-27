import { getEmailLayout } from "./EmailLayout";

interface OtpEmailProps {
  otp: string;
  type?: "verification" | "reset";
  email?: string;
}

/**
 * Celestial OTP Email Template
 * Used for email verification during sign up and password reset requests.
 * Features a bold celestial verification vault with copyable OTP characters.
 */
export function getOtpEmailHtml({ otp, type = "verification" }: OtpEmailProps): string {
  const isReset = type === "reset";
  const badge = isReset ? "SECURITY KEY RESET" : "ACCOUNT VERIFICATION";
  const headline = isReset ? "Reset Your Celestial Key" : "Verify Your Citizen Identity";
  const subheadline = isReset
    ? "A password reset token was requested for your festival pass."
    : "Enter the following verification key to activate your festival registry.";

  const content = `
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 26px; text-align: center; color: rgba(236,228,210,0.85);">
      ${
        isReset
          ? "Use the single-use authorization cipher below to establish a new password for your Eclecia'27 account."
          : "Use the single-use authorization cipher below to complete your registration and unlock access to the Eclecia'27 event arena."
      }
    </p>

    <!-- Cipher Vault Box with Golden Frame -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
      <tr>
        <td align="center">
          <div style="display: inline-block; padding: 20px 36px; background: #0c1117; border: 2px solid #d9a441; box-shadow: 0 0 25px rgba(217,164,65,0.25), inset 0 0 15px rgba(217,164,65,0.08); text-align: center;">
            <p style="margin: 0 0 6px; font-family: 'Courier New', Courier, monospace; font-size: 11px; letter-spacing: 0.3em; color: rgba(217,164,65,0.8); text-transform: uppercase;">
              AUTHORIZATION CIPHER
            </p>
            <p class="otp-code" style="margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: bold; letter-spacing: 0.35em; color: #ffd875; text-shadow: 0 0 16px rgba(217,164,65,0.6);">
              ${otp}
            </p>
          </div>
        </td>
      </tr>
    </table>

    <!-- Expiration & Security Warnings -->
    <div style="margin: 20px 0 0; padding: 14px 18px; background: rgba(217,164,65,0.04); border-left: 2px solid rgba(217,164,65,0.4); text-align: left;">
      <p style="margin: 0 0 6px; font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #ffd875; letter-spacing: 0.15em; text-transform: uppercase;">
        SECURITY PROTOCOL
      </p>
      <p style="margin: 0 0 6px; font-size: 13px; line-height: 20px; color: rgba(236,228,210,0.7);">
        &bull; This verification cipher expires in <strong>${isReset ? "15" : "10"} minutes</strong>.
      </p>
      <p style="margin: 0; font-size: 13px; line-height: 20px; color: rgba(236,228,210,0.7);">
        &bull; If you did not initiate this request, you may safely ignore this transmission. Your account credentials remain secure.
      </p>
    </div>

    <!-- Notice on automated mail -->
    <p style="margin: 22px 0 0; font-size: 12px; line-height: 20px; color: rgba(236,228,210,0.45); font-style: italic; text-align: center;">
      This is an automated system transmission. Please do not reply directly to this email.
    </p>
  `;

  return getEmailLayout({
    previewText: `Your Eclecia'27 ${isReset ? "password reset" : "verification"} code: ${otp}`,
    badge,
    headline,
    subheadline,
    content,
    footerNote: "Eclecia'27 &bull; Heritage Institute of Technology &bull; 15–17 January 2027",
  });
}
