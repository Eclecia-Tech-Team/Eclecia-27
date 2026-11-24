/* eslint-disable @next/next/no-img-element */
import { Fragment, type ReactNode } from "react";
import { ASSETS } from "@/constants/assets";
import { atlasArt } from "@/constants/events";
import { FEST_DAYS, clockParts } from "@/constants/schedule";
import type { ScheduleDay, ScheduleEvent } from "@/lib/schedule";

export const ART = {
  core: atlasArt.shared("eclipse-core"),
  corona: atlasArt.shared("corona-halo"),
  medallion: atlasArt.shared("medallion-base"),
  planet: atlasArt.shared("planet-base"),
  dust: atlasArt.shared("gold-dust"),
  chakra: ASSETS.cloudinary.chakraFrame || "/assets/opt/events/mobile/chakra-frame-v1.webp",
};

export type Status = "past" | "now" | "next" | "later";
export type FestNow = { date: string; minutes: number };

/** Where an event stands at fest time `now`. Null outside the fest (nothing is "live"). */
export function statusOf(day: string, e: ScheduleEvent, now: FestNow, live: boolean): Status | null {
  if (!live || e.start === null) return null;
  if (day < now.date) return "past";
  if (day > now.date) return "later";
  // No end time: treat it as an hour long for "happening now".
  const end = e.end ?? e.start + 60;
  if (end <= now.minutes) return "past";
  if (e.start <= now.minutes) return "now";
  if (e.start - now.minutes <= 60) return "next";
  return "later";
}

/** Today's events that are on right now, and the next few. */
export function liveLists(today: ScheduleDay, now: FestNow) {
  const onNow = today.timed.filter((e) => statusOf(today.date, e, now, true) === "now");
  const upNext = today.timed.filter((e) => e.start! > now.minutes).slice(0, 3);
  return { onNow, upNext };
}

export const progress = (e: ScheduleEvent, now: FestNow) => {
  const end = e.end ?? e.start! + 60;
  return Math.min(100, Math.max(0, Math.round(((now.minutes - e.start!) / (end - e.start!)) * 100)));
};

export function Clock({ minutes, className = "", apClass = "" }: { minutes: number; className?: string; apClass?: string }) {
  const { hm, ap } = clockParts(minutes);
  return (
    <span className={`whitespace-nowrap ${className}`}>
      <span className="font-display font-semibold">{hm}</span>
      <span className={`ml-1 font-taiganja text-[0.36em] tracking-[0.18em] text-[#e5c88b] ${apClass}`}>{ap}</span>
    </span>
  );
}

/** Event artwork on a small eclipse disc. */
export function Medallion({
  art,
  size,
  className = "",
  state,
  dashed,
}: {
  art: string;
  /** px; or size it with `className`. */
  size?: number;
  className?: string;
  state?: Status | null;
  dashed?: boolean;
}) {
  return (
    <span
      className={`sch-med ${className}`}
      style={size ? { width: size, height: size } : undefined}
      data-state={state ?? undefined}
      data-dashed={dashed || undefined}
    >
      <img className="sch-med-base" src={ART.core} alt="" aria-hidden />
      <span className="sch-med-ring" aria-hidden />
      <img className="sch-med-art" src={art} alt="" aria-hidden loading="lazy" />
    </span>
  );
}

/** The site's cusped lozenge (GoldButton's outline), filled crimson: marks what is live. */
export function LiveTag({ children, className = "", dot = true }: { children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={`relative inline-flex items-center gap-[7px] px-4 py-1 font-taiganja text-[9px] uppercase tracking-[0.26em] text-[#f6dfa8] ${className}`}>
      <svg aria-hidden viewBox="0 0 200 48" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
        <path d="M14 1 H186 L199 24 L186 47 H14 L1 24 Z" fill="#7c201b" stroke="rgba(240,201,109,0.9)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path d="M17 5 H183 L194 24 L183 43 H17 L6 24 Z" fill="none" stroke="rgba(240,201,109,0.3)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      {dot && <LiveDot className="relative" />}
      <span className="relative">{children}</span>
    </span>
  );
}

export function LiveDot({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`sch-pulse inline-block h-[6px] w-[6px] shrink-0 rounded-full bg-[#f0c96d] shadow-[0_0_8px_#f0c96d] ${className}`} />;
}

export function Diamond({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`inline-block h-[6px] w-[6px] rotate-45 bg-gold ${className}`} />;
}

/** The lotus divider used under titles across the site. */
export function Divider({ className = "" }: { className?: string }) {
  // The aspect ratio reserves its height before the image loads; without it the
  // negative margins that trim its transparent padding pull the next line up.
  return (
    <img
      src={ASSETS.cloudinary.divider}
      alt=""
      aria-hidden
      draggable={false}
      className={`pointer-events-none aspect-[1100/367] h-auto max-w-full select-none ${className}`}
    />
  );
}

export function PinIcon({ size = 14 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#d9a441" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

/** The eclipse from the landing page: corona rays with the slowly turning disc on top. */
export function Eclipse({ className = "", children }: { className?: string; children?: ReactNode }) {
  return (
    <div className={`relative aspect-square ${className}`}>
      <img src={ASSETS.cloudinary.blacksun} alt="" aria-hidden className="sch-breathe absolute inset-0 h-full w-full" />
      <img src={ASSETS.cloudinary.blacksun2} alt="" aria-hidden className="sch-spin absolute -left-[1%] -top-[1%] h-[102%] w-[102%] max-w-none" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/** Chakra ring around a dimmed medallion, with whatever goes in the middle. */
export function Dial({ size, glow, children }: { size: number; glow?: boolean; children: ReactNode }) {
  return (
    <span className="relative block shrink-0" style={{ width: size, height: size }}>
      {glow && (
        <img src={ART.corona} alt="" aria-hidden className="sch-breathe absolute -left-[32%] -top-[32%] h-[164%] w-[164%] max-w-none opacity-80 mix-blend-screen" />
      )}
      <img src={ART.medallion} alt="" aria-hidden className="absolute left-[14%] top-[14%] h-[72%] w-[72%] rounded-full brightness-50" />
      <img src={ART.chakra} alt="" aria-hidden className="sch-dial-art" />
      <span className="absolute inset-0 flex flex-col items-center justify-center [text-shadow:0_2px_8px_rgba(0,0,0,0.8)]">{children}</span>
    </span>
  );
}

/** The three fest dates, "15 ◆ 16 ◆ 17", for the eclipse. Size it with a text-[..] class; gaps follow. */
export function FestDates({ className = "" }: { className?: string }) {
  return (
    <p className={`flex items-center gap-[0.3em] font-display font-medium leading-none [text-shadow:0_0_26px_rgba(217,164,65,0.35)] ${className}`}>
      {FEST_DAYS.map((d, i) => (
        <Fragment key={d.date}>
          {i > 0 && <span aria-hidden className="block h-[0.13em] w-[0.13em] shrink-0 rotate-45 bg-gold" />}
          <span>{d.day}</span>
        </Fragment>
      ))}
    </p>
  );
}
