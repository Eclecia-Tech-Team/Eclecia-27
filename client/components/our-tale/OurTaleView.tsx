"use client";

import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import { OUR_TALE } from "@/constants/our-tale";
import { ASSETS } from "@/constants/assets";
import { SiteHeader } from "@/components/common/Header";
import { SiteFooter } from "@/components/common/Footer";
import { PageFade } from "@/components/common/PageFade";
import { GoldButton } from "@/components/common/GoldButton";
import { Meteors } from "@/components/common/Meteors";
import { depth } from "@/lib/depth";

/** Fades + rises content into view the first time it scrolls on screen. */
function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: ElementType;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${
        seen ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-gold/70">
      {children}
    </p>
  );
}

function SectionHeading({
  eyebrow,
  title,
  accent,
  intro,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  intro?: string;
  align?: "left" | "center";
}) {
  return (
    <Reveal
      className={`flex flex-col gap-5 ${
        align === "center" ? "items-center text-center" : ""
      }`}
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="font-display text-[36px] font-semibold leading-[0.95] tracking-[-0.015em] md:text-[56px]">
        {title}
        {accent && (
          <>
            {" "}
            <em className="font-normal italic text-gold">{accent}</em>
          </>
        )}
      </h2>
      {intro && (
        <p className="max-w-[56ch] text-[15px] leading-relaxed text-parchment/75 md:text-[17px]">
          {intro}
        </p>
      )}
    </Reveal>
  );
}

/** Soft dark halo so text stays readable over the art, same trick as /sponsors. */
function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`text-panel-shadow relative ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute -z-10"
        style={{
          inset: -120,
          background:
            "radial-gradient(ellipse at center, rgba(4,4,8,0.6) 0%, rgba(4,4,8,0.5) 40%, rgba(4,4,8,0.25) 65%, rgba(4,4,8,0) 100%)",
        }}
      />
      {children}
    </section>
  );
}

/** Animates a leading number up from 0 when scrolled into view
 *  ("20,000+" → counts to it, keeps the "+"). Non-numeric placeholders
 *  like "—" render as-is. Indian digit grouping via en-IN. */
function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [animated, setAnimated] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const match = value.match(/^([\d,]+)(.*)$/);
    if (!started || !match) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = parseInt(match[1].replace(/,/g, ""), 10);
    const suffix = match[2] ?? "";
    const duration = 1400;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimated(
        `${Math.round(target * eased).toLocaleString("en-IN")}${suffix}`,
      );
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {animated ?? value}
    </span>
  );
}

/** The faint full-height track behind the gold progress line. */
function EditionTimeline({ items }: { items: typeof OUR_TALE.editions.items }) {
  const ref = useRef<HTMLOListElement>(null);
  const [progress, setProgress] = useState(0);
  // Which editions the drawn line has reached — they "light up" as it passes.
  const [lit, setLit] = useState<boolean[]>(() => items.map(() => false));

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const start = window.innerHeight * 0.85;
      const p = Math.min(1, Math.max(0, (start - rect.top) / rect.height));
      setProgress(p);
      const reached = p * rect.height;
      const next = Array.from(el.querySelectorAll("li")).map(
        (li) => reached >= li.offsetTop - 24,
      );
      setLit((prev) =>
        prev.length === next.length && prev.every((v, i) => v === next[i])
          ? prev
          : next,
      );
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <ol ref={ref} className="relative flex flex-col gap-12 border-l border-gold/20 pl-8 md:gap-14 md:pl-12">
      {/* Gold line that draws itself as you scroll through the editions */}
      <span
        aria-hidden
        className="absolute bottom-0 left-0 top-0 w-px origin-top bg-gradient-to-b from-gold/80 to-gold/40"
        style={{ transform: `scaleY(${progress})` }}
      />
      {items.map((edition, i) => {
        const on = lit[i] ?? false;
        return (
          <Reveal as="li" key={i} delay={i * 80} className="relative">
            <span
              aria-hidden
              className={`absolute -left-[37px] top-1.5 h-2.5 w-2.5 rounded-full border transition-colors duration-500 md:-left-[53px] ${
                on ? "border-gold bg-gold" : "border-gold/40 bg-black"
              }`}
            />
            <p
              className={`font-mono text-[11px] uppercase tracking-[0.2em] break-words transition-colors duration-500 md:tracking-[0.3em] ${
                on ? "text-gold" : "text-gold/45"
              }`}
            >
              {edition.year}
            </p>
            <h3
              className={`mt-2 break-words font-display text-[28px] font-semibold leading-tight transition-colors duration-500 md:text-[38px] ${
                on ? "text-parchment" : "text-parchment/55"
              }`}
            >
              {edition.theme}
            </h3>
            <p
              className={`mt-3 max-w-[56ch] break-words text-[15px] leading-relaxed transition-colors duration-500 md:text-[17px] ${
                on ? "text-parchment/75" : "text-parchment/45"
              }`}
            >
              {edition.highlight}
            </p>
          </Reveal>
        );
      })}
    </ol>
  );
}

export function OurTaleView() {
  const { hero, chapters, editions, strip, gallery, stats, closing } = OUR_TALE;

  return (
    <PageFade className="min-h-dvh">
      {/* Ambient motion for this page only: the floor strip drifts on its
          own and pauses on hover. Disabled under prefers-reduced-motion,
          where the strip stays a normal swipeable row. */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes tale-marquee { to { transform: translateX(-50%); } }
          @keyframes tale-rise {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .tale-marquee-track { animation: tale-marquee 50s linear infinite; }
          .tale-marquee:hover .tale-marquee-track { animation-play-state: paused; }
          .tale-rise { animation: tale-rise 0.9s cubic-bezier(0.22, 0.61, 0.36, 1) both; }
        }
      `}</style>
      <div className="relative min-h-dvh overflow-x-clip bg-black text-parchment">
        {/* Fixed sky, same treatment as ComingSoon */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ASSETS.cloudinary.bg}
          alt=""
          aria-hidden
          className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-60"
          style={depth(14, 1.06)}
        />
        <div
          className="pointer-events-none fixed inset-0"
          aria-hidden
          style={depth(14)}
        >
          <Meteors />
        </div>

        <SiteHeader />

        <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-28 px-[6vw] pb-32 pt-28 md:gap-36 md:pb-44 md:pt-36 lg:max-w-5xl xl:max-w-6xl">
          {/* ---------- Hero ---------- */}
          <Panel className="relative flex flex-col items-center gap-8 pt-6 text-center md:pt-10">
            <Reveal className="relative flex flex-col items-center gap-6">
              <p className="tale-rise font-mono text-[11px] uppercase tracking-[0.35em] text-gold/70">
                {hero.eyebrow}
              </p>
              <h1
                className="tale-rise font-display text-[52px] font-semibold leading-[0.95] tracking-[-0.015em] md:text-[88px]"
                style={{ animationDelay: "120ms" }}
              >
                {hero.title}
                <br />
                <em className="font-normal italic text-gold">
                  {hero.titleAccent}
                </em>
              </h1>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ASSETS.cloudinary.divider}
                alt=""
                draggable={false}
                className="tale-rise w-56 max-w-none select-none md:w-72"
                style={{ animationDelay: "260ms" }}
              />
              <p
                className="tale-rise max-w-[58ch] text-[15px] leading-relaxed text-parchment/75 md:text-[18px]"
                style={{ animationDelay: "400ms" }}
              >
                {hero.intro}
              </p>
            </Reveal>
          </Panel>

          {/* ---------- Chapters: header + line on one side, picture on the other ---------- */}
          {chapters.map((chapter, i) => (
            <Panel key={chapter.eyebrow} className="flex flex-col gap-8">
              <div
                className={`flex flex-col gap-8 ${
                  chapter.image ? "md:flex-row md:items-center md:gap-14" : ""
                }`}
              >
                <div className="flex flex-1 flex-col gap-5">
                  <SectionHeading
                    eyebrow={chapter.eyebrow}
                    title={chapter.title}
                    accent={chapter.titleAccent}
                  />
                  <Reveal delay={150}>
                    <p className="max-w-[56ch] text-[16px] leading-relaxed text-parchment/75 md:text-[18px]">
                      {chapter.line}
                    </p>
                  </Reveal>
                </div>
                {chapter.image && (
                  <Reveal
                    delay={150}
                    className={`shrink-0 ${i % 2 === 1 ? "md:order-first" : ""}`}
                  >
                    <figure className="flex flex-col gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={chapter.image.src}
                        alt={chapter.image.alt}
                        loading="lazy"
                        className="w-full max-w-sm rounded-sm border border-gold/20 object-cover md:w-80 md:h-[24rem] lg:w-96"
                      />
                      {chapter.image.caption && (
                        <figcaption className="font-mono text-[10px] uppercase tracking-[0.25em] text-parchment/50">
                          {chapter.image.caption}
                        </figcaption>
                      )}
                    </figure>
                  </Reveal>
                )}
              </div>
            </Panel>
          ))}

          {/* ---------- Editions timeline ---------- */}
          <Panel className="flex flex-col gap-10">
            <SectionHeading
              eyebrow={editions.eyebrow}
              title={editions.title}
              accent={editions.titleAccent}
              intro={editions.intro}
            />
            <EditionTimeline items={editions.items} />
          </Panel>

          {/* ---------- Floor strip: auto-scrolling candid pics ---------- */}
          <Panel className="flex flex-col gap-8">
            <SectionHeading
              eyebrow={strip.eyebrow}
              title={strip.title}
              accent={strip.titleAccent}
              intro={strip.intro}
            />
            <Reveal>
              {/* Doubled list translated -50% loops seamlessly; hover pauses.
                  Reduced motion: animation off, strip stays swipeable. */}
              <div className="tale-marquee -mx-[6vw] overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] md:mx-0">
                <ul className="tale-marquee-track flex w-max gap-4 pr-4 md:gap-5 md:pr-5">
                  {[...strip.images, ...strip.images].map((img, i) => (
                    <li
                      key={i}
                      aria-hidden={i >= strip.images.length}
                      className="group relative h-64 w-48 shrink-0 overflow-hidden rounded-sm border border-gold/20 md:h-80 md:w-60"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.src}
                        alt={i < strip.images.length ? img.alt : ""}
                        loading="lazy"
                        draggable={false}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                      {img.label && i < strip.images.length && (
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2.5 pt-6 font-mono text-[9px] uppercase tracking-[0.25em] text-gold">
                          {img.label}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </Panel>

          {/* ---------- Gallery: clubs and past moments as a bento grid ---------- */}
          <Panel className="flex flex-col gap-8">
            <SectionHeading
              eyebrow={gallery.eyebrow}
              title={gallery.title}
              accent={gallery.titleAccent}
              intro={gallery.intro}
            />
            {/* Bento grid: clubs and past moments at mixed cell sizes.
                Each tile reveals on its own; hover lifts the image and
                warms the gold frame. */}
            <ul className="grid grid-flow-dense grid-cols-2 gap-3 auto-rows-[190px] sm:auto-rows-[215px] md:grid-cols-4 md:gap-4 md:auto-rows-[235px]">
              {gallery.items.map((img, i) => {
                const span = img.span ?? "default";
                const spanCls =
                  span === "wide"
                    ? "col-span-2"
                    : span === "tall"
                      ? "row-span-2"
                      : span === "large"
                        ? "col-span-2 row-span-2"
                        : "";
                return (
                  <Reveal
                    as="li"
                    key={i}
                    delay={(i % 4) * 70}
                    className={`group relative overflow-hidden rounded-sm border border-gold/20 transition-colors duration-300 hover:border-gold/60 ${spanCls}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.src}
                      alt={img.alt}
                      loading="lazy"
                      draggable={false}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05] motion-reduce:transition-none"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"
                    />
                    {img.label && (
                      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 px-4 pb-3.5 pt-8">
                        <span className="font-display text-[18px] font-semibold leading-tight text-parchment transition-colors duration-300 group-hover:text-gold md:text-[22px]">
                          {img.label}
                        </span>
                        {img.sublabel && (
                          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-gold/80 transition-colors duration-300 group-hover:text-gold md:text-[10px]">
                            {img.sublabel}
                          </span>
                        )}
                      </div>
                    )}
                  </Reveal>
                );
              })}
            </ul>
          </Panel>

          {/* ---------- Stats ---------- */}
          <Panel className="flex flex-col gap-10">
            <SectionHeading
              eyebrow={stats.eyebrow}
              title={stats.title}
              accent={stats.titleAccent}
              intro={stats.intro}
            />
            <dl className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4 md:gap-x-8">
              {stats.items.map((s, i) => (
                <Reveal key={s.label} delay={i * 100}>
                  <div className="flex flex-col gap-2 border-t border-gold/25 pt-4">
                    <dd className="font-display text-[32px] leading-none text-gold md:text-[44px]">
                      <CountUp value={s.value} />
                    </dd>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-parchment/60">
                      {s.label}
                    </dt>
                  </div>
                </Reveal>
              ))}
            </dl>
          </Panel>

          {/* ---------- Closing ---------- */}
          <Panel className="flex flex-col items-center gap-8 text-center">
            <Reveal>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ASSETS.cloudinary.divider}
                alt=""
                draggable={false}
                className="w-56 max-w-none select-none md:w-72"
              />
            </Reveal>
            <SectionHeading
              eyebrow={closing.eyebrow}
              title={closing.title}
              accent={closing.titleAccent}
              align="center"
            />
            <div className="flex max-w-[58ch] flex-col gap-5">
              {closing.paragraphs.map((p, i) => (
                <Reveal key={i} delay={i * 120}>
                  <p className="text-[15px] leading-relaxed text-parchment/75 md:text-[17px]">
                    {p}
                  </p>
                </Reveal>
              ))}
            </div>
            <Reveal delay={200}>
              <GoldButton href={closing.cta.href} variant="solid" size="md">
                {closing.cta.label}
              </GoldButton>
            </Reveal>
          </Panel>
        </main>

        <SiteFooter />
      </div>
    </PageFade>
  );
}
