import { z } from "zod";
import { EVENT_CATEGORIES } from "@/constants/event-categories";
import { TIME_RE, durationLabel, isFestDate, minutesOf, venueById } from "@/constants/schedule";

const text = (max: number) => z.string().trim().max(max);
const url = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Links must start with http:// or https://");

/** What the event editor sends. Shared by the form (types) and the save action (checks). */
export const eventInput = z
  .object({
    eventName: z.string().trim().min(3, "Name needs 3–30 characters").max(30, "Name needs 3–30 characters"),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "URL name: lowercase letters, numbers and single hyphens")
      .max(60),
    category: z.enum(EVENT_CATEGORIES, { message: "Pick a world" }),
    kind: text(60),
    description: z.string().trim().min(1, "Write a description").max(2000),
    duration: text(60),
    venue: text(120),
    // Structured schedule; "" = to be announced.
    scheduleDate: z.string().refine((v) => v === "" || isFestDate(v), "Pick one of the fest days"),
    startTime: z.string().refine((v) => v === "" || TIME_RE.test(v), "Times look like 14:30"),
    endTime: z.string().refine((v) => v === "" || TIME_RE.test(v), "Times look like 14:30"),
    venueId: z.string().refine((v) => v === "" || Boolean(venueById(v)), "Pick a venue from the list"),
    banner: url,
    doc: url,
    rules: z.array(text(800)).max(40, "Keep it to 40 rules"),
    clubs: z.array(text(80)).max(10),
    pocs: z
      .array(z.object({ name: text(60), mobile: text(20) }))
      .max(8),
    isTeamEvent: z.boolean(),
    minMembersPerTeam: z.number().int().min(1).max(30),
    maxMembersPerTeam: z.number().int().min(1).max(30),
    teamLimit: z.number().int().min(1).max(10000).nullable(),
    isPaidEvent: z.boolean(),
    fees: z.number().int().min(0).max(100000),
    prizePool: text(60),
    isActive: z.boolean(),
    isFoodProvided: z.boolean(),
    maxFoodServingsPerParticipant: z.number().int().min(1).max(10),
  })
  .refine((e) => !e.startTime || e.scheduleDate, "Pick the day before setting a time")
  .refine((e) => !e.endTime || e.startTime, "Set a start time before the end time")
  .refine((e) => !e.startTime || !e.endTime || minutesOf(e.endTime) > minutesOf(e.startTime), "The end time must be after the start time")
  .transform((e) => {
    const venue = venueById(e.venueId);
    const start = e.startTime ? minutesOf(e.startTime) : null;
    const end = e.endTime ? minutesOf(e.endTime) : null;
    return {
      ...e,
      scheduleDate: e.scheduleDate || null,
      startTime: e.startTime || null,
      endTime: e.endTime || null,
      venueId: venue?.id ?? null,
      // Required by the schema; "TBA" reads as "To be announced" on the site.
      // Day and time text is built from the structured fields when read (whenText).
      duration: start !== null && end !== null ? durationLabel(end - start) : e.duration || "TBA",
      venue: venue?.name ?? (e.venue || "TBA"),
    };
  })
  .transform((e) => ({
    ...e,
    prizePool: e.prizePool || "TBD",
    rules: e.rules.filter(Boolean),
    clubs: e.clubs.filter(Boolean),
    pocs: e.pocs.filter((p) => p.name && p.mobile),
    minMembersPerTeam: e.isTeamEvent ? e.minMembersPerTeam : 1,
    maxMembersPerTeam: e.isTeamEvent ? e.maxMembersPerTeam : 1,
    fees: e.isPaidEvent ? e.fees : 0,
  }))
  .refine((e) => e.minMembersPerTeam <= e.maxMembersPerTeam, "Smallest team can't be bigger than the largest")
  .refine((e) => !e.isPaidEvent || e.fees > 0, "Paid events need a fee");

export type EventInput = z.input<typeof eventInput>;

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/** First problem in a zod error, phrased for a person. */
export const firstIssue = (err: z.ZodError) => {
  const issue = err.issues[0];
  return issue?.message ?? "Something in the form isn't right.";
};
