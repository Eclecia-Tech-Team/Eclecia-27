/** Result places. Client-safe: the model and the editor both read this. */
export const RESULT_PLACES = ["winner", "runner_up", "second_runner_up", "special_mention"] as const;
export type ResultPlace = (typeof RESULT_PLACES)[number];

export const PLACE_LABEL: Record<ResultPlace, string> = {
  winner: "Winner",
  runner_up: "Runner-up",
  second_runner_up: "Second runner-up",
  special_mention: "Special mention",
};
