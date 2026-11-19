"use client";

/* eslint-disable @next/next/no-img-element */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { usePathname } from "next/navigation";
import { ASSETS } from "@/constants/assets";
import {
  curtainHeld,
  onCurtainRelease,
  registerCurtain,
} from "@/lib/route-curtain";
import "@/styles/route-curtain.css";

type Phase = "idle" | "closing" | "closed" | "opening";

const CLOSE_MS = 700; // CHANGED (was 620)
/** Browser back/forward: the new page may already be rendering, so close faster. */
const CLOSE_FAST_MS = 400; // CHANGED (was 360)
const OPEN_MS = 1000; // CHANGED (was 900)
/** Once shut, stay shut at least this long so a fast page doesn't just blink. */
const MIN_HOLD_MS = 300; // CHANGED (was 450)
/** Open regardless after this long, loaded or not. */
const MAX_WAIT_MS = 9000;

// NEW: image list hoisted so preload + render share one source
const CURTAIN_IMAGES = [
  ASSETS.cloudinary.blacksun,
  ASSETS.cloudinary.blacksun2,
  ASSETS.cloudinary.minisun,
];

const sleep = (ms: number) =>
  new Promise<void>((res) => window.setTimeout(res, Math.max(0, ms)));
const frames = (n: number) =>
  new Promise<void>((res) => {
    const step = (left: number) =>
      left ? requestAnimationFrame(() => step(left - 1)) : res();
    step(n);
  });

/** Resolves when no page holds the curtain (settled for two frames), or at the deadline. */
function untilReleased(deadline: number) {
  return new Promise<void>((resolve) => {
    let off = () => {};
    const done = () => {
      window.clearTimeout(timer);
      off();
      resolve();
    };
    const timer = window.setTimeout(
      done,
      Math.max(0, deadline - performance.now()),
    );
    const check = () => {
      if (curtainHeld()) return;
      void frames(2).then(() => {
        if (!curtainHeld()) done();
      });
    };
    off = onCurtainRelease(check);
    check();
  });
}

/**
 * Page transition: the dark sky closes in on the eclipse, which turns slowly
 * while the next page loads, then the iris opens from its centre onto the new
 * page (the same move as the opening loader's exit). See lib/route-curtain.ts.
 */
export function RouteCurtain() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const [closeMs, setCloseMs] = useState(CLOSE_MS);
  const phaseRef = useRef<Phase>("idle");
  const pathnameRef = useRef(pathname);
  const target = useRef<string | null>(null);
  const closed = useRef<Promise<void>>(Promise.resolve());
  const closedAt = useRef(0);
  const run = useRef(0);

  const go = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const reduced = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // NEW: preload + decode the eclipse art so the first transition doesn't stutter
  useEffect(() => {
    CURTAIN_IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
      img.decode?.().catch(() => {});
    });
  }, []);

  /** Waits for the page to be presentable, then opens. One run at a time. */
  const reveal = useCallback(async () => {
    const id = ++run.current;
    const started = performance.now();
    await closed.current;
    await frames(2);
    await untilReleased(started + MAX_WAIT_MS);
    await sleep(MIN_HOLD_MS - (performance.now() - closedAt.current));
    if (id !== run.current) return;
    target.current = null;
    go("opening");
    await sleep(reduced() ? 300 : OPEN_MS);
    if (id === run.current && phaseRef.current === "opening") go("idle");
  }, [go]);

  const close = useCallback(
    (path: string, fast = false) => {
      target.current = path;
      if (phaseRef.current === "closing" || phaseRef.current === "closed")
        return closed.current;
      run.current += 1;
      const ms = reduced() ? 200 : fast ? CLOSE_FAST_MS : CLOSE_MS;
      setCloseMs(ms);
      go("closing");
      closed.current = sleep(ms).then(() => {
        closedAt.current = performance.now();
        if (phaseRef.current === "closing") go("closed");
        // Already there (a cached page rendered while we were closing).
        if (pathnameRef.current === target.current) void reveal();
      });
      // Never strand the visitor behind the curtain (redirects, failed loads).
      void sleep(ms + MAX_WAIT_MS).then(() => {
        if (target.current === path && phaseRef.current === "closed")
          void reveal();
      });
      return closed.current;
    },
    [go, reveal],
  );

  useEffect(() => registerCurtain({ close: (path) => close(path) }), [close]);

  // Arrived at the page the curtain closed for.
  useEffect(() => {
    pathnameRef.current = pathname;
    if (target.current && pathname === target.current) void reveal();
  }, [pathname, reveal]);

  // Browser back/forward bypasses links: cover the swap as it happens.
  useEffect(() => {
    const onPop = () => {
      if (window.location.pathname !== pathnameRef.current)
        void close(window.location.pathname, true);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [close]);

  if (phase === "idle") return null;

  return (
    <div
      className="route-curtain"
      data-state={phase}
      role="status"
      aria-label="Loading"
      style={
        {
          "--rc-close": `${closeMs}ms`,
          "--rc-open": `${OPEN_MS}ms`,
        } as CSSProperties
      }
    >
      <div className="rc-eclipse" aria-hidden>
        <span className="rc-glow" />
        <img
          src={ASSETS.cloudinary.blacksun}
          alt=""
          className="rc-rays"
          draggable={false}
        />
        <img
          src={ASSETS.cloudinary.blacksun2}
          alt=""
          className="rc-moon"
          draggable={false}
        />
        <img
          src={ASSETS.cloudinary.minisun}
          alt=""
          className="rc-minisun"
          draggable={false}
        />
      </div>
    </div>
  );
}
