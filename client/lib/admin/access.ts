/**
 * Admin roles and what each may do. No server imports: the panel's client
 * components use this too, to hide what a role can't touch.
 */

export const ADMIN_ROLES = ["admin", "volunteer", "viewer", "custom"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_AREAS = ["events", "notices", "registrations", "checkin", "participants", "mail", "results"] as const;
export type AdminArea = (typeof ADMIN_AREAS)[number];

export const ROLE_INFO: Record<AdminRole, { label: string; blurb: string }> = {
  admin: { label: "Admin", blurb: "Everything, including inviting and removing admins." },
  volunteer: { label: "Volunteer", blurb: "Check-in desk only: scan passes, issue food." },
  viewer: { label: "Viewer", blurb: "Can look at everything, change nothing." },
  custom: { label: "Custom", blurb: "Full control of the areas you pick, nothing else." },
};

export const AREA_INFO: Record<AdminArea, string> = {
  events: "Events",
  notices: "Notices",
  registrations: "Registrations",
  checkin: "Check-in",
  participants: "Participants",
  mail: "Mail",
  results: "Results",
};

export interface AdminIdentity {
  id: string;
  email: string;
  role: AdminRole | "master";
  areas: AdminArea[];
}

/** May this admin read (or, with write, change) this area? */
export function can(who: Pick<AdminIdentity, "role" | "areas">, area: AdminArea, write = false): boolean {
  switch (who.role) {
    case "master":
    case "admin":
      return true;
    case "volunteer":
      return area === "checkin";
    case "viewer":
      // Read-only, and nothing that would let them act on people's inboxes.
      return !write && area !== "mail" && area !== "checkin";
    case "custom":
      return who.areas.includes(area);
    default:
      return false;
  }
}

/** Fest-wide numbers: everyone who can read registrations. */
export const canSeeOverview = (who: Pick<AdminIdentity, "role" | "areas">) => can(who, "registrations");

/** Where an admin lands: the overview if they may see it, else their first area. */
export function homeFor(who: Pick<AdminIdentity, "role" | "areas">): string {
  if (canSeeOverview(who)) return "/admin";
  const first = ADMIN_AREAS.find((a) => can(who, a));
  return first ? `/admin/${first}` : "/admin/login";
}

/** Only admins (and the master key) manage the admin list. */
export const canManageAdmins = (who: Pick<AdminIdentity, "role">) => who.role === "admin" || who.role === "master";

export const isAdminRole = (r: unknown): r is AdminRole => ADMIN_ROLES.includes(r as AdminRole);
export const pickAreas = (v: unknown): AdminArea[] =>
  Array.isArray(v) ? ADMIN_AREAS.filter((a) => v.includes(a)) : [];
