"use client";

import { useEffect, useState, type ReactNode } from "react";
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
 * Phones only: a slim bar pinned to the bottom with a Register button while the
 * registration card is off screen. Hides when the hero's button, the card or the footer is in view.
 */
export function MobileRegisterBar({ name, detail, label, href }: { name: string; detail: string; label: string; href?: string }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const card = document.getElementById("register");
    if (!card) return;
    // Any other way in on screen (the hero's button, the card) or the footer: stay out of the way.
    const watched = [card, document.getElementById("hero-cta"), document.querySelector("footer")].filter((el): el is HTMLElement => Boolean(el));
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
