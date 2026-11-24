import { IEvent } from "@/types/interface";
import mongoose, { model, Schema } from "mongoose";
import { models } from "mongoose";
import { EVENT_CATEGORIES } from "@/constants/event-categories";

export interface IEventDocument extends IEvent, mongoose.Document {
  _id: mongoose.Types.ObjectId;
}

export { EVENT_CATEGORIES };

const eventSchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    eventName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    category: {
      type: String,
      enum: EVENT_CATEGORIES,
      required: true,
    },
    kind: {
      type: String,
      trim: true,
    },
    duration: {
      type: String,
      required: true,
    },
    venue: {
      type: String,
      required: true,
    },
    // Structured schedule (fest time, IST). Day and time text is built from
    // these when read (whenText in constants/schedule.ts); `duration` and
    // `venue` above are derived on save (lib/admin/event-input.ts). All null
    // until announced.
    /** Fest day, "2027-01-16". */
    scheduleDate: {
      type: String,
      default: null,
    },
    /** "14:30", 24-hour IST. */
    startTime: {
      type: String,
      default: null,
    },
    /** "16:00", 24-hour IST; after startTime. */
    endTime: {
      type: String,
      default: null,
    },
    /** Id from VENUES (constants/schedule.ts); null = TBA or a free-text `venue`. */
    venueId: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    banner: {
      type: String,
      default: "",
    },
    rules: {
      type: [String],
      default: [],
    },
    clubs: {
      type: [String],
      default: [],
    },
    isTeamEvent: {
      type: Boolean,
      required: true,
      default: false,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: false,
    },
    doc: {
      type: String,
    },
    pocs: [
      {
        name: {
          type: String,
          required: true,
        },
        mobile: {
          type: String,
          required: true,
        },
      },
    ],
    maxMembersPerTeam: {
      type: Number,
      required: true,
    },
    minMembersPerTeam: {
      type: Number,
      required: true,
    },
    teamLimit: {
      type: Number,
    },
    isPaidEvent: {
      type: Boolean,
      required: true,
    },
    isFoodProvided: {
      type: Boolean,
      required: true,
      default: false,
    },
    maxFoodServingsPerParticipant: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    fees: {
      type: Number,
      default: 0,
    },
    prizePool: {
      type: String,
      default: "TBD",
    },
    registrations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Registration",
      },
    ],
  },
  { timestamps: true },
);

const Event = models.Event ?? model<IEventDocument>("Event", eventSchema);

export default Event;
