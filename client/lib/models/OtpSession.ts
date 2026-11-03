import { Schema, model, models } from "mongoose";

/**
 * Pending email OTPs, keyed by email + browser device id. Lives in Mongo (not
 * process memory) so it survives serverless cold starts and multiple instances;
 * the TTL index drops expired rows on its own.
 */
const otpSessionSchema = new Schema({
  key: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  otpHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

const OtpSession = models.OtpSession ?? model("OtpSession", otpSessionSchema);

export default OtpSession;
