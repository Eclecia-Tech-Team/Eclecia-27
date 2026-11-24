import type { EventPageData } from "@/lib/event-page";

export type PageEvent = EventPageData["event"];

const TBA = new Set(["", "tba", "tbd", "to be announced"]);

/** False for empty / "TBA" / "TBD" values the panel stores before details are fixed. */
export const known = (value?: string | null): value is string => Boolean(value) && !TBA.has(value!.trim().toLowerCase());

export const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export const postedOn = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));

/** Indian mobile numbers as "+91 98765 43210"; anything else unchanged. */
export function phone(raw: string) {
  const digits = raw.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  return digits.length === 10
    ? { label: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`, href: `tel:+91${digits}` }
    : { label: raw, href: `tel:${raw.replace(/[^\d+]/g, "")}` };
}

/** "Solo", "Teams of 3", "Teams of 5–25" (word joiners keep "5–25" on one line). */
export function formatOf(event: PageEvent) {
  if (!event.isTeamEvent) return "Solo";
  return `Teams of ${event.minMembers === event.maxMembers ? event.maxMembers : `${event.minMembers}⁠–⁠${event.maxMembers}`}`;
}

/** "₹500" + "per team", or "Free". */
export function entryOf(event: PageEvent): { value: string; note?: string } {
  if (!event.isPaidEvent || event.fees <= 0) return { value: "Free" };
  return { value: rupees(event.fees), note: event.isTeamEvent ? "per team" : "per person" };
}

/** Prize pool as typed in the panel; bare numbers get the rupee sign. */
export function prizeOf(event: PageEvent) {
  if (!known(event.prizePool)) return null;
  const raw = event.prizePool.trim();
  return /^\d+$/.test(raw) ? rupees(Number(raw)) : raw;
}

/** Up to two initials for a coordinator's medallion. */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
