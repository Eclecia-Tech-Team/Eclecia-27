/* eslint-disable @next/next/no-img-element */
import { Suspense } from "react";
import { SiteHeader } from "@/components/common/Header";
import { SiteFooter } from "@/components/common/Footer";
import { PageFade } from "@/components/common/PageFade";
import { TransitionLink } from "@/components/common/TransitionLink";
import { Meteors } from "@/components/common/Meteors";
import { ASSETS } from "@/constants/assets";
import { atlasArt } from "@/constants/events";
import { depth } from "@/lib/depth";
import type { EventPageData } from "@/lib/event-page";
import { entryOf, formatOf, prizeOf } from "@/lib/event-format";
import { GoldButton } from "@/components/common/GoldButton";
import { EventOrbitPlanet, EventWorld } from "./EventWorld";
import { JumpButton, MobileRegisterBar, WorldLink } from "./PageActions";
import { RegistrationCard } from "./RegistrationCard";
import { RulesList } from "./RulesList";
import { Coordinators, Finale, MoreFromWorld, Notices, Panel, Results, Ticket } from "./Sections";
import "@/styles/event-page.css";

/**
 * /events/[id]: one event's page. The first screen keeps the atlas's planet
 * but is about taking part: the name, the story, and a Register now button
 * with the fee and prize beside it. Below it: the essentials on a pass-style
 * ticket, the registration card (sticky on desktop, straight after the ticket
 * on phones), results, rules, coordinators, notices (usually empty, so last),
 * the rest of the world, and the landing's closing landscape.
 */
export function EventDetail({ data }: { data: EventPageData }) {
  const { event, category, siblings, notices, results, viewer } = data;
  const registered = Boolean(viewer.registration);
  const canSignUp = event.isActive && !registered;
  const format = formatOf(event);
  const entry = entryOf(event);
  const here = `/events/${event.slug}`;
  // Phone bar: the visitor's next step, matching what the registration card asks for.
  const nextStep: { label: string; href?: string } = !viewer.signedIn
    ? { label: "Sign in", href: `/login?callbackUrl=${encodeURIComponent(here)}` }
    : !viewer.profileComplete
      ? { label: "Finish profile", href: `/profile?returnTo=${encodeURIComponent(here)}` }
      : { label: event.isTeamEvent ? "Register team" : "Register" };
  const meta = [event.kind, event.clubs.join(" × ")].filter(Boolean);
  const prize = prizeOf(event);

  return (
    <PageFade className="min-h-dvh">
      <div className="ev-page relative flex min-h-dvh flex-col overflow-x-clip bg-black text-parchment">
        {/* Sky: the events backdrop, drifting gold dust and meteors. */}
        <img
          src={ASSETS.cloudinary.eventsBackground || ASSETS.cloudinary.bg}
          alt=""
          aria-hidden
          className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-60"
          style={depth(14, 1.06)}
        />
        <img src={atlasArt.shared("gold-dust")} alt="" aria-hidden className="ev-dust" />
        <div className="pointer-events-none fixed inset-0" aria-hidden style={depth(14)}>
          <Meteors />
        </div>
        <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_65%_25%,transparent_25%,rgba(2,5,8,0.6)_85%)]" />
        <SiteHeader />

        <main className="relative z-10 flex-1">
          {/* First screen: the event's world, its name and the way in. */}
          <header className="ev-hero">
            <img src={atlasArt.shared("corona-halo")} alt="" aria-hidden className="ev-hero-corona" />

            <nav aria-label="Breadcrumb" className="ev-crumb">
              <TransitionLink href="/events" className="ev-crumb-back">
                <span aria-hidden>←</span> All events
              </TransitionLink>
              {category && (
                <>
                  <span aria-hidden className="ev-crumb-rule" />
                  <WorldLink category={category.id} event={event.slug} className="ev-crumb-world">
                    {category.name}
                  </WorldLink>
                </>
              )}
            </nav>

            {event.art && (
              <>
                <div className="ev-hero-planet ev-rise">
                  <EventOrbitPlanet art={event.art} />
                </div>
                <div className="ev-hero-world ev-rise">
                  <EventWorld art={event.art} />
                </div>
              </>
            )}

            <div className="ev-hero-copy ev-rise" style={{ animationDelay: "120ms" }}>
              <h1 className="ev-hero-title">{event.name}</h1>
              <p className="ev-hero-desc">{event.description}</p>
              {meta.length > 0 && (
                <p className="ev-hero-meta">
                  {meta.map((m) => (
                    <span key={m}>{m}</span>
                  ))}
                </p>
              )}

              {/* The way in, on the first screen: the button, with what it costs and what's at stake beside it. */}
              <div id="hero-cta" className="ev-hero-cta">
                {results ? (
                  <JumpButton to="results" variant="ghost">See the results</JumpButton>
                ) : registered ? (
                  <JumpButton to="register" variant="ghost">View your registration</JumpButton>
                ) : !event.isActive ? (
                  <p className="ev-soon">Registrations open soon</p>
                ) : !viewer.signedIn ? (
                  <GoldButton href={`/login?callbackUrl=${encodeURIComponent(here)}`}>Register now</GoldButton>
                ) : (
                  <JumpButton to="register">Register now</JumpButton>
                )}
                <p className="ev-hero-note">
                  <span className="ev-label">{`${entry.note ? `${entry.value} ${entry.note}` : "Free entry"} · ${format}`}</span>
                  {prize && (
                    <span className="ev-hero-prize">
                      {prize} <small>prize pool</small>
                    </span>
                  )}
                </p>
              </div>
            </div>
          </header>

          <div className="ev-body">
            <Ticket event={event} format={format} entry={entry} />

            {/* Phones: one column ordered registration → results → rules → coordinators → notices
                (notices are usually empty, so they go last). Desktop: reading on the left
                (results, rules, notices), registration + coordinators sticky on the right. */}
            <div className="mt-12 flex flex-col gap-7 lg:mt-14 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-12">
              <div className="contents lg:flex lg:flex-col lg:gap-9">
                {results && (
                  <div className="order-2">
                    <Results results={results} />
                  </div>
                )}
                <div className="order-3">
                  <Panel id="rules" title="Rules" meta={event.rules.length ? `${event.rules.length} in all` : undefined}>
                    {event.rules.length ? (
                      <RulesList rules={event.rules} />
                    ) : (
                      <p className="text-[15px] leading-relaxed text-parchment/60">The rules for this event will be published soon.</p>
                    )}
                    {event.doc && (
                      <a href={event.doc} target="_blank" rel="noopener noreferrer" className="ev-textlink mt-6 inline-flex">
                        Full rulebook <span aria-hidden>↗</span>
                      </a>
                    )}
                  </Panel>
                </div>
                <div className="order-5">
                  <Notices notices={notices} />
                </div>
              </div>

              <div className="contents lg:sticky lg:top-28 lg:flex lg:flex-col lg:gap-7">
                <div className="order-1">
                  <Suspense fallback={null}>
                    <RegistrationCard event={event} viewer={viewer} />
                  </Suspense>
                </div>
                {event.pocs.length > 0 && (
                  <div className="order-4">
                    <Coordinators pocs={event.pocs} />
                  </div>
                )}
              </div>
            </div>

            {category && siblings.length > 0 && <MoreFromWorld category={category} slug={event.slug} siblings={siblings} />}
          </div>
        </main>

        <Finale />
        {canSignUp && <MobileRegisterBar name={event.name} detail={`${format} · ${entry.value}`} label={nextStep.label} href={nextStep.href} />}
        <SiteFooter />
      </div>
    </PageFade>
  );
}
