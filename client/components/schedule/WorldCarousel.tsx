"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { TransitionLink } from "@/components/common/TransitionLink";
import type { ScheduleWorld } from "@/lib/schedule";
import { ART, Medallion } from "./bits";

const AUTO_MS = 6000;

/** Shortest signed distance from `active` to `i` around a ring of `n`. */
function ringOffset(i: number, active: number, n: number) {
  let d = (((i - active) % n) + n) % n;
  if (d > n / 2) d -= n;
  return d;
}

/**
 * The seven worlds on a turning ring: the front card lifted and lit, the rest
 * curving away behind it. Arrows, swipe, arrow keys or the medallions below
 * turn it; it drifts on its own until someone takes over.
 */
export function WorldCarousel({ worlds }: { worlds: ScheduleWorld[] }) {
  const n = worlds.length;
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);

  const go = (i: number) => setActive(((i % n) + n) % n);

  useEffect(() => {
    if (held || n < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setActive((a) => (a + 1) % n), AUTO_MS);
    return () => clearInterval(id);
  }, [held, n]);

  if (!n) return null;
  const world = worlds[active];

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="The seven worlds"
      className="sch-ring relative mt-4"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(active + 1);
        if (e.key === "ArrowLeft") go(active - 1);
      }}
    >
      <div
        className="sch-ring-stage"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, moved: false };
        }}
        onPointerMove={(e) => {
          if (drag.current && Math.abs(e.clientX - drag.current.x) > 8) drag.current.moved = true;
        }}
        onPointerUp={(e) => {
          const start = drag.current;
          drag.current = null;
          if (!start) return;
          const dx = e.clientX - start.x;
          if (Math.abs(dx) > 40) {
            setHeld(true);
            go(active + (dx < 0 ? 1 : -1));
          }
        }}
        onPointerCancel={() => (drag.current = null)}
        onClickCapture={(e) => {
          // A swipe that ends on a link shouldn't follow it.
          if (drag.current?.moved) e.preventDefault();
        }}
      >
        {worlds.map((w, i) => {
          const off = ringOffset(i, active, n);
          const front = off === 0;
          return (
            <article
              key={w.id}
              className="sch-ring-card sch-card"
              data-front={front || undefined}
              aria-hidden={!front}
              style={{ "--off": off, "--abs": Math.abs(off), zIndex: 50 - Math.abs(off) } as CSSProperties}
            >
              <div className="relative -mx-5 h-[150px] md:h-[180px]">
                <span aria-hidden className="absolute left-1/2 top-1/2 h-[210px] w-[210px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(217,164,65,0.22)_0%,rgba(217,164,65,0.06)_45%,transparent_70%)]" />
                <img src={ART.planet} alt="" aria-hidden className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 brightness-[0.72] md:h-32 md:w-32" />
                <img src={w.art} alt="" aria-hidden loading="lazy" className="absolute left-1/2 top-1/2 h-[140px] w-[140px] -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.6)] md:h-[156px] md:w-[156px]" />
              </div>
              <h3 className="relative text-center font-taiganja text-[24px] font-normal leading-tight md:text-[26px]">{w.name}</h3>
              <p className="relative mt-1 text-center text-[12.5px] text-[#c4bba7]">{w.kind}</p>
              <div aria-hidden className="relative mb-1 mt-3.5 flex items-center gap-2">
                <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/50" />
                <span className="h-[5px] w-[5px] rotate-45 bg-gold" />
                <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/50" />
              </div>
              <ul className="relative">
                {w.events.map((e) => (
                  <li key={e.slug}>
                    <TransitionLink
                      href={`/events/${e.slug}`}
                      tabIndex={front ? undefined : -1}
                      className="flex items-center gap-3 border-b border-parchment/[0.06] py-1.5"
                    >
                      <Medallion art={e.art} size={34} />
                      <span className="sch-name min-w-0 flex-1 text-[15px] leading-tight">{e.name}</span>
                      <span className="font-taiganja text-[9px] tracking-[0.2em] text-parchment/40">TBA</span>
                    </TransitionLink>
                  </li>
                ))}
              </ul>
              {!front && (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={`Show ${w.name}`}
                  onClick={() => {
                    setHeld(true);
                    go(i);
                  }}
                  className="absolute inset-0 z-10 cursor-pointer"
                />
              )}
            </article>
          );
        })}
      </div>

      <div className="relative z-[60] mt-6 flex items-center justify-center gap-4 md:mt-8 md:gap-6">
        <button type="button" aria-label="Previous world" onClick={() => go(active - 1)} className="sch-ring-arrow">
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <div className="flex items-center gap-1.5 md:gap-2.5">
          {worlds.map((w, i) => (
            <button
              key={w.id}
              type="button"
              aria-label={w.name}
              aria-current={i === active}
              onClick={() => go(i)}
              className="sch-ring-dot"
            >
              <img src={w.art} alt="" aria-hidden />
            </button>
          ))}
        </div>
        <button type="button" aria-label="Next world" onClick={() => go(active + 1)} className="sch-ring-arrow">
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
      <p aria-live="polite" className="mt-3 text-center font-taiganja text-[10px] uppercase tracking-[0.3em] text-gold">
        {world.name} · {active + 1} of {n}
      </p>
    </div>
  );
}
