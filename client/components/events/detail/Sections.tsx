/* eslint-disable @next/next/no-img-element */
import type { CSSProperties, ReactNode } from "react";
import { GoldButton } from "@/components/common/GoldButton";
import { TransitionLink } from "@/components/common/TransitionLink";
import { ASSETS } from "@/constants/assets";
import { atlasArt } from "@/constants/events";
import { PLACE_LABEL } from "@/lib/admin/result-places";
import { depth } from "@/lib/depth";
import type { EventPageData } from "@/lib/event-page";
import { EventNiche } from "./EventWorld";
import { JumpButton, WorldButton } from "./PageActions";
import { initials, known, phone, postedOn, prizeOf, type PageEvent } from "@/lib/event-format";

/* ---- Ticket ---------------------------------------------------------------- */

/** The four things people look for first, printed like the festival pass, with the prize pool on a tear-off stub. */
export function Ticket({ event, format, entry }: { event: PageEvent; format: string; entry: { value: string; note?: string } }) {
  // The day on its own line ("16 January 2027") and the time under it ("2:30 PM – 4:00 PM"):
  // joined they wrap badly in a narrow cell. No time yet: the duration, if known.
  const date = known(event.date) ? event.date : "";
  const time = known(event.time) ? event.time : known(event.duration) ? `Duration: ${event.duration}` : undefined;
  const where = known(event.venue) ? event.venue : "";
  const prize = prizeOf(event);

  return (
    <div className="ev-ticket">
      {/* One sweep of light across the foil once the ticket has landed, and again on hover. */}
      <span aria-hidden className="ev-ticket-sheen" />
      <dl className="ev-ticket-facts">
        {/* Nothing fixed yet: one honest line instead of two empty cells. */}
        {!date && !where ? (
          <Fact icon={<CalendarIcon />} label="When & where" value="" wide />
        ) : (
          <>
            <Fact icon={<CalendarIcon />} label="When" value={date} note={date ? time : undefined} />
            <Fact icon={<PinIcon />} label="Where" value={where} />
          </>
        )}
        <Fact icon={<PeopleIcon solo={!event.isTeamEvent} />} label="Format" value={format} />
        <Fact icon={<TicketIcon />} label="Entry" value={entry.value} note={entry.note} />
      </dl>
      {prize && (
        <div className="ev-ticket-stub">
          <img src={ASSETS.cloudinary.minisun} alt="" aria-hidden draggable={false} className="ev-stub-sun" />
          <div>
            <span className="ev-label">Prize pool</span>
            <span className="ev-ticket-prize">{prize}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Fact({ icon, label, value, note, wide }: { icon: ReactNode; label: string; value: string; note?: string; wide?: boolean }) {
  return (
    <div className={`ev-fact${wide ? " ev-fact-wide" : ""}`}>
      <dt className="ev-label flex items-center gap-2">
        <span className="text-gold/80">{icon}</span>
        {label}
      </dt>
      <dd className="ev-fact-value" data-tba={value ? undefined : ""}>
        {value || "To be announced"}
      </dd>
      {note && <dd className="ev-fact-note">{note}</dd>}
    </div>
  );
}

/* ---- Panels ------------------------------------------------------------------ */

/** Reading panel: foil-edged chamber with corner brackets and an ornament under the title. */
export function Panel({
  id,
  kicker,
  title,
  meta,
  children,
}: {
  id: string;
  /** Small gold line above the title ("Before you register"). */
  kicker?: string;
  title: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="ev-panel" aria-labelledby={`${id}-heading`}>
      <div className="flex items-end justify-between gap-4">
        <div>
          {kicker && <p className="ev-eyebrow mb-3">{kicker}</p>}
          <h2 id={`${id}-heading`} className="ev-panel-title">
            {title}
          </h2>
        </div>
        {meta && <span className="ev-label pb-1">{meta}</span>}
      </div>
      <LotusRule />
      {children}
    </section>
  );
}

/** Ornament under a panel title: a lotus bud (the GoldButton finial) on a rule that fades out. */
function LotusRule() {
  return (
    <span aria-hidden className="ev-orn">
      <svg width="22" height="14" viewBox="0 0 22 14">
        <path d="M11 1 C13.6 4.2 13.6 9.6 11 13 C8.4 9.6 8.4 4.2 11 1 Z" fill="#d9a441" />
        <path d="M5.5 4.5 C9 6.6 9.6 10 9.2 13 C6.6 11.6 5.2 8.4 5.5 4.5 Z" fill="#d9a441" opacity="0.65" />
        <path d="M16.5 4.5 C13 6.6 12.4 10 12.8 13 C15.4 11.6 16.8 8.4 16.5 4.5 Z" fill="#d9a441" opacity="0.65" />
      </svg>
    </span>
  );
}

const RANK: Record<string, string> = {
  [PLACE_LABEL.winner]: "I",
  [PLACE_LABEL.runner_up]: "II",
  [PLACE_LABEL.second_runner_up]: "III",
};

export function Results({ results }: { results: NonNullable<EventPageData["results"]> }) {
  return (
    <Panel id="results" kicker="The winners" title="Results" meta="Announced">
      <ol role="list" className="grid gap-4 sm:grid-cols-2">
        {results.map((r, i) => {
          const winner = i === 0 && r.place === PLACE_LABEL.winner;
          const headline = r.teamName || r.names.join(", ");
          return (
            <li key={i} className={`ev-result${winner ? " ev-result-winner sm:col-span-2" : ""}`}>
              <span className="ev-rank" aria-hidden>
                {winner && <img src={atlasArt.shared("corona-halo")} alt="" className="ev-rank-halo" />}
                <span className="ev-rank-mark">{RANK[r.place] ?? "✦"}</span>
              </span>
              <div className="min-w-0">
                <p className="ev-label">
                  <span className="text-gold">{r.place}</span>
                </p>
                <p className={`mt-1.5 font-display font-semibold leading-tight text-parchment ${winner ? "text-[34px]" : "text-[24px]"}`}>{headline}</p>
                {r.teamName && r.names.length > 0 && <p className="mt-1 text-[14px] text-parchment/65">{r.names.join(", ")}</p>}
                {r.note && <p className="mt-1 text-[13px] italic text-parchment/55">{r.note}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

export function Notices({ notices }: { notices: EventPageData["notices"] }) {
  return (
    <Panel id="notices" kicker="From the organisers" title="Notices" meta={notices.length ? `${notices.length} posted` : undefined}>
      {notices.length ? (
        <ol role="list" className="flex flex-col gap-6">
          {notices.map((n) => (
            <li key={n.id} className="ev-notice" data-tone={n.tone}>
              <div className="ev-label flex flex-wrap items-center gap-x-3 gap-y-1">
                <time dateTime={n.postedAt}>{postedOn(n.postedAt)}</time>
                {n.pinned && <span className="text-gold">Pinned</span>}
                {n.tone === "important" && <span className="text-gold">Important</span>}
                {n.tone === "update" && <span className="text-[#8fb7c9]">Update</span>}
                {n.festWide && <span>All events</span>}
              </div>
              <div className="ev-notice-body">
                <p className="text-[17px] font-medium leading-snug text-parchment">{n.title}</p>
                <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-parchment/75">{n.body}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-[15px] leading-relaxed text-parchment/60">
          Nothing yet. Timing changes, venue updates and results for this event will be posted here.
        </p>
      )}
    </Panel>
  );
}

export function Coordinators({ pocs }: { pocs: PageEvent["pocs"] }) {
  return (
    <Panel id="coordinators" kicker="Need help?" title="Coordinators">
      <ul role="list" className="-my-1 flex flex-col">
        {pocs.map((p) => {
          const tel = phone(p.mobile);
          return (
            <li key={`${p.name}-${p.mobile}`} className="border-t border-gold/10 first:border-t-0">
              <a href={tel.href} className="group flex min-h-16 items-center gap-4 py-3">
                <span aria-hidden className="ev-initials">
                  {initials(p.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[19px] font-semibold leading-tight text-parchment">{p.name}</span>
                  <span className="mt-0.5 block font-mono text-[12.5px] tracking-[0.04em] text-gold transition-colors group-hover:text-parchment">
                    {tel.label}
                  </span>
                </span>
                <span aria-hidden className="ev-call">
                  <PhoneIcon />
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/* ---- More from this world ------------------------------------------------------ */

export function MoreFromWorld({
  category,
  slug,
  siblings,
}: {
  category: NonNullable<EventPageData["category"]>;
  slug: string;
  siblings: EventPageData["siblings"];
}) {
  return (
    <section className="ev-more" aria-labelledby="more-heading" data-reveal="">
      {/* The mask-and-sitar banners frame the heading, mirrored, as they frame the eclipse at dusk on the
          landing; they part like curtains as the section arrives and sway a little after. */}
      <img src={ASSETS.cloudinary.banner} alt="" aria-hidden loading="lazy" draggable={false} className="ev-more-banner" data-side="left" />
      <img src={ASSETS.cloudinary.banner} alt="" aria-hidden loading="lazy" draggable={false} className="ev-more-banner" data-side="right" />
      <div className="ev-more-head relative flex flex-col items-center text-center">
        <p className="ev-eyebrow">The rest of {category.name}</p>
        <h2 id="more-heading" className="ev-section-title mt-3">
          More from <span className="ev-script">this world</span>
        </h2>
        <img src={ASSETS.cloudinary.divider} alt="" aria-hidden draggable={false} className="pointer-events-none -my-5 w-64 max-w-none select-none" />
      </div>
      {/* An arcade of small stages, one per event; swipeable on phones. */}
      <ul className="ev-arcade" role="list">
        {siblings.map((s, i) => (
          <li key={s.slug} style={{ "--i": i } as CSSProperties}>
            <TransitionLink href={`/events/${s.slug}`} className="group flex flex-col items-center text-center">
              <EventNiche art={s.art} />
              <span className="ev-niche-name">{s.name}</span>
              <span className="ev-label mt-1.5 text-gold/75">{s.kind}</span>
            </TransitionLink>
          </li>
        ))}
      </ul>
      <div className="mt-10 flex justify-center">
        <WorldButton category={category.id} event={slug}>
          Explore {category.name}
        </WorldButton>
      </div>
    </section>
  );
}

/* ---- The way in, and the closing scene --------------------------------------- */

/** Where a visitor stands with this event; decides the button and the closing line. */
export type Standing = "results" | "registered" | "soon" | "signin" | "open";

/**
 * The one next step for this visitor: a gold button, or a line of text while
 * registration is closed (never a button that does nothing). Used by the hero
 * and the closing scene, so the two always agree with the registration card.
 */
export function WayIn({ standing, loginHref }: { standing: Standing; loginHref: string }) {
  switch (standing) {
    case "results":
      return <JumpButton to="results" variant="ghost">See the results</JumpButton>;
    case "registered":
      return <JumpButton to="register" variant="ghost">View your registration</JumpButton>;
    case "soon":
      return <p className="ev-soon">Registrations open soon</p>;
    case "signin":
      return <GoldButton href={loginHref}>Register now</GoldButton>;
    default:
      return <JumpButton to="register">Register now</JumpButton>;
  }
}

/** The closing line: a plain half and a half in the gold script. */
const CLOSING: Record<Standing, [string, string]> = {
  open: ["The stage is set,", "take your place"],
  signin: ["The stage is set,", "take your place"],
  soon: ["The stage is being set,", "see you soon"],
  registered: ["Your place is saved,", "see you on stage"],
  results: ["The curtain has fallen,", "until next time"],
};

/**
 * How the page ends, as the landing does: the eclipse setting behind the hills
 * and the road, the veena and the mudra hand in front, one closing line and
 * the way in once more for whoever read all the way down.
 */
export function Closing({ standing, loginHref }: { standing: Standing; loginHref: string }) {
  const [line, script] = CLOSING[standing];
  return (
    <section className="ev-closing" aria-labelledby="closing-heading" data-reveal="">
      <div className="ev-closing-copy">
        <h2 id="closing-heading" className="ev-section-title">
          {line} <span className="ev-script block">{script}</span>
        </h2>
        {standing !== "soon" && (
          <div id="closing-cta" className="ev-closing-cta">
            <WayIn standing={standing} loginHref={loginHref} />
          </div>
        )}
      </div>
      <div className="ev-closing-scene" aria-hidden>
        <div className="ev-closing-eclipse">
          <img className="ev-closing-rays" src={ASSETS.cloudinary.blacksun} alt="" loading="lazy" draggable={false} />
          <img className="ev-closing-disc" src={ASSETS.cloudinary.blacksun2} alt="" loading="lazy" draggable={false} />
        </div>
        <img className="ev-closing-hills" src={ASSETS.cloudinary.bottom} alt="" loading="lazy" draggable={false} style={depth(6, 1.04)} />
        <img className="ev-closing-veena" src={ASSETS.cloudinary.veena} alt="" loading="lazy" draggable={false} style={depth(-12)} />
        <img className="ev-closing-hand" src={ASSETS.cloudinary.hand} alt="" loading="lazy" draggable={false} style={depth(-16)} />
      </div>
    </section>
  );
}

/* ---- Icons (thin line, inherit colour) ----------------------------------------- */

const icon = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function CalendarIcon() {
  return (
    <svg aria-hidden {...icon}>
      <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg aria-hidden {...icon}>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  );
}
function PeopleIcon({ solo }: { solo: boolean }) {
  return solo ? (
    <svg aria-hidden {...icon}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </svg>
  ) : (
    <svg aria-hidden {...icon}>
      <circle cx="9" cy="8.5" r="3" />
      <circle cx="16.5" cy="9.5" r="2.4" />
      <path d="M3.5 19.5c.7-3.1 2.9-4.8 5.5-4.8s4.8 1.7 5.5 4.8M14.5 14.9c2.6-.4 5 1 5.8 4.1" />
    </svg>
  );
}
function TicketIcon() {
  return (
    <svg aria-hidden {...icon}>
      <path d="M3.5 7.5h17v3a2 2 0 0 0 0 3v3h-17v-3a2 2 0 0 0 0-3z" />
      <path d="M14 7.5v9" strokeDasharray="1.5 2" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}
