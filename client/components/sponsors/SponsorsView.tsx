"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { sceneConfig as cfg } from "@/constants/scene.config";
import {
  SiteFooter,
  SPONSORSHIP_HEADS as HEADS,
  TEAM_MAILTO,
} from "@/components/common/Footer";
import { SiteHeader } from "@/components/common/Header";
import { PageFade } from "@/components/common/PageFade";
import { GoldButton } from "@/components/common/GoldButton";
import { ASSETS } from "@/constants/assets";

const FRAME = cfg.frame;
const DESK = cfg.layout[cfg.sponsorsPoseFrom]; // eclipse sits where the left-moon section puts it
// Phones: moon top-centre and a bit smaller than the landing's, content below.
const MOB = {
  ...DESK,
  ...cfg.layoutMobile[cfg.sponsorsPoseFrom],
  rays: { x: 756, y: 215, w: 236 },
  moon: {
    x: 756,
    y: 215,
    w: 240,
    rotate: cfg.layoutMobile[cfg.sponsorsPoseFrom].moon.rotate,
  },
};

// Natural Figma rects of the two moon PNGs (same as the home page).
const RAYS = { x: 558, y: 38, width: 432, height: 432 };
const MOON = { x: 555, y: 33, width: 437, height: 437 };

/** Cover-scale of the 1512x864 frame + viewport size. */
function useCover() {
  const [v, setV] = useState<{ scale: number; w: number; h: number }>({
    scale: 1,
    w: FRAME.width,
    h: FRAME.height,
  });
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setV({ scale: Math.max(w / FRAME.width, h / FRAME.height), w, h });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return v;
}

/** Mobile / portrait mode (see cfg.mobileQuery). */
function subscribeMobile(cb: () => void) {
  const mq = window.matchMedia(cfg.mobileQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function useMobile() {
  return useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia(cfg.mobileQuery).matches,
    () => false,
  );
}

/** scrollY, coalesced to one update per frame. */
function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      setY(window.scrollY);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return y;
}

function poseTransform(
  rect: { x: number; y: number; width: number; height: number },
  pose: { x: number; y: number; w: number },
  rotate: number,
) {
  const cx0 = rect.x + rect.width / 2;
  const cy0 = rect.y + rect.height / 2;
  return `translate(${pose.x - cx0}px, ${pose.y - cy0}px) scale(${pose.w / rect.width}) rotate(${rotate}deg)`;
}

// ---------- content ----------

/** Numbers not already shown on the landing page. */
const REACH = [
  { value: "200,000+", label: "Social media reach" },
  { value: "5,000+", label: "Students involved" },
];

/** Highest to lowest. */
const TIERS = [
  "Title Sponsor",
  "Powered Sponsor",
  "Co-Powered Sponsor",
  "Associate Sponsor",
];

const DELIVERABLES = [
  {
    name: "Stage branding",
    icon: (
      <svg className="h-4.5 w-4.5 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
  },
  {
    name: "Stalls & booths",
    icon: (
      <svg className="h-4.5 w-4.5 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72m-13.5 8.625h.008v.008H6.75v-.008Zm0-3h.008v.008H6.75v-.008Z" />
      </svg>
    ),
  },
  {
    name: "Printed collaterals",
    icon: (
      <svg className="h-4.5 w-4.5 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z" />
      </svg>
    ),
  },
  {
    name: "Logo on banners",
    icon: (
      <svg className="h-4.5 w-4.5 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
      </svg>
    ),
  },
  {
    name: "Social media promos",
    icon: (
      <svg className="h-4.5 w-4.5 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
      </svg>
    ),
  },
];

const HITK = [
  { value: "25+", label: "Years of excellence" },
  { value: "10,000+", label: "Students" },
  { value: "25,000+", label: "Alumni" },
  { value: "15+", label: "Courses offered" },
];

const HITK_PILLARS = [
  ["Quality education", "Industry-aligned curriculum and expert faculty."],
  [
    "Innovation & research",
    "Encouraging curiosity, creativity and cutting-edge research.",
  ],
  [
    "Industry connect",
    "Strong partnerships and real-world learning experiences.",
  ],
  [
    "Holistic development",
    "Beyond academics: sports, clubs, culture and leadership.",
  ],
  [
    "Global perspective",
    "Preparing students to thrive in a global, tech-driven world.",
  ],
];

// ---------- small pieces ----------

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-gold/70">
      {children}
    </p>
  );
}

function Divider() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ASSETS.cloudinary.divider}
      alt=""
      draggable={false}
      className="pointer-events-none -my-7 w-70 max-w-none select-none md:-my-9 md:w-105"
    />
  );
}

/** Content block with the same soft dark halo the home panels use. */
function Block({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`text-panel-shadow relative flex flex-col gap-8 ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -z-10"
        style={{
          inset: -180,
          background:
            "radial-gradient(ellipse at center, rgba(4,4,8,0.66) 0%, rgba(4,4,8,0.6) 35%, rgba(4,4,8,0.36) 55%, rgba(4,4,8,0.15) 72%, rgba(4,4,8,0.04) 86%, rgba(4,4,8,0) 100%)",
        }}
      />
      {children}
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-2 border-t border-gold/25 pt-4">
      <dd className="font-display font-normal text-[36px] leading-none text-gold md:text-[48px]">
        {value}
      </dd>
      <dt className="font-mono text-[11px] uppercase tracking-[0.3em] text-parchment/60">
        {label}
      </dt>
    </div>
  );
}

// ---------- page ----------

export function SponsorsView() {
  const { scale, w, h } = useCover();
  const mobile = useMobile();
  const scrollY = useScrollY();
  const POSE = mobile ? MOB : DESK;
  const spin = (POSE.moon.rotate ?? 0) + scrollY * cfg.sponsorsSpinDegPerPx;
  // Desktop: text column starts just right of the eclipse's edge. Mobile: full width below it.
  const frameLeft = (w - FRAME.width * scale) / 2;
  const frameTop = (h - FRAME.height * scale) / 2;
  const moonRight = frameLeft + (POSE.moon.x + POSE.moon.w / 2) * scale;
  const moonBottom = frameTop + (POSE.moon.y + POSE.moon.w / 2) * scale;
  const colLeft = mobile ? 0 : Math.max(moonRight + 48, w * 0.3);
  const colTop = mobile ? moonBottom + 24 : h * 0.22;
  // Heading blocks: centred under the moon on mobile/portrait, left-aligned beside it on desktop.
  const headingCls = `flex flex-col gap-5 ${mobile ? "items-center text-center" : ""}`;
  return (
    <PageFade>
      <div className="relative min-h-dvh overflow-x-clip bg-black text-parchment">
        {/* Fixed sky + eclipse, same frame math as the home page so it lands on the stats pose. */}
        <div
          className="pointer-events-none fixed inset-0 overflow-hidden"
          aria-hidden
        >
          <div
            className="absolute left-1/2 top-1/2"
            style={{
              width: FRAME.width,
              height: FRAME.height,
              transform: `translate3d(-50%, -50%, 0) scale(${scale})`,
              transformOrigin: "center",
              contain: "strict",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ASSETS.cloudinary.bg}
              alt=""
              className="absolute left-0 top-0 h-216 w-378 max-w-none"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ASSETS.cloudinary.blacksun}
              alt=""
              className="absolute max-w-none"
              style={{
                left: RAYS.x,
                top: RAYS.y,
                width: RAYS.width,
                height: RAYS.height,
                transform: poseTransform(RAYS, POSE.rays, 0),
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ASSETS.cloudinary.blacksun2}
              alt=""
              className="absolute max-w-none will-change-transform"
              style={{
                left: MOON.x,
                top: MOON.y,
                width: MOON.width,
                height: MOON.height,
                transform: poseTransform(MOON, POSE.moon, spin),
              }}
            />
          </div>
        </div>

        <SiteHeader />

        {/* Scrolling content column on the right */}
        <main
          // Mobile/portrait (incl. iPads) keeps side gutters; desktop offsets via marginLeft instead.
          className={`relative z-10 flex flex-col gap-24 pb-32 md:gap-20 md:pb-44 ${
            mobile ? "px-[6vw]" : "pr-[5vw]"
          }`}
          style={{ marginLeft: colLeft, paddingTop: colTop, maxWidth: 1100 }}
        >
          {/* Gratitude */}
          <Block>
            <div className={headingCls}>
              <Eyebrow>With heartfelt gratitude</Eyebrow>
              <h1 className="font-display text-[44px] font-semibold leading-[0.95] tracking-[-0.015em] md:text-[72px]">
                Our proud
                {/* <br /> */}
                <em className="font-normal italic text-gold"> sponsors.</em>
              </h1>
              <Divider />
              <p className="max-w-[56ch] text-[15px] leading-relaxed text-parchment/75 md:text-[17px]">
                Over the years, Eclecia has been carried by the organisations
                that choose to stand behind it. To our patrons, past and
                present: thank you for keeping this stage lit.
              </p>
            </div>

            {/* Sponsor wall: empty until logos arrive */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-6">
                <h2 className="font-mono text-[11px] uppercase tracking-[0.35em] text-gold/70">
                  Eclecia&rsquo;27 sponsors &amp; brand partners
                </h2>
                <div className="h-px flex-1 bg-gold/20" />
              </div>
              <div className="flex h-28 items-center justify-center rounded-sm border border-dashed border-gold/25 bg-white/2 px-6 text-center md:h-36">
                <span className="font-display text-[18px] italic text-parchment/60 md:text-[22px]">
                  Sponsorship &amp; brand partnerships now open
                </span>
              </div>
            </div>
          </Block>

          {/* Partner CTA */}
          <Block>
            <div className={headingCls}>
              <Eyebrow>Join the cultural movement · 15–17 January 2027</Eyebrow>
              <h2 className="font-display text-[36px] font-semibold leading-[0.95] md:text-[56px]">
                Partner with{" "}
                <em className="font-normal italic text-gold">
                  Eclecia&rsquo;27.
                </em>
              </h2>
              <p className="max-w-[56ch] text-[15px] leading-relaxed text-parchment/75 md:text-[17px]">
                We invite leading brands to collaborate with Eclecia &rsquo;27
                as Title, Powered By, Co-Powered By, or Associate Sponsors;
                please review our attached brochure for detailed deliverable
                tiers and partnership privileges.
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-4 md:gap-x-8">
              {REACH.map((s) => (
                <Stat key={s.label} {...s} />
              ))}
            </dl>

            {/* Sponsorship tiers - Signature editorial layout without glass blocks */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-6">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.35em] text-gold/70">
                  Sponsorship tiers
                </h3>
                <div className="h-px flex-1 bg-gold/20" />
              </div>
              <ul className="grid grid-cols-1 border-y border-gold/25 divide-y divide-gold/15 sm:grid-cols-2 sm:divide-y-0 sm:divide-x md:grid-cols-4 md:divide-gold/20">
                {TIERS.map((t, i) => (
                  <li
                    key={t}
                    className="group flex min-h-24 flex-col justify-between gap-4 p-4 transition-colors hover:bg-gold/5 md:min-h-28 md:p-5"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-mono text-[10px] uppercase tracking-[0.3em] ${
                          i === 0 ? "font-semibold text-gold" : "text-gold/60"
                        }`}
                      >
                        {i === 0 ? "✦ Top tier" : `Tier 0${i + 1}`}
                      </span>
                      <span className="font-mono text-[10px] text-gold/30 transition-colors group-hover:text-gold/60">
                        0{i + 1}
                      </span>
                    </div>
                    <span className="font-display text-[22px] font-normal leading-tight text-parchment transition-colors group-hover:text-gold md:text-[26px]">
                      {t}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Deliverables - Open celestial layout with delicate gold icons, no glass blocks */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-6">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.35em] text-gold/70">
                  Deliverables
                </h3>
                <div className="h-px flex-1 bg-gold/20" />
              </div>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-6 pt-1 sm:grid-cols-3 md:grid-cols-5 md:gap-x-8">
                {DELIVERABLES.map((d) => (
                  <li key={d.name} className="group flex flex-col items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/35 bg-gold/5 text-gold transition-all duration-200 group-hover:border-gold group-hover:scale-105">
                      {d.icon}
                    </span>
                    <span className="text-[15px] leading-snug text-parchment/80 transition-colors group-hover:text-parchment">
                      {d.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="font-display text-[20px] italic text-parchment/80 md:text-[24px]">
              Fuel the fest. Own the energy. Be the brand they{" "}
              <span className="text-gold">remember.</span>
            </p>

            {/* CTA Buttons - Generous horizontal spacing so lotus finials never collide */}
            <div className="flex flex-wrap items-center gap-x-16 gap-y-6 pt-4">
              <GoldButton
                href={ASSETS.cloudinary.brochure}
                target="_blank"
                rel="noopener noreferrer"
                variant="solid"
                size="md"
              >
                Download brochure
              </GoldButton>
              <GoldButton
                href={TEAM_MAILTO}
                variant="ghost"
                size="md"
              >
                Email the team
              </GoldButton>
            </div>

            <ul className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {HEADS.map((h) => (
                <li
                  key={h.email}
                  className="flex gap-5 border-t border-gold/25 pt-5"
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-gold/50 font-display text-[20px] font-semibold text-gold">
                    {h.initials}
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-display text-[26px] font-semibold leading-none">
                      {h.name}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold/70">
                      {h.role}
                    </span>
                    <a
                      href={`mailto:${h.email}`}
                      className="mt-2 truncate text-[14px] text-parchment/75 hover:text-gold"
                    >
                      {h.email}
                    </a>
                    <a
                      href={`tel:${h.phone.replace(/\s/g, "")}`}
                      className="text-[14px] text-parchment/75 hover:text-gold"
                    >
                      {h.phone}
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          </Block>

          {/* About HITK */}
          <Block>
            <div className={headingCls}>
              <Eyebrow>About HITK</Eyebrow>
              <h2 className="font-display text-[36px] font-semibold leading-[0.95] md:text-[56px]">
                A legacy of excellence,{" "}
                <em className="font-normal italic text-gold">
                  a vision for the future.
                </em>
              </h2>
              <p className="max-w-[58ch] text-[16px] leading-relaxed text-parchment/75">
                Heritage Institute of Technology, Kolkata is a private,
                autonomous engineering college established in 2001 by the Kalyan
                Bharti Trust. Affiliated to MAKAUT, West Bengal, approved by
                AICTE, New Delhi, and accredited with an &lsquo;A&rsquo; grade
                by NAAC. Rooted in values, focused on tomorrow.
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-4 md:gap-x-8">
              {HITK.map((s) => (
                <Stat key={s.label} {...s} />
              ))}
            </dl>
            <ul className="flex flex-col divide-y divide-gold/15 border-y border-gold/20">
              {HITK_PILLARS.map(([h, d]) => (
                <li
                  key={h}
                  className="grid grid-cols-1 gap-1 py-3 md:grid-cols-[13rem_1fr] md:gap-6"
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold/70">
                    {h}
                  </span>
                  <span className="text-[15px] text-parchment/70">{d}</span>
                </li>
              ))}
            </ul>
          </Block>
        </main>

        <SiteFooter />
      </div>
    </PageFade>
  );
}

export default SponsorsView;
