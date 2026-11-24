/**
 * Fest days, venues and fest-time helpers. Shared by the admin editor, the
 * save action and the /schedule page, so it stays free of server-only imports.
 *
 * Times are stored as IST wall-clock strings ("14:30") on a fest day
 * ("2027-01-16"): that is how organisers think about them, and it keeps the
 * admin form free of timezone maths. Only "what time is it now?" needs an
 * instant, and festClock() turns any instant into fest time.
 */

/** IST is UTC+5:30 all year (no daylight saving). */
const IST_OFFSET_MS = 330 * 60_000;

export const FEST_DAYS = [
  { date: "2027-01-15", roman: "I", day: "15", weekday: "Friday", short: "Fri" },
  { date: "2027-01-16", roman: "II", day: "16", weekday: "Saturday", short: "Sat" },
  { date: "2027-01-17", roman: "III", day: "17", weekday: "Sunday", short: "Sun" },
] as const;

export type FestDay = (typeof FEST_DAYS)[number];

export const isFestDate = (v: string) => FEST_DAYS.some((d) => d.date === v);

export type Venue = { id: string; name: string };

/**
 * The fest's venues, in the order the schedule shows them (biggest first).
 * Empty until the organisers confirm them: meanwhile admins type each event's
 * venue as text, and the schedule lists those busiest first. Once filled in,
 * the editor offers these as a dropdown and the schedule keeps this order.
 * TODO(content): add the real venues, e.g. { id: "main-stage", name: "Main Stage" }.
 */
export const VENUES: readonly Venue[] = [];

export const venueById = (id: string | null | undefined) => VENUES.find((v) => v.id === id) ?? null;

/** 24-hour "HH:MM". */
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "14:30" -> 870. */
export const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** 870 -> { hm: "2:30", ap: "PM" }. */
export function clockParts(minutes: number) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return { hm: `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")}`, ap: h >= 12 ? "PM" : "AM" };
}

/** 870 -> "2:30 PM". */
export const clockLabel = (minutes: number) => {
  const { hm, ap } = clockParts(minutes);
  return `${hm} ${ap}`;
};

/** 90 -> "1 hr 30 min". */
export function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h} hr${m ? ` ${m} min` : ""}`;
}

/** "2027-01-16" -> "16 January 2027". */
export function longDate(date: string) {
  const [y, mo, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, mo - 1, d)),
  );
}

/** Fest time (IST) for an instant, whatever timezone the device is in. */
export function festClock(ms: number) {
  const d = new Date(ms + IST_OFFSET_MS);
  return { date: d.toISOString().slice(0, 10), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
}
