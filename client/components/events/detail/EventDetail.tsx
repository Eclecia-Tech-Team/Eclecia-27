/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/common/Header";
import { SiteFooter } from "@/components/common/Footer";
import { PageFade } from "@/components/common/PageFade";
import { TransitionLink } from "@/components/common/TransitionLink";
import { Meteors } from "@/components/common/Meteors";
import { ASSETS } from "@/constants/assets";
import { depth } from "@/lib/depth";
import type { EventPageData } from "@/lib/event-page";
import { RegistrationCard } from "./RegistrationCard";
import { RulesList } from "./RulesList";
import "@/styles/event-page.css";

const TBA = new Set(["", "tba", "tbd"]);
const known = (value: string) => !TBA.has(value.trim().toLowerCase());

const postedOn = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));

/** Indian mobile numbers as "+91 98765 43210"; anything else unchanged. */
function phone(raw: string) {
  const digits = raw.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  return digits.length === 10
    ? { label: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`, href: `tel:+91${digits}` }
    : { label: raw, href: `tel:${raw.replace(/[^\d+]/g, "")}` };
}

/**
 * /events/[id]: one event's page. Hero with its atlas artwork, the facts,
 * notices, rules, coordinators and the registration panel, then the other
 * events of the same world.
 */
export function EventDetail({ data }: { data: EventPageData }) {
  const { event, category, siblings, notices } = data;
  const format = event.isTeamEvent
    ? `Team of ${event.minMembers === event.maxMembers ? event.maxMembers : `${event.minMembers}–${event.maxMembers}`}`
    : "Solo";
  const facts: [string, string][] = [
    ["Date", event.date],
    ["Time", event.time],
    ["Venue", event.venue],
    ["Duration", event.duration],
    ["Format", format],
    ["Entry", event.isPaidEvent && event.fees > 0 ? `₹${event.fees}` : "Free"],
    ["Prize pool", event.prizePool],
    ["Status", event.isActive ? "Registrations open" : "Opening soon"],
  ];

  return (
    <PageFade className="min-h-dvh">
      <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-black text-parchment">
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
        <SiteHeader />

        <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-5 pb-24 pt-28 md:px-8 md:pt-32">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[0.25em] text-parchment/55">
            <TransitionLink href="/events" className="transition-colors hover:text-gold">
              ← All events
            </TransitionLink>
            {category && (
              <>
                <span aria-hidden className="h-3 w-px bg-gold/40" />
                <span className="text-gold/80">{category.name}</span>
              </>
            )}
          </nav>

          {/* Hero */}
          <header className="mt-8 grid items-center gap-10 md:mt-10 md:grid-cols-[minmax(0,1fr)_minmax(0,360px)] md:gap-14">
            <div>
              <p className="ev-eyebrow">
                {[category?.kind, event.kind].filter(Boolean).join(" · ") || "Eclecia'27"}
              </p>
              <h1 className="mt-4 font-display text-[48px] font-semibold leading-[0.95] tracking-[-0.02em] text-parchment md:text-[76px]">
                {event.name}
              </h1>
              <p className="mt-6 max-w-[56ch] text-[17px] leading-relaxed text-parchment/80 md:text-[19px]">{event.description}</p>
              {event.clubs.length > 0 && (
                <p className="mt-5 text-[14px] text-parchment/60">
                  Hosted by <span className="text-parchment/90">{event.clubs.join(" × ")}</span>
                </p>
              )}
            </div>
            {event.art && (
              <div className="ev-medallion mx-auto w-[min(72vw,340px)] md:w-full">
                <img src={event.art} alt="" draggable={false} />
              </div>
            )}
          </header>

          {/* Facts */}
          <dl className="ev-facts mt-12 md:mt-14">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.28em] text-parchment/50">{label}</dt>
                <dd className={`mt-2 text-[16px] leading-snug ${known(value) ? "text-parchment" : "text-parchment/45 italic"}`}>
                  {known(value) ? value : "To be announced"}
                </dd>
              </div>
            ))}
          </dl>

          {/* Body */}
          <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
            <div className="flex flex-col gap-8">
              {data.results && (
                <Section title="Results" id="results">
                  <ol className="flex flex-col gap-5">
                    {data.results.map((r, i) => (
                      <li key={i} className="grid grid-cols-[7.5rem_1fr] gap-4 max-sm:grid-cols-1 max-sm:gap-1">
                        <span className="pt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-gold">{r.place}</span>
                        <div>
                          {r.teamName && <p className="font-display text-[22px] leading-tight text-parchment">{r.teamName}</p>}
                          {r.names.length > 0 && (
                            <p className={r.teamName ? "mt-1 text-[14px] text-parchment/65" : "font-display text-[22px] leading-tight text-parchment"}>
                              {r.names.join(", ")}
                            </p>
                          )}
                          {r.note && <p className="mt-1 text-[13px] italic text-parchment/55">{r.note}</p>}
                        </div>
                      </li>
                    ))}
                  </ol>
                </Section>
              )}

              <Section title="Notices" id="notices">
                {notices.length ? (
                  <ul className="flex flex-col gap-4">
                    {notices.map((n) => (
                      <li key={n.id} className="ev-notice py-1 pl-4 pr-2" data-tone={n.tone}>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.25em] text-parchment/50">
                          <time dateTime={n.postedAt}>{postedOn(n.postedAt)}</time>
                          {n.pinned && <span className="text-gold">Pinned</span>}
                          {n.tone === "important" && <span className="text-gold">Important</span>}
                          {n.tone === "update" && <span className="text-[#8fb7c9]">Update</span>}
                          {n.festWide && <span>All events</span>}
                        </div>
                        <p className="mt-1.5 text-[17px] font-medium leading-snug text-parchment">{n.title}</p>
                        <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-parchment/75">{n.body}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[15px] leading-relaxed text-parchment/60">
                    No notices yet. Timing changes, venue updates and results for this event will be posted here.
                  </p>
                )}
              </Section>

              <Section title="Rules" id="rules">
                {event.rules.length ? (
                  <RulesList rules={event.rules} />
                ) : (
                  <p className="text-[15px] leading-relaxed text-parchment/60">The rules for this event will be published soon.</p>
                )}
                {event.doc && (
                  <a
                    href={event.doc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex items-center gap-3 border border-gold/40 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.25em] text-gold transition-colors hover:border-gold hover:text-parchment"
                  >
                    Full rulebook <span aria-hidden>↗</span>
                  </a>
                )}
              </Section>
            </div>

            {/* Phones: registration right after the facts; desktop: sticky right column. */}
            <aside className="order-first flex flex-col gap-8 lg:sticky lg:top-28 lg:order-none lg:self-start">
              <RegistrationCard event={event} viewer={data.viewer} />

              {event.pocs.length > 0 && (
                <Section title="Coordinators" id="coordinators">
                  <ul className="flex flex-col gap-3">
                    {event.pocs.map((p) => {
                      const tel = phone(p.mobile);
                      return (
                        <li key={`${p.name}-${p.mobile}`} className="flex items-center justify-between gap-4 text-[15px]">
                          <span className="text-parchment/90">{p.name}</span>
                          <a href={tel.href} className="font-mono text-[13px] tracking-[0.06em] text-gold hover:text-parchment">
                            {tel.label}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </Section>
              )}
            </aside>
          </div>

          {/* More from this world */}
          {category && siblings.length > 0 && (
            <section className="mt-20" aria-labelledby="more-heading">
              <p className="ev-eyebrow">More from {category.name}</p>
              <h2 id="more-heading" className="mt-3 font-display text-[32px] leading-tight text-parchment md:text-[40px]">
                {category.line}
              </h2>
              <ul className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
                {siblings.map((s) => (
                  <li key={s.slug}>
                    <TransitionLink href={`/events/${s.slug}`} className="group flex flex-col items-center gap-3 text-center">
                      <span className="ev-medallion w-full max-w-[150px] transition-transform duration-500 group-hover:-translate-y-1.5">
                        <img src={s.art} alt="" loading="lazy" draggable={false} />
                      </span>
                      <span className="font-taiganja text-[15px] text-parchment transition-colors group-hover:text-gold">{s.name}</span>
                      <span className="-mt-2 text-[12px] text-parchment/50">{s.kind}</span>
                    </TransitionLink>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>

        <SiteFooter />
      </div>
    </PageFade>
  );
}

function Section({ title, id, children }: { title: string; id: string; children: ReactNode }) {
  return (
    <section className="ev-card p-6 sm:p-7" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="ev-eyebrow mb-5">
        {title}
      </h2>
      {children}
    </section>
  );
}
