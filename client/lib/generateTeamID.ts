import crypto from "crypto";

/**
 * Utility: Generates a 6-character alphanumeric code without ambiguous characters
 */
const generateCode = (): string => {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(8);
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(bytes[i] % chars.length);
  }
  return result;
};

export default generateCode;
