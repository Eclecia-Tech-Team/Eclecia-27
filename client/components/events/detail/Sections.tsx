/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import { TransitionLink } from "@/components/common/TransitionLink";
import { ASSETS } from "@/constants/assets";
import { atlasArt } from "@/constants/events";
import { PLACE_LABEL } from "@/lib/admin/result-places";
import type { EventPageData } from "@/lib/event-page";
import { EventPlanet } from "./EventWorld";
import { WorldButton } from "./PageActions";
import { initials, known, phone, postedOn, prizeOf, type PageEvent } from "@/lib/event-format";

/* ---- Ticket ---------------------------------------------------------------- */

/** The four things people look for first, printed like the festival pass, with the prize pool on a tear-off stub. */
export function Ticket({ event, format, entry }: { event: PageEvent; format: string; entry: { value: string; note?: string } }) {
  const when = [event.date, event.time].filter(known).join(" · ");
  const where = known(event.venue) ? event.venue : "";
  const duration = known(event.duration) ? `Duration: ${event.duration}` : undefined;
  const prize = prizeOf(event);

  return (
    <div className="ev-ticket ev-rise" style={{ animationDelay: "240ms" }}>
      <dl className="ev-ticket-facts">
        {/* Nothing fixed yet: one honest line instead of two empty cells. */}
        {!when && !where ? (
          <Fact icon={<CalendarIcon />} label="When & where" value="" note={duration} wide />
        ) : (
          <>
            <Fact icon={<CalendarIcon />} label="When" value={when} note={duration} />
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
export function Panel({ id, title, meta, children }: { id: string; title: string; meta?: string; children: ReactNode }) {
  return (
    <section id={id} className="ev-panel" aria-labelledby={`${id}-heading`}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={`${id}-heading`} className="ev-panel-title">
          {title}
        </h2>
        {meta && <span className="ev-label">{meta}</span>}
      </div>
      <span aria-hidden className="ev-orn" />
      {children}
    </section>
  );
}

const RANK: Record<string, string> = {
  [PLACE_LABEL.winner]: "I",
  [PLACE_LABEL.runner_up]: "II",
  [PLACE_LABEL.second_runner_up]: "III",
};

export function Results({ results }: { results: NonNullable<EventPageData["results"]> }) {
  return (
    <Panel id="results" title="Results" meta="Announced">
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
    <Panel id="notices" title="Notices" meta={notices.length ? `${notices.length} posted` : undefined}>
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
    <Panel id="coordinators" title="Coordinators" meta="Tap to call">
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
    <section className="ev-more" aria-labelledby="more-heading">
      {/* The mask-and-sitar banners frame the heading, mirrored, as they frame the eclipse at dusk on the landing. */}
      <img src={ASSETS.cloudinary.banner} alt="" aria-hidden loading="lazy" draggable={false} className="ev-more-banner" data-side="left" />
      <img src={ASSETS.cloudinary.banner} alt="" aria-hidden loading="lazy" draggable={false} className="ev-more-banner" data-side="right" />
      <div className="relative flex flex-col items-center text-center">
        <p className="ev-eyebrow">The rest of {category.name}</p>
        <h2 id="more-heading" className="mt-3 font-display text-[34px] font-semibold leading-tight text-parchment md:text-[44px]">
          More from this world
        </h2>
        <img src={ASSETS.cloudinary.divider} alt="" aria-hidden draggable={false} className="pointer-events-none -my-5 w-64 max-w-none select-none" />
      </div>
      <ul className="ev-orbit-row" role="list">
        {siblings.map((s) => (
          <li key={s.slug}>
            <TransitionLink href={`/events/${s.slug}`} className="group flex flex-col items-center gap-3 text-center">
              <EventPlanet art={s.art} />
              <span className="font-taiganja text-[15px] text-parchment transition-colors group-hover:text-gold">{s.name}</span>
              <span className="-mt-2 text-[12px] text-parchment/50">{s.kind}</span>
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

/** The landing's closing landscape: the hills and the road, with the veena and the mudra hand in front. */
export function Finale() {
  return (
    <div className="ev-finale" aria-hidden>
      <img className="ev-finale-hills" src={ASSETS.cloudinary.bottom} alt="" loading="lazy" draggable={false} />
      <img className="ev-finale-veena" src={ASSETS.cloudinary.veena} alt="" loading="lazy" draggable={false} />
      <img className="ev-finale-hand" src={ASSETS.cloudinary.hand} alt="" loading="lazy" draggable={false} />
    </div>
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
