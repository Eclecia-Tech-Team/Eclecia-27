/**
 * Add someone to the admin panel from the terminal (no master key needed).
 *
 *   bun run admin:add you@example.com            # role: admin
 *   bun run admin:add helper@example.com volunteer
 *   bun run admin:add --list
 *
 * They sign in at /admin/login with that email and choose a password; an
 * emailed code confirms it's them.
 */
import mongoose from "mongoose";
import AdminUser from "../lib/models/AdminUser";
import { ADMIN_ROLES, isAdminRole } from "../lib/admin/access";

const [arg, roleArg = "admin"] = process.argv.slice(2);
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not set (expected in .env.local)");

await mongoose.connect(uri);
try {
  if (!arg || arg === "--help") {
    console.log(`Usage: bun run admin:add <email> [${ADMIN_ROLES.join("|")}]   |   bun run admin:add --list`);
  } else if (arg === "--list") {
    const admins = await AdminUser.find().select("email role passwordSetAt").lean<{ email: string; role: string; passwordSetAt?: Date | null }[]>();
    for (const a of admins) console.log(`${a.role.padEnd(10)} ${a.email}${a.passwordSetAt ? "" : "  (hasn't signed in yet)"}`);
    if (!admins.length) console.log("No admins yet.");
  } else {
    const email = arg.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`"${arg}" isn't an email address`);
    if (!isAdminRole(roleArg) || roleArg === "custom") throw new Error(`Role must be one of: admin, volunteer, viewer (custom roles: use the panel)`);
    const existing = await AdminUser.findOne({ email });
    if (existing) {
      existing.role = roleArg;
      await existing.save();
      console.log(`Updated ${email} → ${roleArg}`);
    } else {
      await AdminUser.create({ email, role: roleArg, areas: [], invitedBy: "cli" });
      console.log(`Added ${email} as ${roleArg}. They sign in at /admin/login.`);
    }
  }
} finally {
  await mongoose.disconnect();
}
