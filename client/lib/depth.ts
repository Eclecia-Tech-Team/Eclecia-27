import type { CSSProperties } from "react";

/**
 * Mouse-parallax offset for one layer, read from the `--ptr-x` / `--ptr-y`
 * vars PointerDepth writes on <html>. `px`: drift at full deflection, + with
 * the cursor (far layers: sky), - against it (near: art). Vertical drift is
 * 60% of horizontal. `scale` oversizes edge-to-edge planes so the drift
 * never uncovers their edges. Uses the individual `translate` / `scale`
 * properties, so it composes with any `transform` the layer already has.
 */
export function depth(px: number, scale?: number): CSSProperties {
  return {
    translate: `calc(var(--ptr-x, 0) * ${px}px) calc(var(--ptr-y, 0) * ${px * 0.6}px)`,
    scale: scale ? String(scale) : undefined,
  };
}
