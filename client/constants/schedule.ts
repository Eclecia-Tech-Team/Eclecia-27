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

type When = { scheduleDate?: string | null; startTime?: string | null; endTime?: string | null };

/**
 * Display text for an event's day and time, built from the structured fields:
 * { date: "16 January 2027", time: "2:30 PM – 4:00 PM" }. Null = not announced.
 */
export function whenText(e: When) {
  const date = e.scheduleDate && isFestDate(e.scheduleDate) ? longDate(e.scheduleDate) : null;
  const start = date && e.startTime && TIME_RE.test(e.startTime) ? minutesOf(e.startTime) : null;
  const end = start !== null && e.endTime && TIME_RE.test(e.endTime) ? minutesOf(e.endTime) : null;
  const time = start === null ? null : end !== null && end > start ? `${clockLabel(start)} – ${clockLabel(end)}` : clockLabel(start);
  return { date, time };
}

/** Fest time (IST) for an instant, whatever timezone the device is in. */
export function festClock(ms: number) {
  const d = new Date(ms + IST_OFFSET_MS);
  return { date: d.toISOString().slice(0, 10), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
}
