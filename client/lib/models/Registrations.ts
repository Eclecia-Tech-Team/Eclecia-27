import { IRegistration } from "@/types/interface";
import mongoose, { model, Schema, models, Document } from "mongoose";

export interface IRegistrationDocument extends IRegistration, Document {
  _id: mongoose.Types.ObjectId;
}

const registrationSchema = new Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    isInTeam: {
      type: Boolean,
      required: true,
      default: false,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
    },
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    verified: {
      type: Boolean,
      required: true,
      default: false,
    },
    checkedIn: {
      type: Boolean,
      required: true,
      default: false,
    },
    checkedInAt: {
      type: Date,
    },
    // Who scanned them in: an AdminUser id (absent for master-key sessions), plus the email for the record.
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
    },
    checkedInByEmail: {
      type: String,
    },
    foodServedCount: {
      type: Number,
      required: true,
      default: 0,
    },
    lastFoodServedAt: {
      type: Date,
    },
    referredByCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
  },
  { timestamps: true }
);

// One entry per person per event; also the guard against double-submits.
registrationSchema.index({ eventId: 1, participant: 1 }, { unique: true });

const Registration =
  models.Registration ||
  model<IRegistrationDocument>("Registration", registrationSchema);

export default Registration;
