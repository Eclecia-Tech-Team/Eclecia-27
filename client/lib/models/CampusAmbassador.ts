import mongoose, { Schema, model, models } from "mongoose";

export interface ICampusAmbassador {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  college: string;
  graduationYear: number;
  ambassadorCode: string;
  status: "active" | "pending" | "suspended";
  referralCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICampusAmbassadorDocument extends ICampusAmbassador, mongoose.Document {
  _id: mongoose.Types.ObjectId;
}

const campusAmbassadorSchema = new Schema<ICampusAmbassadorDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    college: {
      type: String,
      required: true,
      trim: true,
    },
    graduationYear: {
      type: Number,
      required: true,
      min: 2024,
      max: 2032,
    },
    ambassadorCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "pending", "suspended"],
      default: "active",
    },
    referralCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const CampusAmbassador =
  models.CampusAmbassador ??
  model<ICampusAmbassadorDocument>("CampusAmbassador", campusAmbassadorSchema);

export default CampusAmbassador;
