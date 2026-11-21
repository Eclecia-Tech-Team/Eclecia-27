import mongoose, { Schema, model, models } from "mongoose";

/**
 * A notice on an event page: schedule changes, venue moves, results, reminders.
 * `eventId` null = shown on every event page (fest-wide notice).
 */
export interface IEventNotice {
  eventId: mongoose.Types.ObjectId | null;
  title: string;
  body: string;
  /** important: highlighted; update: changes to timing/venue/rules; info: everything else. */
  tone: "info" | "update" | "important";
  /** Pinned notices sort first. */
  pinned: boolean;
  /** Hidden from the page after this moment, if set. */
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const NOTICE_TONES = ["info", "update", "important"] as const;

const eventNoticeSchema = new Schema<IEventNotice>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", default: null, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    tone: { type: String, enum: NOTICE_TONES, default: "info" },
    pinned: { type: Boolean, default: false },
    expiresAt: { type: Date },
  },
  { timestamps: true },
);

const EventNotice = models.EventNotice ?? model<IEventNotice>("EventNotice", eventNoticeSchema);

export default EventNotice;
