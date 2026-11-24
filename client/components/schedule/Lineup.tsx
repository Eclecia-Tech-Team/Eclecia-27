"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { GoldButton } from "@/components/common/GoldButton";
import { TransitionLink } from "@/components/common/TransitionLink";
import { ASSETS } from "@/constants/assets";
import type { ScheduleData, ScheduleDay, ScheduleEvent } from "@/lib/schedule";
import { ART, Dial, Divider, Eclipse, Medallion, FestDates } from "./bits";
import { WorldCarousel } from "./WorldCarousel";

const reducedMotion = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Scroll progress through the opening stage (0 at the top, 1 after `distance`
 * px), written to `--sp` on the element so the curtains can part without
 * re-rendering on every scroll.
 */
function useStageScroll(distance: number) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      el.style.setProperty("--sp", Math.min(1, Math.max(0, window.scrollY / distance)).toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [distance]);
  return ref;
}

/** Rises and fades in the first time it scrolls into view. */
function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`sch-reveal ${className}`} data-shown={shown || undefined} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/** Whole days from `from` to `to` ("2027-01-15" dates). */
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

/**
 * Before anything has a day: the stage is being set. Two mirrored
 * mask-and-sitar banners frame the eclipse and part like curtains as you
 * scroll; then the three days, then the whole line-up world by world.
 */
export function Lineup({ data, nowDate }: { data: ScheduleData; nowDate: string }) {
  const count = data.worlds.reduce((n, w) => n + w.events.length, 0);
  const stage = useStageScroll(620);
  return (
    <>
      <section ref={stage} className="sch-stage relative mx-auto w-full max-w-6xl px-4 text-center md:px-8">
        <div className="relative flex items-center justify-center gap-6 md:gap-11">
          <span className="sch-curtain" data-side="left">
            <img
              src={ASSETS.cloudinary.banner}
              alt=""
              aria-hidden
              className="sch-sway pointer-events-none -mx-10 h-[236px] w-auto max-w-none -scale-x-100 drop-shadow-[0_14px_30px_rgba(0,0,0,0.6)] md:mx-0 md:h-[400px]"
            />
          </span>
          <div className="sch-stage-eclipse relative shrink-0">
            <span aria-hidden className="sch-stage-glow pointer-events-none absolute -inset-[22%] rounded-full bg-[radial-gradient(circle,rgba(240,201,109,0.28)_0%,rgba(217,164,65,0.1)_40%,transparent_68%)]" />
            <Eclipse className="w-[228px] md:w-[370px]">
              <div className="sch-stage-text flex flex-col items-center">
              <p className="font-taiganja text-[8.5px] uppercase tracking-[0.34em] text-gold md:text-[10px]">
                Eclecia<span className="font-display tracking-normal">’</span>27
              </p>
              <FestDates className="mt-2.5 text-[30px] md:mt-3.5 md:text-[54px]" />
              <p className="mt-2 font-taiganja text-[10px] uppercase tracking-[0.3em] text-[#e5c88b] md:mt-2.5 md:text-[13px]">January</p>
              </div>
            </Eclipse>
          </div>
          <span className="sch-curtain" data-side="right">
            <img
              src={ASSETS.cloudinary.banner}
              alt=""
              aria-hidden
              className="sch-sway pointer-events-none -mx-10 h-[236px] w-auto max-w-none drop-shadow-[0_14px_30px_rgba(0,0,0,0.6)] md:mx-0 md:h-[400px]"
            />
          </span>
        </div>

        <div className="sch-stage-title text-panel-shadow mt-4">
          <p className="font-taiganja text-[11px] uppercase tracking-[0.34em] text-gold md:text-[12px]">Schedule</p>
          <h1 className="mt-3 font-display text-[46px] font-semibold leading-[0.95] tracking-[-0.02em] md:mt-4 md:text-[84px] md:leading-[0.92]">
            The programme
            <span className="mt-2 block font-nasyhama text-[29px] font-normal leading-[1.15] tracking-normal text-gold md:mt-3 md:text-[54px]">is still being written</span>
          </h1>
          <Divider className="mx-auto -my-6 w-72 md:-my-9 md:w-105" />
          <p className="mx-auto max-w-[58ch] text-[15px] leading-relaxed text-parchment/78 md:text-[17px]">
            Stages are being booked and slots worked out. Times and venues land here the moment they’re fixed. Until then, here’s everything
            that’s happening across the three days.
          </p>
          <div className="mt-8">
            <GoldButton href="/events">Explore the events</GoldButton>
          </div>
        </div>
      </section>

      <section aria-label="The three days" className="mx-auto mt-14 grid w-full max-w-6xl gap-3 px-4 md:mt-24 md:grid-cols-3 md:gap-6 md:px-8">
        {data.days.map((d, i) => (
          <Reveal key={d.date} delay={i * 140}>
            <DayCard d={d} untilDays={daysBetween(nowDate, d.date)} />
          </Reveal>
        ))}
      </section>

      <section className="mx-auto mt-16 w-full max-w-6xl px-4 md:mt-24 md:px-8">
        <Reveal className="text-panel-shadow text-center">
          <p className="font-taiganja text-[10px] uppercase tracking-[0.3em] text-gold md:text-[12px]">
            {data.worlds.length} worlds · {count} events
          </p>
          <h2 className="mt-3 font-display text-[36px] font-semibold leading-none md:text-[56px]">
            The line-up <span className="font-nasyhama font-normal text-gold">so far</span>
          </h2>
          <Divider className="mx-auto -my-5 w-60 md:-my-7 md:w-96" />
        </Reveal>

        <Reveal delay={150}>
          <WorldCarousel worlds={data.worlds} />
        </Reveal>

          <Reveal>
          <article className="relative mx-auto mt-28 flex min-h-[260px] w-full max-w-[420px] flex-col justify-end border border-gold/50 bg-[radial-gradient(circle_at_50%_100%,rgba(124,32,27,0.32),rgba(4,10,14,0.96)_70%)] px-6 pb-8 pt-40 text-center shadow-[0_24px_50px_rgba(0,0,0,0.7)]">
            <img
              src={ASSETS.cloudinary.veena}
              alt=""
              aria-hidden
              className="pointer-events-none absolute -top-16 left-1/2 w-[290px] max-w-none -translate-x-1/2 drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]"
            />
            <p className="relative font-display text-[23px] italic leading-snug text-parchment/90 md:text-[25px]">
              Pick your events now. Their times land here first.
            </p>
            <div className="relative mt-5">
              <GoldButton href="/events" variant="ghost" size="sm">
                Explore events
              </GoldButton>
            </div>
          </article>
          </Reveal>
      </section>
    </>
  );
}

/** Events that have no day yet, while the rest of the programme is out. */
export function Unscheduled({ events }: { events: ScheduleEvent[] }) {
  if (!events.length) return null;
  return (
    <section className="mx-auto mt-20 w-full max-w-6xl px-4 md:mt-24 md:px-8">
      <div className="text-panel-shadow text-center">
        <p className="font-taiganja text-[10px] uppercase tracking-[0.3em] text-gold md:text-[12px]">Date to be announced</p>
        <h2 className="mt-3 font-display text-[32px] font-semibold leading-[1.05] md:text-[48px]">
          Still finding <span className="font-nasyhama font-normal text-gold">their slot</span>
        </h2>
        <Divider className="mx-auto -my-5 w-60 md:-my-7 md:w-90" />
      </div>
      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
        {events.map((e) => (
          <TransitionLink key={e.slug} href={`/events/${e.slug}`} className="block">
            <span className="sch-card flex items-center gap-3.5 py-2.5 pl-2.5 pr-6 md:gap-4 md:py-3.5 md:pl-3.5 md:pr-7" data-dashed>
              <Medallion art={e.art} dashed className="h-[52px] w-[52px] md:h-16 md:w-16" />
              <span>
                <span className="block font-taiganja text-[8.5px] uppercase tracking-[0.2em] text-[#c9a86a] md:text-[9.5px]">{e.world}</span>
                <span className="sch-name mt-0.5 block font-display text-[22px] font-semibold leading-[1.05] md:text-[26px]">{e.name}</span>
                {e.kind && <span className="mt-0.5 block text-[12px] text-parchment/60 md:text-[13px]">{e.kind}</span>}
              </span>
            </span>
          </TransitionLink>
        ))}
      </div>
    </section>
  );
}

/**
 * One fest day before its timings exist: the date in a chakra dial, a short
 * programme rail still being drawn in, and how long until the day arrives.
 */
function DayCard({ d, untilDays }: { d: ScheduleDay; untilDays: number }) {
  const countdown = untilDays > 1 ? `In ${untilDays} days` : untilDays === 1 ? "Tomorrow" : untilDays === 0 ? "Today" : null;
  const face = (small: boolean) => (
    <span className="sch-daycard-dial relative block">
      <img src={ART.corona} alt="" aria-hidden className="sch-daycard-glow pointer-events-none absolute -inset-[34%] h-[168%] w-[168%] max-w-none mix-blend-screen" />
      <Dial size={small ? 84 : 148}>
        <span className={`font-display font-semibold italic leading-none text-gold ${small ? "text-[11px]" : "text-[15px]"}`}>{d.roman}</span>
        <span className={`font-display font-semibold leading-none ${small ? "text-[28px]" : "text-[50px]"}`}>{d.day}</span>
        <span className={`font-taiganja uppercase text-[#e5c88b] ${small ? "text-[7px] tracking-[0.24em]" : "mt-0.5 text-[9.5px] tracking-[0.3em]"}`}>Jan</span>
      </Dial>
    </span>
  );

  return (
    <article className="sch-daycard group flex items-center gap-4 p-3 pr-4 md:flex-col md:gap-0 md:px-7 md:pb-7 md:pt-8 md:text-center">
      <span className="md:hidden">{face(true)}</span>
      <span className="hidden md:block">{face(false)}</span>

      <div className="relative min-w-0 flex-1 md:mt-5 md:w-full md:flex-none">
        <p className="font-taiganja text-[9.5px] uppercase tracking-[0.3em] text-gold md:text-[11px]">Day {d.roman}</p>
        <h2 className="mt-1 font-display text-[26px] font-semibold leading-[1.05] md:text-[38px]">{d.weekday}</h2>
        <p className="mt-0.5 font-display text-[15px] italic text-parchment/70 md:text-[18px]">{d.day} January</p>

        {/* The day's programme, still being drawn in */}
        <div aria-hidden className="relative mx-auto mt-6 hidden w-full max-w-[250px] md:block">
          <span className="absolute bottom-[18px] left-[58.5px] top-[18px] w-px -translate-x-1/2 bg-gold/40" />
          {[72, 54, 64].map((w, i) => (
            <div key={i} className="relative flex items-center gap-3 py-2">
              <span className="w-[42px] shrink-0 text-right font-display text-[15px] font-semibold tracking-[0.06em] text-parchment/35">– : –</span>
              <span className="relative z-[1] h-[9px] w-[9px] shrink-0 rotate-45 border border-gold/60 bg-[#041116]" />
              <span className="min-w-0 flex-1"><span className="sch-skel h-2.5" style={{ width: `${w + 20}%` }} /></span>
            </div>
          ))}
        </div>

        <div className="mt-1 flex items-center justify-between gap-3 md:mt-6 md:flex-col md:gap-2 md:border-t md:border-gold/15 md:pt-5">
          <p className="font-display text-[15px] italic text-parchment/75 md:text-[20px]">Timings to be announced</p>
          {countdown && (
            <p className="shrink-0 font-taiganja text-[9px] uppercase tracking-[0.26em] text-[#f0c96d] md:text-[10.5px]">{countdown}</p>
          )}
        </div>
      </div>
    </article>
  );
}
