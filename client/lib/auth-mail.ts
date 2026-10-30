import { Resend } from "resend";

const from = process.env.MAIL_FROM ?? "Eclecia'27 <onboarding@resend.dev>";
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function layout(body: string) {
  return `<!doctype html><html><body style="margin:0;background:#0b0906;padding:32px 16px;font-family:Georgia,serif;color:#f1e6cf">
  <div style="max-width:480px;margin:0 auto;border:1px solid #d9a441;padding:32px;text-align:center">
    <p style="margin:0 0 4px;letter-spacing:.3em;font-size:12px;color:#d9a441">ECLECIA'27</p>
    ${body}
    <p style="margin:28px 0 0;font-size:12px;color:#a89a80">Heritage Institute of Technology, Kolkata · 15-17 January 2027</p>
  </div></body></html>`;
}

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

function otpHtml(heading: string, otp: string) {
  return layout(`<h1 style="font-weight:normal;font-size:24px;margin:12px 0">${heading}</h1>
    <p style="font-size:34px;letter-spacing:.4em;color:#d9a441;margin:20px 0">${otp}</p>
    <p style="font-size:14px;color:#cbbd9f">This code expires in 10 minutes. If you didn't ask for it, ignore this email.</p>`);
}

export async function sendOtpEmail(to: string, otp: string) {
  return send(to, "Your Eclecia'27 verification code", otpHtml("Verify your email", otp), `otp=${otp}`);
}

export async function sendPasswordResetOtpEmail(to: string, otp: string) {
  return send(to, "Reset your Eclecia'27 password", otpHtml("Reset your password", otp), `otp=${otp}`);
}

export async function sendWelcomeEmail(to: string) {
  return send(
    to,
    "Welcome to Eclecia'27",
    layout(`<h1 style="font-weight:normal;font-size:24px;margin:12px 0">You're in.</h1>
      <p style="font-size:15px;color:#cbbd9f">Your account is ready. Event registrations open soon; we'll write when they do.</p>`),
    "welcome",
  );
}
