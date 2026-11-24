"use client";

import { useEffect, useMemo, useRef } from "react";
import { TransitionLink } from "@/components/common/TransitionLink";
import { clockLabel, clockParts } from "@/constants/schedule";
import type { ScheduleDay } from "@/lib/schedule";
import { LiveDot, LiveTag, Medallion, statusOf, type FestNow } from "./bits";

const TBA_ROW = "";

/** First and last hour across the whole fest, so the grid doesn't jump between days. */
function hourSpan(days: ScheduleDay[]) {
  let from = 10;
  let to = 18;
  for (const d of days) {
    for (const e of d.timed) {
      from = Math.min(from, Math.floor(e.start! / 60));
      to = Math.max(to, Math.ceil((e.end ?? e.start! + 60) / 60));
    }
  }
  return { from, to: Math.min(to, 24) };
}

/**
 * By venue: one row per venue, time running across. A new venue adds a row, so
 * it scales to any number of venues. On narrow screens the timeline scrolls
 * sideways with the venue names pinned, and opens on "now".
 */
export function VenueGrid({
  days,
  day,
  venues,
  now,
  live,
}: {
  days: ScheduleDay[];
  day: ScheduleDay;
  venues: { key: string; name: string }[];
  now: FestNow;
  live: boolean;
}) {
  const { from, to } = useMemo(() => hourSpan(days), [days]);
  const hours = to - from;
  const isToday = live && day.date === now.date;
  const nowAt = (now.minutes - from * 60) / 60;
  const showNow = isToday && nowAt >= 0 && nowAt <= hours;

  const rows = [...venues];
  if (day.timed.some((e) => !e.venue)) rows.push({ key: TBA_ROW, name: "Venue TBA" });

  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (!el || !showNow || el.scrollWidth <= el.clientWidth) return;
    const hour = parseFloat(getComputedStyle(el).getPropertyValue("--hw")) || 84;
    el.scrollLeft = Math.max(0, nowAt * hour - 70);
    // Only when the day or view opens, not on every clock tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.date, showNow]);

  return (
    <div className="sch-grid relative mt-4 border-y border-gold/40 bg-[radial-gradient(circle_at_50%_0%,rgba(18,32,38,0.92),rgba(4,12,16,0.95)_75%)] shadow-[0_24px_60px_rgba(0,0,0,0.7)] md:border-x">
      <div ref={scroller} className="sch-grid-scroll">
        <div className="relative" style={{ minWidth: `calc(var(--label) + var(--hw) * ${hours})` }}>
          <div className="flex h-14 border-b border-gold/30 md:h-16">
            <div className="sch-grid-label flex items-end px-3 pb-3 font-taiganja text-[8.5px] uppercase tracking-[0.24em] text-parchment/55 md:px-[18px] md:text-[9.5px]">
              Venue
            </div>
            <div className="relative flex-1">
              {Array.from({ length: hours }, (_, i) => {
                const { hm, ap } = clockParts((from + i) * 60);
                return (
                  <span key={i} className="absolute bottom-2.5 whitespace-nowrap md:bottom-3" style={{ left: `calc(var(--hw) * ${i} + 6px)` }}>
                    <span className="font-display text-[15px] font-semibold text-parchment/80 md:text-[17px]">{hm.replace(":00", "")}</span>
                    <span className="ml-0.5 font-taiganja text-[7.5px] tracking-[0.14em] text-[#c9a86a] md:text-[8.5px]">{ap}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {rows.map((row) => {
            const events = day.timed.filter((e) => (row.key === TBA_ROW ? !e.venue : e.venue === row.key));
            const liveHere = events.some((e) => statusOf(day.date, e, now, live) === "now");
            return (
              <div key={row.key} className="flex h-[84px] border-b border-gold/[0.13] md:h-24">
                <div className="sch-grid-label flex flex-col justify-center gap-1 px-3 md:px-[18px]">
                  <span className="font-taiganja text-[9.5px] uppercase leading-[1.35] tracking-[0.14em] text-gold md:text-[11px] md:tracking-[0.2em]">{row.name}</span>
                  <span className="flex items-center gap-1.5 font-display text-[12.5px] italic text-parchment/60 md:text-[14px]">
                    {liveHere && <LiveDot />}
                    {events.length ? `${events.length} event${events.length === 1 ? "" : "s"}` : "Free today"}
                  </span>
                </div>
                <div className="sch-grid-track">
                  {events.map((e) => {
                    const state = statusOf(day.date, e, now, live);
                    const end = e.end ?? e.start! + 60;
                    const length = end - e.start!;
                    return (
                      <TransitionLink
                        key={e.slug}
                        href={`/events/${e.slug}`}
                        className="sch-block"
                        data-state={state ?? undefined}
                        style={{
                          left: `calc(var(--hw) * ${(e.start! - from * 60) / 60} + 3px)`,
                          width: `calc(var(--hw) * ${length / 60} - 6px)`,
                        }}
                      >
                        {length >= 105 && <Medallion art={e.art} size={32} state={state} />}
                        <span className="min-w-0">
                          <span className={`block whitespace-nowrap font-taiganja text-[7.5px] uppercase tracking-[0.12em] md:text-[8.5px] ${state === "now" ? "text-[#f0c96d]" : "text-[#c9a86a]"}`}>
                            {clockParts(e.start!).hm}<span className="font-display">–</span>{e.end !== null ? clockLabel(e.end) : clockParts(e.start!).ap}
                          </span>
                          <span className="sch-block-name sch-name mt-1 font-display text-[16px] font-semibold leading-[1.04] md:text-[18px]">{e.name}</span>
                        </span>
                      </TransitionLink>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {showNow && (
            <div aria-hidden className="sch-grid-now" style={{ left: `calc(var(--label) + var(--hw) * ${nowAt})` }}>
              <LiveTag dot={false} className="absolute left-1/2 top-1.5 -translate-x-1/2 whitespace-nowrap !px-3 !text-[8px]">
                Now {clockParts(now.minutes).hm}
              </LiveTag>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
