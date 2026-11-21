"use client";

import { useEffect } from "react";

/**
 * Mouse parallax for the whole site: eases the pointer's position into
 * `--ptr-x` / `--ptr-y` on <html>, each -1..1 from the viewport centre.
 * Layers read them at their own depth (`.depth-*` in globals.css, or inline
 * `translate` on scene layers): the sky drifts with the cursor, figures and
 * art against it, as on the events atlas. Mouse only; nothing for touch or
 * reduced motion, where the vars stay unset (0).
 */
export function PointerDepth() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduce.matches) return;

    const root = document.documentElement.style;
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let raf = 0;
    let last = 0;

    const step = (now: number) => {
      // Frame-rate independent easing: ~0.06 of the gap per 60 Hz frame.
      const dt = Math.min(4, (now - (last || now)) / 16.67 || 1);
      last = now;
      const k = 1 - Math.pow(1 - 0.06, dt);
      x += (targetX - x) * k;
      y += (targetY - y) * k;
      root.setProperty("--ptr-x", x.toFixed(4));
      root.setProperty("--ptr-y", y.toFixed(4));
      if (Math.abs(targetX - x) > 0.0005 || Math.abs(targetY - y) > 0.0005) raf = requestAnimationFrame(step);
      else {
        raf = 0;
        last = 0;
      }
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(step);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      targetX = (e.clientX / window.innerWidth) * 2 - 1;
      targetY = (e.clientY / window.innerHeight) * 2 - 1;
      kick();
    };
    // Drift home when the mouse leaves the window.
    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      kick();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      root.removeProperty("--ptr-x");
      root.removeProperty("--ptr-y");
    };
  }, []);

  return null;
}
