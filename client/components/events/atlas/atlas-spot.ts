/**
 * Where the visitor was in the atlas when they left for an event page, so
 * coming back reopens that event. The URL stays /events throughout. Read does
 * not clear: strict mode mounts twice. Returning to the categories clears it.
 */
const KEY = "events:atlas-spot";

export interface AtlasSpot {
  category: string;
  event: string;
}

export function saveAtlasSpot(spot: AtlasSpot) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(spot));
  } catch {}
}

export function readAtlasSpot(): AtlasSpot | null {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "null");
  } catch {
    return null;
  }
}

export function clearAtlasSpot() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
