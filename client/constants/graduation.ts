/**
 * Single source of truth for the allowed graduation year range.
 * Used by the CamPanel dropdown, the /api/cam route, and the
 * CampusAmbassador Mongoose schema. Update here when rolling the range forward.
 */
export const GRAD_YEAR_MIN = 2024;
export const GRAD_YEAR_MAX = 2032;

export const GRAD_YEARS: readonly number[] = Array.from(
  { length: GRAD_YEAR_MAX - GRAD_YEAR_MIN + 1 },
  (_, i) => GRAD_YEAR_MIN + i,
);
