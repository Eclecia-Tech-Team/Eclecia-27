import crypto from "crypto";

const QR_PREFIX = "eclecia-profile";

/** Same secret as sessions. No fallback: a guessable key would let anyone forge passes. */
function getSigningSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('Missing environment variable: "AUTH_SECRET"');
  return secret;
}

function createSignature(userId: string): string {
  return crypto.createHmac("sha256", getSigningSecret()).update(userId).digest("hex");
}

export function buildProfileQrPayload(userId: string): string {
  return `${QR_PREFIX}:${userId}:${createSignature(userId)}`;
}

/** The user id inside a pass QR, or null if it isn't a genuine one. */
export function parseAndVerifyProfileQrPayload(payload: string): string | null {
  if (!payload || typeof payload !== "string") return null;

  const [prefix, userId, providedSignature] = payload.split(":");
  if (prefix !== QR_PREFIX || !userId || !providedSignature) return null;

  const expected = Buffer.from(createSignature(userId), "hex");
  const provided = Buffer.from(providedSignature, "hex");
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) return null;

  return userId;
}
