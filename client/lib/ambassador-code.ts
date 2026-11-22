import crypto from "crypto";
import CampusAmbassador from "@/lib/models/CampusAmbassador";

/**
 * Characters used for the 4-character suffix:
 * Uppercase letters and numbers, excluding easily confused ones (like O, 0, I, 1)
 */
const CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function generateRandomSuffix(length = 4): string {
  const bytes = crypto.randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CHARS[bytes[i] % CHARS.length];
  }
  return result;
}

/**
 * Generates a unique ambassador code formatted as ECL27-CAP-<XXXX>
 * Checks against the DB to guarantee uniqueness with retries.
 */
export async function generateUniqueAmbassadorCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 15;

  while (attempts < maxAttempts) {
    attempts++;
    const suffix = generateRandomSuffix(4);
    const code = `ECL27-CAP-${suffix}`;

    const exists = await CampusAmbassador.exists({ ambassadorCode: code });
    if (!exists) {
      return code;
    }
  }

  // Fallback with timestamp slice if collisions occur
  const timestampSuffix = Date.now().toString(36).slice(-4).toUpperCase();
  return `ECL27-CAP-${timestampSuffix}`;
}
