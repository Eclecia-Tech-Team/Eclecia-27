/**
 * Opening loader (eclipse totality), one timeline:
 *   0 → buildMs   the intro plays (CSS keyframes, starts at first paint)
 *   buildMs →     exit plays once the page has loaded (or maxWaitMs passes)
 *
 * Keyframes in styles/loader.css are authored at pace 1 (4.2 s + 0.8 s) and
 * multiplied by `pace` (`--k` there); keep the two in sync.
 *
 * Add `?loader` to the URL to replay it even if it already played this session.
 */
const PACE = 1.35;

export const LOADER = {
  /** Timeline stretch shared with `--k` in styles/loader.css. */
  pace: PACE,
  /** Intro length. */
  buildMs: Math.round(4200 * PACE),
  /** Exit animation length. */
  exitMs: Math.round(800 * PACE),
  /** Never hold the loader longer than this, loaded or not. */
  maxWaitMs: Math.round(6500 * PACE),
  /** Play once per tab session (hard reloads in the same tab skip it). */
  oncePerSession: true,
  storageKey: "eclecia-loader-seen",
} as const;
