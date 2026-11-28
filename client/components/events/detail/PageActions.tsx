"use client";

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { GoldActionButton, GoldButton } from "@/components/common/GoldButton";
import { TransitionLink } from "@/components/common/TransitionLink";
import { saveAtlasSpot } from "@/components/events/atlas/atlas-spot";

/** Scrolls to a section on this page (smoothly, unless the visitor prefers less motion). */
function jump(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
}

/** Gold button that glides to a section of this page instead of navigating. */
export function JumpButton({ to, variant = "solid", children }: { to: string; variant?: "solid" | "ghost"; children: ReactNode }) {
  return (
    <GoldActionButton variant={variant} onClick={() => jump(to)}>
      {children}
    </GoldActionButton>
  );
}

/**
 * Link back to the atlas that reopens it inside this event's world (the atlas
 * reads the saved spot), even when the visitor arrived from a shared link.
 */
export function WorldLink({
  category,
  event,
  className,
  children,
}: {
  category: string;
  event: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <TransitionLink href="/events" className={className} onClick={() => saveAtlasSpot({ category, event })}>
      {children}
    </TransitionLink>
  );
}

/** WorldLink's gold-button form, for the end of the page. */
export function WorldButton({ category, event, children }: { category: string; event: string; children: ReactNode }) {
  return (
    <GoldButton href="/events" variant="ghost" onClick={() => saveAtlasSpot({ category, event })}>
      {children}
    </GoldButton>
  );
}

/**
 * Scroll reveals, the way the schedule page does them: blocks marked
 * `data-reveal` rise and fade in the first time they scroll into view.
 *
 * Nothing is hidden by the markup or the stylesheet alone. Only blocks that
 * are below the fold when the page mounts are set to "wait" (they are off
 * screen, so nothing blinks) and they switch to "in" as they arrive; a check
 * at the end of every scroll shows any block the observer somehow missed.
 * Reduced motion: does nothing at all, everything simply stays visible.
 */
export function RevealOnScroll() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const blocks = [...document.querySelectorAll<HTMLElement>(".ev-page [data-reveal]")];
    const fold = window.innerHeight * 0.95;
    const show = (el: HTMLElement) => {
      el.dataset.reveal = "in";
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    const waiting: HTMLElement[] = [];
    for (const el of blocks) {
      if (el.getBoundingClientRect().top < fold) continue;
      el.dataset.reveal = "wait";
      waiting.push(el);
      observer.observe(el);
    }
    // Belt and braces: jumping to an anchor inside a waiting block must never leave it hidden.
    const onJump = () => waiting.filter((el) => el.dataset.reveal === "wait" && el.getBoundingClientRect().top < window.innerHeight).forEach(show);
    window.addEventListener("scrollend", onJump);
    return () => {
      observer.disconnect();
      window.removeEventListener("scrollend", onJump);
      waiting.forEach(show);
    };
  }, []);
  return null;
}

/**
 * Arrival. Whoever lands here has just been watching the fest's eclipse turn in the middle of the
 * screen (the route curtain's, or the opening loader's). Rather than that one fading out and
 * another appearing in the arch, the same eclipse flies to its place there, and the arch, the
 * event's art and the copy follow (the timeline is "Arrival" in styles/event-page.css).
 *
 * This only measures and gives the cue. While the page is covered it keeps the arriving eclipse
 * (EventStage's .ev-stage-arrival) exactly under the cover's, and it starts the flight the moment
 * the cover begins to open. With nothing covering the page (a refresh, a shared link) the eclipse
 * starts where the curtain would have shown it, after a short beat. Reduced motion, or the stage
 * off screen: it does nothing, and the plain entrance plays.
 */
export function StageArrival() {
  useLayoutEffect(() => {
    const hero = document.querySelector<HTMLElement>(".ev-hero");
    const flyer = hero?.querySelector<HTMLElement>(".ev-stage-arrival");
    if (!hero || !flyer || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /** The eclipse on whatever still covers the page: the curtain's, else the loader's. */
    const coverEclipse = () =>
      document.querySelector<HTMLElement>('.route-curtain:not([data-state="opening"]) .rc-eclipse') ??
      (document.documentElement.dataset.loaderSkip ? null : document.querySelector<HTMLElement>(".site-loader:not(.is-exit) .ld-moon"));

    /** Sets the flyer on `from`; with no cover, where and how big the curtain shows its eclipse. */
    const place = (from: HTMLElement | null) => {
      const to = flyer.getBoundingClientRect();
      if (!to.width) return;
      const box = from?.getBoundingClientRect();
      // The cover's box is its moon's; the flyer's disc is 102% of its own box.
      const size = (from ? from.offsetWidth : Math.min(250, Math.max(150, Math.min(innerWidth, innerHeight) * 0.24))) / 1.02;
      const x = (box ? box.left + box.width / 2 : innerWidth / 2) - (to.left + to.width / 2);
      const y = (box ? box.top + box.height / 2 : innerHeight * 0.46) - (to.top + to.height / 2);
      // The flight bows off the straight line (upwards, when it runs across the screen).
      const far = Math.hypot(x, y) || 1;
      const bow = Math.min(70, far * 0.16) * (x < 0 ? 1 : -1);
      flyer.style.setProperty("--ax", `${x.toFixed(1)}px`);
      flyer.style.setProperty("--ay", `${y.toFixed(1)}px`);
      flyer.style.setProperty("--as", (size / to.width).toFixed(4));
      flyer.style.setProperty("--abx", `${((-y / far) * bow).toFixed(1)}px`);
      flyer.style.setProperty("--aby", `${((x / far) * bow).toFixed(1)}px`);
    };

    let frame = 0;
    let timer = 0;
    const play = () => {
      const at = flyer.getBoundingClientRect();
      // Not on screen (a restored scroll position, a link to a section further down): no flight.
      if (at.bottom <= 0 || at.top >= innerHeight) {
        delete hero.dataset.arrive;
        return;
      }
      hero.dataset.arrive = "play";
      // Landed and handed over by now (the stylesheet has already hidden it): take the copy out.
      timer = window.setTimeout(() => {
        flyer.hidden = true;
      }, 3000);
    };

    const cover = coverEclipse();
    flyer.hidden = false;
    place(cover);
    hero.dataset.arrive = "wait";
    if (cover) {
      // Follow the cover until it starts to open (or 12s, so the hero can never stay held back).
      const giveUp = performance.now() + 12000;
      const watch = () => {
        const still = coverEclipse();
        if (!still || performance.now() > giveUp) return play();
        place(still);
        frame = requestAnimationFrame(watch);
      };
      frame = requestAnimationFrame(watch);
    } else {
      // Nothing to take over from: the page fades in around the eclipse, then it sets off at once.
      hero.style.setProperty("--ev-hold", "0.1s");
      timer = window.setTimeout(() => {
        place(null);
        play();
      }, 520);
    }
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);
  return null;
}

/**
 * Phones only: a slim bar pinned to the bottom with a Register button while the
 * registration card is off screen. Hides when the hero's button, the card, the
 * closing scene's button or the footer is in view.
 */
export function MobileRegisterBar({ name, detail, label, href }: { name: string; detail: string; label: string; href?: string }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const card = document.getElementById("register");
    if (!card) return;
    // Any other way in on screen (the hero's button, the card, the closing scene's button) or the footer: stay out of the way.
    const watched = [card, document.getElementById("hero-cta"), document.getElementById("closing-cta"), document.querySelector("footer")].filter(
      (el): el is HTMLElement => Boolean(el),
    );
    const inView = new Map<Element, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) inView.set(entry.target, entry.isIntersecting);
        setHidden([...inView.values()].some(Boolean));
      },
      { threshold: 0.12 },
    );
    watched.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="ev-regbar lg:hidden" data-hidden={hidden ? "" : undefined} aria-hidden={hidden} inert={hidden}>
      <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-display text-[19px] font-semibold leading-tight text-parchment">{name}</p>
          <p className="ev-label mt-1 truncate">{detail}</p>
        </div>
        {/* Signed out / profile unfinished: go straight there. Otherwise bring the card into view. */}
        {href ? (
          <GoldButton href={href} size="sm" className="shrink-0">
            {label}
          </GoldButton>
        ) : (
          <GoldActionButton size="sm" className="shrink-0" onClick={() => jump("register")}>
            {label}
          </GoldActionButton>
        )}
      </div>
    </div>
  );
}
