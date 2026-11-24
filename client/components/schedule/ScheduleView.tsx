"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/common/Header";
import { SiteFooter } from "@/components/common/Footer";
import { PageFade } from "@/components/common/PageFade";
import { Meteors } from "@/components/common/Meteors";
import { GoldActionButton } from "@/components/common/GoldButton";
import { TransitionLink } from "@/components/common/TransitionLink";
import { ASSETS } from "@/constants/assets";
import { FEST_DAYS, clockParts, festClock } from "@/constants/schedule";
import { depth } from "@/lib/depth";
import type { ScheduleData, ScheduleDay, ScheduleEvent } from "@/lib/schedule";
import { ART, Diamond, Dial, Divider, Eclipse, LiveTag, Medallion, statusOf, type FestNow, FestDates } from "./bits";
import { LivePanel, NowBar } from "./LivePanel";
import { Lineup, Unscheduled } from "./Lineup";
import { Timeline, VenueStrip, type VenueChip } from "./Timeline";
import { VenueGrid } from "./VenueGrid";
import "@/styles/schedule.css";

type View = "timeline" | "venue";

/** Fest time, ticking every 30 s. */
function useFestNow(initialMs: number): FestNow {
  const [ms, setMs] = useState(initialMs);
  useEffect(() => {
    const tick = () => setMs(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  return festClock(ms);
}

const isFestDay = (date: string) => FEST_DAYS.some((d) => d.date === date);

/** Today during the fest, otherwise the first day with anything on it. */
function openingDay(data: ScheduleData, today: string) {
  if (isFestDay(today)) return today;
  return data.days.find((d) => d.timed.length + d.untimed.length > 0)?.date ?? data.days[0].date;
}

/**
 * /schedule: what's on, when and where for the three days. During the fest
 * the eclipse becomes a clock in fest time (IST) and the page shows what's
 * happening now; before anything is announced it shows the line-up instead.
 */
export function ScheduleView({ data, nowMs }: { data: ScheduleData; nowMs: number }) {
  const now = useFestNow(nowMs);
  const live = isFestDay(now.date);
  const [dayDate, setDayDate] = useState(() => openingDay(data, festClock(nowMs).date));
  const [view, setView] = useState<View>("timeline");
  const [venue, setVenue] = useState("all");

  const names = useMemo(() => new Map(data.venues.map((v) => [v.key, v.name])), [data.venues]);
  const venueName = (key: string | null) => (key && names.get(key)) || "Venue TBA";

  const day = data.days.find((d) => d.date === dayDate) ?? data.days[0];
  const today = live ? data.days.find((d) => d.date === now.date) : undefined;
  const isToday = today?.date === day.date;

  const chips: VenueChip[] = data.venues
    .map((v) => {
      const here = day.timed.filter((e) => e.venue === v.key);
      return { key: v.key, name: v.name, count: here.length, live: here.some((e) => statusOf(day.date, e, now, live) === "now") };
    })
    .filter((c) => c.count > 0);
  const events = venue === "all" ? day.timed : day.timed.filter((e) => e.venue === venue);
  const dayVenues = new Set([...day.timed, ...day.untimed].map((e) => e.venue).filter(Boolean)).size;

  const pickDay = (date: string) => {
    setDayDate(date);
    setVenue("all");
  };
  const seeAllNow = () => {
    if (!today) return;
    setView("timeline");
    setVenue("all");
    setDayDate(today.date);
    setTimeout(() => document.getElementById("now")?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  };

  return (
    <PageFade className="min-h-dvh">
      <div className="sch relative flex min-h-dvh flex-col overflow-x-clip bg-black text-parchment">
        <img
          src={ASSETS.cloudinary.eventsBackground || ASSETS.cloudinary.bg}
          alt=""
          aria-hidden
          className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-55"
          style={depth(14, 1.06)}
        />
        <div className="pointer-events-none fixed inset-0" aria-hidden style={depth(14)}>
          <Meteors />
        </div>
        <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_70%_20%,transparent_30%,rgba(2,6,9,0.7)_85%)]" />
        <img src={ART.dust} alt="" aria-hidden className="pointer-events-none absolute left-1/2 top-16 w-[900px] max-w-none -translate-x-1/2 opacity-60 md:w-[1700px]" />
        <SiteHeader />

        <main className="relative z-10 flex-1 pt-20 md:pt-28">
          {!data.announced ? (
            <Lineup data={data} nowDate={now.date} />
          ) : (
            <>
              <Hero live={live} now={now} today={today} total={data.totalEvents} venues={data.venues.length} />

              {today && (
                <div className="mx-auto mt-14 w-full max-w-md px-4 lg:hidden">
                  <LivePanel today={today} now={now} cap={2} venueName={venueName} onSeeAll={seeAllNow} />
                </div>
              )}

              {/* Day dials + view switch */}
              <section className="relative mx-auto mt-10 flex w-full max-w-6xl flex-col items-center gap-6 px-2.5 md:mt-12 md:px-8 lg:flex-row lg:items-end lg:justify-between">
                <div role="tablist" aria-label="Fest day" className="relative flex w-full max-w-[380px] justify-between md:w-auto md:max-w-none md:gap-8">
                  <span
                    aria-hidden
                    className="absolute inset-x-[60px] top-12 h-px bg-[linear-gradient(90deg,rgba(217,164,65,0),rgba(217,164,65,0.5)_18%,rgba(217,164,65,0.5)_82%,rgba(217,164,65,0))] md:inset-x-[70px] md:top-16"
                  />
                  {data.days.map((d) => (
                    <DayTab key={d.date} d={d} selected={d.date === day.date} isToday={live && d.date === now.date} onPick={() => pickDay(d.date)} />
                  ))}
                </div>
                <div role="group" aria-label="View" className="flex gap-7 lg:pb-9 lg:pr-4">
                  <GoldActionButton size="sm" variant={view === "timeline" ? "solid" : "ghost"} aria-pressed={view === "timeline"} onClick={() => setView("timeline")}>
                    Timeline
                  </GoldActionButton>
                  <GoldActionButton size="sm" variant={view === "venue" ? "solid" : "ghost"} aria-pressed={view === "venue"} onClick={() => setView("venue")}>
                    By venue
                  </GoldActionButton>
                </div>
              </section>

              {/* The day, and the live panel beside it */}
              <div className="relative mx-auto mt-8 flex w-full max-w-6xl flex-col gap-10 px-4 md:px-8 lg:flex-row lg:items-start lg:gap-11">
                <section aria-label={`${day.weekday}, ${day.day} January`} className="min-w-0 flex-1">
                  <div className="text-panel-shadow flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1.5">
                    <h2 className="font-display text-[28px] font-medium italic leading-tight md:text-[38px]">
                      {day.weekday}, {day.day} January
                    </h2>
                    <p className="flex items-center gap-2.5 font-taiganja text-[9.5px] uppercase tracking-[0.24em] text-[#c4bba7] md:text-[11px] md:tracking-[0.26em]">
                      {day.timed.length + day.untimed.length} events
                      {dayVenues > 0 && (
                        <>
                          <Diamond />
                          {dayVenues} {dayVenues === 1 ? "venue" : "venues"}
                        </>
                      )}
                    </p>
                  </div>

                  {view === "timeline" ? (
                    <>
                      {chips.length > 1 && <VenueStrip chips={chips} total={day.timed.length} value={venue} onChange={setVenue} />}
                      {events.length ? (
                        <Timeline day={day} events={events} now={now} live={live} venueName={venueName} />
                      ) : (
                        <EmptyDay text={day.timed.length ? "Nothing at this venue today." : "No timings for this day yet. They land here as soon as they’re fixed."} />
                      )}
                    </>
                  ) : (
                    <>
                      {isToday && today && <NowBar today={today} now={now} venueName={venueName} />}
                      {day.timed.length ? (
                        <>
                          <div className="-mx-4 md:mx-0">
                            <VenueGrid days={data.days} day={day} venues={data.venues} now={now} live={live} />
                          </div>
                          <p className="mt-3 text-[12.5px] text-parchment/55">Narrow screens scroll the timeline sideways; venue names stay pinned on the left.</p>
                        </>
                      ) : (
                        <EmptyDay text="No timings for this day yet. They land here as soon as they’re fixed." />
                      )}
                    </>
                  )}

                  <Untimed events={day.untimed} venueName={venueName} indent={view === "timeline"} />
                </section>

                {view === "timeline" && today && (
                  <aside className="hidden w-[360px] shrink-0 pt-10 lg:sticky lg:top-24 lg:block">
                    <LivePanel today={today} now={now} cap={3} venueName={venueName} onSeeAll={seeAllNow} />
                  </aside>
                )}
              </div>

              <Unscheduled events={data.unscheduled} />
            </>
          )}
        </main>

        <Finale />
        <SiteFooter />
      </div>
    </PageFade>
  );
}

function Hero({ live, now, today, total, venues }: { live: boolean; now: FestNow; today?: ScheduleDay; total: number; venues: number }) {
  const { hm, ap } = clockParts(now.minutes);
  return (
    <section className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-4 md:px-8 lg:flex-row lg:justify-between lg:gap-12">
      <div className="text-panel-shadow relative min-w-0 flex-1 text-center lg:text-left">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-20 -inset-y-32 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(4,4,8,0.66)_0%,rgba(4,4,8,0.6)_35%,rgba(4,4,8,0.36)_55%,rgba(4,4,8,0.15)_72%,rgba(4,4,8,0)_100%)]"
        />
        <p className="font-taiganja text-[11px] uppercase tracking-[0.3em] text-gold md:text-[12px]"><span>Eclecia<span className="font-display tracking-normal">’</span>27</span> · 15<span className="font-display tracking-normal">–</span>17 January · HITK</p>
        <h1 className="mt-3 font-display text-[46px] font-semibold leading-[0.95] tracking-[-0.02em] md:mt-5 md:text-[92px] md:leading-[0.92]">
          The programme
          <span className="mt-2 block font-nasyhama text-[27px] font-normal leading-[1.15] tracking-normal text-gold md:mt-3.5 md:text-[52px] lg:text-[44px]">
            three days, every stage
          </span>
        </h1>
        <Divider className="mx-auto -my-6 w-72 md:-my-9 md:w-105 lg:-ml-4" />
        <p className="mx-auto max-w-[52ch] text-[15px] leading-relaxed text-parchment/78 md:text-[17px] lg:mx-0">
          What’s on, when and where, across every stage of the fest. Tap any event for its rules, coordinators and registration.
        </p>
        <p className="mt-5 hidden flex-wrap items-center gap-x-4 gap-y-2 font-taiganja text-[11px] uppercase tracking-[0.24em] text-[#c4bba7] md:flex md:justify-center lg:justify-start">
          Fest time · IST
          <Diamond />
          {total} events
          {venues > 0 && (
            <>
              <Diamond />
              {venues} {venues === 1 ? "venue" : "venues"}
            </>
          )}
        </p>
      </div>

      <div className="relative order-first shrink-0 lg:order-none lg:mr-6">
        <Eclipse className="w-[250px] md:w-[340px] lg:w-[440px]">
          {live && today ? (
            <>
              <p className="font-taiganja text-[9px] uppercase tracking-[0.34em] text-gold md:text-[11px]">Fest time</p>
              <p className="mt-1 font-display text-[62px] font-semibold leading-none tracking-[-0.02em] [text-shadow:0_0_28px_rgba(217,164,65,0.35)] md:mt-1.5 md:text-[84px] lg:text-[104px]">
                {hm}
              </p>
              <p className="mt-1.5 font-taiganja text-[11px] uppercase tracking-[0.32em] text-[#e5c88b] md:mt-2 md:text-[14px]">{ap} · IST</p>
              <p className="mt-2 font-taiganja text-[8.5px] uppercase tracking-[0.28em] text-[#c4bba7] md:mt-3.5 md:text-[10.5px]">
                Day {today.roman} · {today.weekday}
              </p>
            </>
          ) : (
            <>
              <p className="font-taiganja text-[9px] uppercase tracking-[0.34em] text-gold md:text-[11px]">Eclecia<span className="font-display tracking-normal">’</span>27</p>
              <FestDates className="mt-2.5 text-[34px] md:mt-3 md:text-[48px] lg:text-[62px]" />
              <p className="mt-2 font-taiganja text-[10px] uppercase tracking-[0.3em] text-[#e5c88b] md:text-[13px]">January</p>
            </>
          )}
        </Eclipse>
        {live && (
          <img
            src={ASSETS.cloudinary.hand}
            alt=""
            aria-hidden
            className="pointer-events-none absolute -bottom-16 -right-24 hidden w-[200px] -rotate-6 drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)] lg:block"
          />
        )}
      </div>
    </section>
  );
}

function DayTab({ d, selected, isToday, onPick }: { d: ScheduleDay; selected: boolean; isToday: boolean; onPick: () => void }) {
  const face = (small: boolean) => (
    <Dial size={small ? 96 : 128} glow={selected}>
      <span className={`font-display font-semibold italic leading-none text-gold ${small ? "text-[12px]" : "text-[15px]"}`}>{d.roman}</span>
      <span className={`font-display font-semibold leading-none ${small ? "text-[31px]" : "text-[40px]"}`}>{d.day}</span>
      <span className={`font-taiganja uppercase text-[#e5c88b] ${small ? "text-[7.5px] tracking-[0.26em]" : "mt-px text-[9px] tracking-[0.28em]"}`}>Jan</span>
    </Dial>
  );
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      aria-label={`${d.weekday}, ${d.day} January${isToday ? " (today)" : ""}`}
      onClick={onPick}
      className="sch-dial-btn relative flex w-[116px] flex-col items-center gap-2 md:w-[140px] md:gap-2.5"
      style={{ opacity: selected ? 1 : 0.55 }}
    >
      <span className="md:hidden">{face(true)}</span>
      <span className="hidden md:block">{face(false)}</span>
      <span className={`font-taiganja text-[10px] uppercase tracking-[0.22em] md:text-[12px] md:tracking-[0.24em] ${selected ? "text-gold" : "text-parchment/70"}`}>
        <span className="md:hidden">{d.short}</span>
        <span className="hidden md:inline">{d.weekday}</span>
      </span>
      {isToday && <LiveTag className="-mt-0.5 !px-3.5 !text-[8px]">Today</LiveTag>}
    </button>
  );
}

function EmptyDay({ text }: { text: string }) {
  return (
    <p className="mt-6 border border-dashed border-gold/35 bg-[rgba(4,12,16,0.6)] px-6 py-8 text-center font-display text-[20px] italic text-parchment/70 md:text-[22px]">
      {text}
    </p>
  );
}

function Untimed({ events, venueName, indent }: { events: ScheduleEvent[]; venueName: (key: string | null) => string; indent: boolean }) {
  if (!events.length) return null;
  return (
    <div className={`mt-9 ${indent ? "md:pl-[140px]" : ""}`}>
      <div className="flex items-center gap-3.5">
        <p className="font-taiganja text-[9.5px] uppercase tracking-[0.24em] text-gold md:text-[11px] md:tracking-[0.26em]">Also today · time to be announced</p>
        <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-gold/45 to-transparent" />
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {events.map((e) => (
          <TransitionLink key={e.slug} href={`/events/${e.slug}`} className="block">
            <span className="sch-card flex items-center gap-3.5 py-2.5 pl-2.5 pr-6" data-dashed>
              <Medallion art={e.art} dashed className="h-[52px] w-[52px] md:h-[58px] md:w-[58px]" />
              <span>
                <span className="block font-taiganja text-[8.5px] uppercase tracking-[0.2em] text-[#c9a86a] md:text-[9.5px]">
                  {e.world}
                  {e.kind && ` · ${e.kind}`}
                </span>
                <span className="sch-name mt-0.5 block font-display text-[22px] font-semibold leading-[1.05] md:text-[25px]">{e.name}</span>
                <span className="mt-0.5 block text-[12px] text-parchment/60 md:text-[13px]">
                  {e.venue ? venueName(e.venue) : "Venue TBA"} · time TBA
                </span>
              </span>
            </span>
          </TransitionLink>
        ))}
      </div>
    </div>
  );
}

/** The landing's finale landscape closes the page. */
function Finale() {
  return (
    <div aria-hidden className="pointer-events-none relative h-[230px] md:h-[360px]">
      <img
        src={ASSETS.cloudinary.bottom}
        alt=""
        className="absolute bottom-0 left-1/2 w-[160%] max-w-none -translate-x-1/2 opacity-60 [mask-image:linear-gradient(to_bottom,transparent_38%,#000_70%)] md:w-full"
      />
    </div>
  );
}
