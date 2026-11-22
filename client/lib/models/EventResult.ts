import mongoose, { Schema, model, models } from "mongoose";

import { PLACE_LABEL, RESULT_PLACES, type ResultPlace } from "@/lib/admin/result-places";

export { PLACE_LABEL, RESULT_PLACES, type ResultPlace };

export interface IResultEntry {
  place: ResultPlace;
  /** Team name for team events; empty for solo. */
  teamName?: string;
  teamId?: mongoose.Types.ObjectId;
  names: string[];
  note?: string;
}

/** One event's podium. Shown on the event page once published. */
export interface IEventResult {
  eventId: mongoose.Types.ObjectId;
  entries: IResultEntry[];
  isPublished: boolean;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const entrySchema = new Schema(
  {
    place: { type: String, enum: RESULT_PLACES, required: true },
    teamName: { type: String, trim: true, maxlength: 60 },
    teamId: { type: Schema.Types.ObjectId, ref: "Team" },
    names: { type: [String], default: [] },
    note: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false },
);

const eventResultSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true, unique: true },
    entries: { type: [entrySchema], default: [] },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const EventResult = models.EventResult ?? model<IEventResult>("EventResult", eventResultSchema);

export default EventResult;
