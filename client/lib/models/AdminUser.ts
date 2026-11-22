import mongoose, { Schema, model, models } from "mongoose";
import bcrypt from "bcryptjs";
import { ADMIN_AREAS, ADMIN_ROLES, type AdminArea, type AdminRole } from "@/lib/admin/access";

/**
 * Panel accounts. Separate from festival users on purpose: an admin invite
 * never turns a participant account into a staff one, and vice versa.
 */
export interface IAdminUser {
  _id: mongoose.Types.ObjectId;
  email: string;
  role: AdminRole;
  /** Only used by the "custom" role. */
  areas: AdminArea[];
  invitedBy: string;
  passwordHash: string | null;
  passwordSetAt: Date | null;
  /** Bumped on sign-out and password reset: every older session cookie stops working. */
  sessionVersion: number;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAdminUserDocument extends Omit<IAdminUser, "_id">, mongoose.Document {
  _id: mongoose.Types.ObjectId;
  comparePassword(candidate: string): Promise<boolean>;
}

const adminUserSchema = new Schema<IAdminUserDocument>(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    role: { type: String, enum: ADMIN_ROLES, required: true },
    areas: { type: [String], enum: ADMIN_AREAS, default: [] },
    invitedBy: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, default: null },
    passwordSetAt: { type: Date, default: null },
    sessionVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

adminUserSchema.methods.comparePassword = async function (candidate: string) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidate, this.passwordHash);
};

const AdminUser = models.AdminUser ?? model<IAdminUserDocument>("AdminUser", adminUserSchema);

export default AdminUser;
