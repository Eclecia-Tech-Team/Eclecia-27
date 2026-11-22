/** The seven worlds, as stored on Event.category. Client-safe (no mongoose). */
export const EVENT_CATEGORIES = [
  "Celeste",
  "Taal Tarang",
  "Anubhuti",
  "BakyaRongo",
  "Aetheria",
  "Cadence",
  "Brahmand",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];
