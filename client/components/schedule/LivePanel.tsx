"use client";

/* eslint-disable @next/next/no-img-element */
import { TransitionLink } from "@/components/common/TransitionLink";
import { ASSETS } from "@/constants/assets";
import { clockLabel, durationLabel } from "@/constants/schedule";
import type { ScheduleDay } from "@/lib/schedule";
import { Clock, Divider, LiveTag, Medallion, PinIcon, liveLists, progress, type FestNow } from "./bits";

/**
 * What's on right now and what's next, today only. Shows `cap` live events;
 * the rest are one tap away in the timeline (more venues = more at once).
 */
export function LivePanel({
  today,
  now,
  cap,
  venueName,
  onSeeAll,
  className = "",
}: {
  today: ScheduleDay;
  now: FestNow;
  cap: number;
  venueName: (key: string | null) => string;
  onSeeAll: () => void;
  className?: string;
}) {
  const { onNow, upNext } = liveLists(today, now);
  const shown = onNow.slice(0, cap);
  const more = onNow.length - shown.length;

  return (
    <section aria-label="Happening now" className={`sch-panel px-4 pb-5 pt-10 md:px-7 md:pb-7 md:pt-12 ${className}`}>
      <img
        src={ASSETS.cloudinary.minisun}
        alt=""
        aria-hidden
        className="pointer-events-none absolute -top-8 left-1/2 w-10 -translate-x-1/2 drop-shadow-[0_0_12px_rgba(217,164,65,0.55)] md:w-11"
      />
      <div className="relative text-center">
        <LiveTag className="!px-5 !text-[10px]">Live</LiveTag>
        <p className="mt-3 font-taiganja text-[10px] uppercase tracking-[0.26em] text-[#c4bba7]">
          Day {today.roman} · {clockLabel(now.minutes)}
          {onNow.length > 0 && ` · ${onNow.length} event${onNow.length === 1 ? "" : "s"}`}
        </p>
        <h2 className="mt-2 font-display text-[31px] font-semibold leading-[1.05] md:text-[36px]">
          Happening <span className="font-nasyhama font-normal text-gold">now</span>
        </h2>
      </div>

      <div className="relative mt-5 flex flex-col gap-3">
        {shown.map((e) => (
          <TransitionLink key={e.slug} href={`/events/${e.slug}`} className="sch-live-item px-3 pb-2.5 pt-3 md:px-3.5">
            <span className="flex items-center gap-3">
              <Medallion art={e.art} state="now" className="h-14 w-14 md:h-[62px] md:w-[62px]" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-taiganja text-[9px] uppercase tracking-[0.2em] text-[#c9a86a]">
                  <PinIcon size={11} />
                  {venueName(e.venue)}
                </span>
                <span className="sch-name mt-1 block font-display text-[24px] font-semibold leading-[1.02] md:text-[26px]">{e.name}</span>
              </span>
            </span>
            <span className="mt-3 flex items-center gap-3">
              <span aria-hidden className="sch-bar flex-1">
                <span style={{ width: `${progress(e, now)}%` }} />
                <span style={{ left: `${progress(e, now)}%` }} />
              </span>
              <span className="shrink-0 font-mono text-[10px] text-parchment/75">
                {e.end !== null ? `until ${clockLabel(e.end)}` : `${durationLabel(Math.max(0, e.start! + 60 - now.minutes))} left`}
              </span>
            </span>
          </TransitionLink>
        ))}
        {onNow.length === 0 && (
          <p className="py-2 text-center font-display text-[20px] italic text-parchment/70">A quiet moment between events.</p>
        )}
        {more > 0 && (
          <button
            type="button"
            onClick={onSeeAll}
            className="flex min-h-11 items-center justify-center gap-2 border border-dashed border-gold/45 font-taiganja text-[9.5px] uppercase tracking-[0.22em] text-[#f0c96d] transition-colors hover:border-gold"
          >
            +{more} more happening now
            <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M6 13l6 6 6-6" />
            </svg>
          </button>
        )}
      </div>

      <Divider className="relative mx-auto -my-3 w-56 md:-my-4 md:w-64" />
      <h3 className="relative text-center font-taiganja text-[10px] font-normal uppercase tracking-[0.32em] text-gold md:text-[11px]">Up next</h3>
      {upNext.length ? (
        <ol className="relative mt-2">
          {upNext.map((e) => (
            <li key={e.slug} className="border-t border-gold/15">
              <TransitionLink href={`/events/${e.slug}`} className="flex items-center gap-3 py-2.5 md:py-3">
                <Clock minutes={e.start!} className="w-[54px] shrink-0 text-[22px] text-[#f0c96d] md:text-[24px]" />
                <Medallion art={e.art} className="h-10 w-10 md:h-11 md:w-11" />
                <span className="min-w-0 flex-1">
                  <span className="sch-name block font-display text-[20px] font-semibold leading-[1.05] md:text-[21px]">{e.name}</span>
                  <span className="mt-0.5 block text-[12px] text-parchment/60 md:text-[12.5px]">
                    {venueName(e.venue)} · in {durationLabel(e.start! - now.minutes)}
                  </span>
                </span>
              </TransitionLink>
            </li>
          ))}
        </ol>
      ) : (
        <p className="relative mt-3 text-center font-display text-[18px] italic text-parchment/65">That’s everything for today.</p>
      )}
      <p className="relative mt-4 border-t border-gold/15 pt-4 text-center text-[12px] leading-relaxed text-parchment/55">
        Fest time (IST), whatever your phone says. Timings can shift on the day; each event page carries the latest notice.
      </p>
    </section>
  );
}

/** The slim live strip above the By venue grid, which has no room for the side panel. */
export function NowBar({ today, now, venueName }: { today: ScheduleDay; now: FestNow; venueName: (key: string | null) => string }) {
  const { onNow } = liveLists(today, now);
  return (
    <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 border border-gold/45 bg-[linear-gradient(100deg,rgba(124,32,27,0.36),rgba(8,18,22,0.92)_45%,rgba(4,12,16,0.94))] px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.6)]">
      <LiveTag className="!text-[9.5px]">Live</LiveTag>
      <span className="font-taiganja text-[10px] uppercase tracking-[0.22em] text-[#c4bba7]">{clockLabel(now.minutes)}</span>
      <span aria-hidden className="hidden h-6 w-px bg-gold/35 sm:block" />
      <span className="font-display text-[20px] font-semibold md:text-[22px]">
        {onNow.length ? `${onNow.length} happening` : "Nothing on"} <span className="font-nasyhama font-normal text-gold">now</span>
      </span>
      {onNow.map((e) => (
        <TransitionLink
          key={e.slug}
          href={`/events/${e.slug}`}
          className="hidden items-center gap-2 border border-gold/40 bg-[rgba(4,12,16,0.6)] py-1 pl-1 pr-3.5 transition-colors hover:border-[#f0c96d] md:inline-flex"
        >
          <Medallion art={e.art} size={32} state="now" />
          <span>
            <span className="sch-name block font-display text-[17px] font-semibold leading-[1.05]">{e.name}</span>
            <span className="block text-[11px] text-parchment/60">{venueName(e.venue)}</span>
          </span>
        </TransitionLink>
      ))}
    </div>
  );
}
