"use client";

/* eslint-disable @next/next/no-img-element */
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { TransitionLink } from "@/components/common/TransitionLink";
import { ASSETS } from "@/constants/assets";
import { clockLabel, durationLabel } from "@/constants/schedule";
import type { ScheduleDay, ScheduleEvent } from "@/lib/schedule";
import { ART, Clock, LiveDot, LiveTag, Medallion, PinIcon, progress, statusOf, type FestNow } from "./bits";

export type VenueChip = { key: string; name: string; count: number; live: boolean };

/**
 * Venue filter. Stays on one line however many venues there are: it scrolls
 * sideways, with fades and arrows showing that more is there.
 */
export function VenueStrip({
  chips,
  total,
  value,
  onChange,
}: {
  chips: VenueChip[];
  total: number;
  value: string;
  onChange: (key: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const start = el.scrollLeft <= 2;
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    setEdge((cur) => (cur.start === start && cur.end === end ? cur : { start, end }));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    const frame = requestAnimationFrame(measure);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [measure, chips]);

  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  const all: VenueChip = { key: "", name: "All venues", count: total, live: false };

  return (
    <div className="relative mt-5 border-y border-gold/25 bg-[rgba(4,12,16,0.65)]">
      <div ref={ref} onScroll={measure} role="group" aria-label="Filter by venue" className="sch-strip flex overflow-x-auto whitespace-nowrap px-1.5">
        {[all, ...chips].map((c) => {
          const on = c.key === value;
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(c.key)}
              className={`relative inline-flex min-h-11 shrink-0 items-center gap-1.5 px-3 font-taiganja text-[10px] uppercase tracking-[0.18em] transition-colors md:min-h-[46px] md:text-[11px] md:tracking-[0.2em] ${
                on ? "text-gold" : "text-parchment/70 hover:text-parchment"
              }`}
            >
              {c.live && <LiveDot />}
              {c.name}
              <span className={`font-display text-[15px] italic normal-case tracking-normal ${on ? "text-[#f0c96d]" : "text-parchment/45"}`}>{c.count}</span>
              {on && <span aria-hidden className="absolute inset-x-3 -bottom-px h-0.5 bg-gold shadow-[0_0_10px_rgba(217,164,65,0.75)]" />}
            </button>
          );
        })}
      </div>
      {!edge.start && (
        <>
          <span aria-hidden className="sch-strip-fade" data-side="left" />
          <button type="button" aria-label="Show earlier venues" onClick={() => scroll(-1)} className="sch-strip-arrow left-1.5">
            <Chevron dir="left" />
          </button>
        </>
      )}
      {!edge.end && (
        <>
          <span aria-hidden className="sch-strip-fade" data-side="right" />
          <button type="button" aria-label="Show more venues" onClick={() => scroll(1)} className="sch-strip-arrow right-1.5">
            <Chevron dir="right" />
          </button>
        </>
      )}
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

/** The day as a list in time order, with a "now" marker during the fest. */
export function Timeline({
  day,
  events,
  now,
  live,
  venueName,
}: {
  day: ScheduleDay;
  events: ScheduleEvent[];
  now: FestNow;
  live: boolean;
  venueName: (key: string | null) => string;
}) {
  const isToday = live && day.date === now.date;
  // The marker sits after the last event that has already started.
  const markerAt = isToday ? events.findIndex((e) => e.start! > now.minutes) : -1;
  const markerIndex = isToday ? (markerAt === -1 ? events.length : markerAt) : -1;

  return (
    <div className="relative mt-6">
      <span aria-hidden className="sch-rail left-[61px] md:left-[117px]" />
      <ol className="relative">
        {events.map((e, i) => (
          <Fragment key={e.slug}>
            {i === markerIndex && <NowMarker minutes={now.minutes} />}
            <Row day={day} e={e} now={now} live={live} venue={venueName(e.venue)} />
          </Fragment>
        ))}
        {markerIndex === events.length && events.length > 0 && <NowMarker minutes={now.minutes} />}
      </ol>
    </div>
  );
}

function NowMarker({ minutes }: { minutes: number }) {
  return (
    <li id="now" aria-label={`Now, ${clockLabel(minutes)}`} className="relative my-2 h-9 scroll-mt-28">
      <span aria-hidden className="sch-now-line" />
      <LiveTag dot={false} className="absolute left-5 top-1/2 -translate-y-1/2 !px-5 !py-1.5 !text-[10px] md:left-11">
        <span className="inline-flex items-center gap-2">
          <img src={ASSETS.cloudinary.minisun} alt="" aria-hidden className="-my-1.5 h-5 w-auto" />
          Now · {clockLabel(minutes)}
        </span>
      </LiveTag>
    </li>
  );
}

function Row({ day, e, now, live, venue }: { day: ScheduleDay; e: ScheduleEvent; now: FestNow; live: boolean; venue: string }) {
  const state = statusOf(day.date, e, now, live);
  const minsLeft = state === "now" ? (e.end ?? e.start! + 60) - now.minutes : 0;

  return (
    <li className={`relative flex items-start py-1.5 ${state === "past" ? "opacity-60" : ""}`}>
      <div className="w-[50px] shrink-0 pt-3 text-right md:w-[96px] md:pt-4">
        <Clock minutes={e.start!} className={`text-[22px] leading-none md:text-[30px] ${state === "now" ? "text-[#f0c96d]" : "text-parchment"}`} />
        {e.end !== null && <div className="mt-1.5 hidden font-mono text-[11px] text-parchment/55 md:block">to {clockLabel(e.end)}</div>}
      </div>
      <div className="flex w-6 shrink-0 justify-center pt-[18px] md:w-11 md:pt-[26px]">
        <span aria-hidden className="sch-node" data-state={state ?? undefined} />
      </div>
      <TransitionLink href={`/events/${e.slug}`} className="block min-w-0 flex-1">
        <div className="sch-card px-3 py-3 md:px-5 md:py-[18px]" data-state={state === "past" ? undefined : (state ?? undefined)}>
          {state === "now" && <img src={ART.dust} alt="" aria-hidden className="pointer-events-none absolute right-0 top-0 h-full w-[70%] object-cover opacity-50" />}
          <div className="relative flex items-center gap-3 md:gap-5">
            <Medallion art={e.art} state={state} className="h-[54px] w-[54px] md:h-[78px] md:w-[78px]" />
            <div className="min-w-0 flex-1">
              {state === "now" && <LiveTag className="mb-2 !px-3.5 !text-[8px] md:!text-[9px]">Happening now</LiveTag>}
              {state === "next" && (
                <p className="mb-1.5 font-taiganja text-[9px] uppercase tracking-[0.24em] text-[#f0c96d] md:text-[10px]">Starts in {e.start! - now.minutes} min</p>
              )}
              {state === "past" && <p className="mb-1.5 font-taiganja text-[9px] uppercase tracking-[0.24em] text-parchment/50 md:text-[10px]">Ended</p>}
              <p className="font-taiganja text-[8.5px] uppercase tracking-[0.2em] text-[#c9a86a] md:text-[10px] md:tracking-[0.24em]">
                {e.world}
                {e.kind && <span className="hidden md:inline"> · {e.kind}</span>}
              </p>
              <p className="sch-name mt-1 font-display text-[23px] font-semibold leading-[1.02] md:text-[32px]">{e.name}</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-parchment/80 md:mt-2 md:gap-2 md:text-[14px]">
                <PinIcon size={13} />
                {venue}
                {e.end !== null && <span className="md:hidden"> · till {clockLabel(e.end)}</span>}
              </p>
            </div>
            <span aria-hidden className="hidden h-10 w-10 shrink-0 place-items-center rounded-full border border-gold/45 text-gold md:grid">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </div>
          {state === "now" && (
            <div className="relative mt-3 flex items-center gap-3 pl-[66px] md:mt-4 md:pl-[98px]">
              <span aria-hidden className="sch-bar flex-1">
                <span style={{ width: `${progress(e, now)}%` }} />
                <span style={{ left: `${progress(e, now)}%` }} />
              </span>
              <span className="shrink-0 font-mono text-[10px] text-parchment/75 md:text-[11px]">
                {durationLabel(minsLeft)} left{e.end !== null && <span className="hidden md:inline"> · ends {clockLabel(e.end)}</span>}
              </span>
            </div>
          )}
        </div>
      </TransitionLink>
    </li>
  );
}
