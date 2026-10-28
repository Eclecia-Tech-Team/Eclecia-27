import type { Vec2 } from "./orbit-math";

/**
 * Source-pixel anchors on the outermost gold rail of orbit-perspective-v2.webp
 * (1923 × 818), auto-snapped to opaque gold (~0.7 px RMS).
 * cx/cy/axisAngle place the eclipse and the rear/front split; a/b are the
 * fitted outer-rail semi-axes used to parameterize orbital phase.
 */
export const ORBIT_TRACE = {
  width: 1923,
  height: 818,
  cx: 975,
  cy: 350,
  axisAngle: -0.147,
  a: 868,
  b: 290,
  anchors: [
    [1021, 644], [799, 671], [587, 674], [402, 658], [257, 619], [154, 568],
    [108, 492], [131, 407], [214, 328], [342, 249], [513, 176], [717, 120],
    [937, 79], [1161, 54], [1372, 54], [1556, 73], [1701, 111], [1798, 165],
    [1837, 235], [1818, 313], [1745, 397], [1615, 472], [1445, 546], [1242, 605],
  ] as Vec2[],
};
