import { Schema, model, models } from "mongoose";

/**
 * Who did what in the admin panel: payments verified, check-ins undone, roles
 * changed, mail sent. Kept 180 days.
 */
export interface IAdminAction {
  by: string;
  action: string;
  target: string;
  detail: string;
  createdAt: Date;
}

const adminActionSchema = new Schema<IAdminAction>({
  by: { type: String, required: true },
  action: { type: String, required: true },
  target: { type: String, default: "" },
  detail: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now, index: { expires: 60 * 60 * 24 * 180 } },
});

const AdminAction = models.AdminAction ?? model<IAdminAction>("AdminAction", adminActionSchema);

export default AdminAction;
