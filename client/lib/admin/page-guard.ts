import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin/session";
import { can, canManageAdmins, canSeeOverview, homeFor, type AdminArea, type AdminIdentity } from "@/lib/admin/access";

/** For panel pages: the admin, or off to sign-in / their home if this area isn't theirs. */
export async function requireArea(area: AdminArea | "admins" | "overview", write = false): Promise<AdminIdentity> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  const allowed = area === "overview" ? canSeeOverview(admin) : area === "admins" ? canManageAdmins(admin) : can(admin, area, write);
  if (!allowed) redirect(homeFor(admin));
  return admin;
}

/** First value of a search param that may arrive repeated (?q=a&q=b). */
export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
