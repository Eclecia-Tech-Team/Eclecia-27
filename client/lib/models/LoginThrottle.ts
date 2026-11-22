import { Schema, model, models } from "mongoose";

/**
 * Failed sign-in counters for the admin panel, keyed per email+IP and per IP.
 * Mongo (not memory) so every server instance sees the same counts; rows
 * expire on their own when the window ends.
 */
const loginThrottleSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

const LoginThrottle = models.LoginThrottle ?? model("LoginThrottle", loginThrottleSchema);

export default LoginThrottle;
