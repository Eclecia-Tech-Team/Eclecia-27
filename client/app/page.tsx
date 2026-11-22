"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState, useSyncExternalStore } from "react";
import { sceneConfig as cfg, type AssetId } from "@/constants/scene.config";
import {
  clamp01,
  easeInOut,
  poseAt,
  sectionOpacity,
  seg,
  type Mode,
} from "@/utils/track";
import {
  HeroSection,
  StatsSection,
  DatesSection,
  DuskSection,
  FinaleSection,
} from "@/components/home/sections";
import { SiteHeader } from "@/components/common/Header";
import { SiteFooter } from "@/components/common/Footer";
import { SKY_LQIP } from "@/lib/lqip";
import { ASSETS } from "@/constants/assets";
import { Meteors } from "@/components/common/Meteors";

const FRAME = cfg.frame;

/** Viewport px the hero keeps clear at the bottom for the scroll cue. */
const CUE_RESERVE_PX = 64;
/** Frame px of hero copy besides the wordmark: presenter line, "presents", gaps. */
const HERO_COPY_PX = 64;
/** Desktop hero wordmark height range, frame px. */
const HERO_WORDMARK = { min: 170, max: 340 } as const;

/** Natural placement of each asset (Figma rect, frame coords) + its source. */
type Layer = {
  asset: AssetId;
  id: string;
  src: string;
  /** Natural rect in frame coords (for the scene PNGs: the Figma rect). */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Paint order. */
  z: number;
  /** Alternate artwork for mobile / portrait (different image + natural size). */
  mobile?: { src: string; width: number; height: number };
};

// Layer order and geometry come from the Figma export.
// Sources are served from ASSETS.cloudinary constants.
// Array order = paint order (bottom → top).
const LAYERS: Layer[] = [
  {
    asset: "bg",
    id: "bg-layer1",
    src: ASSETS.cloudinary.bg,
    x: 0,
    y: 0,
    width: 1512,
    height: 864,
    z: 10,
  },
  // Ornaments sit above the sky, below the text panels (z 15) and the moon.
  {
    asset: "veena",
    id: "orn-veena",
    src: ASSETS.cloudinary.veena,
    x: 0,
    y: 0,
    width: 1400,
    height: 933,
    z: 12,
  },
  {
    asset: "hand",
    id: "orn-hand",
    src: ASSETS.cloudinary.hand,
    x: 0,
    y: 0,
    width: 800,
    height: 1000,
    z: 12,
  },
  {
    asset: "bannerL",
    id: "orn-banner-l",
    src: ASSETS.cloudinary.banner,
    x: 0,
    y: 0,
    width: 700,
    height: 1050,
    z: 12,
  },
  {
    asset: "bannerR",
    id: "orn-banner-r",
    src: ASSETS.cloudinary.banner,
    x: 0,
    y: 0,
    width: 700,
    height: 1050,
    z: 12,
  },
  {
    asset: "rays",
    id: "blacksun-layer2",
    src: ASSETS.cloudinary.blacksun,
    x: 558,
    y: 38,
    width: 432,
    height: 432,
    z: 20,
  },
  {
    asset: "moon",
    id: "blacksun2-layer3",
    src: ASSETS.cloudinary.blacksun2,
    x: 555,
    y: 33,
    width: 437,
    height: 437,
    z: 30,
  },
  {
    asset: "minisun",
    id: "minisun-layer4",
    src: ASSETS.cloudinary.minisun,
    x: 707,
    y: 186,
    width: 133,
    height: 199,
    z: 40,
  },
  {
    asset: "suncover",
    id: "suncoverbg-layer5",
    src: ASSETS.cloudinary.suncover,
    x: -165,
    y: -122,
    width: 1672,
    height: 941,
    z: 50,
  },
  {
    asset: "mainart",
    id: "mainart-layer6",
    src: ASSETS.cloudinary.mainart,
    x: -160,
    y: -39,
    width: 1672,
    height: 941,
    z: 60,
    // Portrait re-composition of the hero art for phones.
    mobile: {
      src: ASSETS.cloudinary.mainartMobile,
      width: 941,
      height: 1672,
    },
  },
  {
    asset: "bottom",
    id: "bottom-layer7",
    src: ASSETS.cloudinary.bottom,
    x: -160,
    y: -39,
    width: 1672,
    height: 941,
    z: 70,
  },
];

// ---------- viewport measurement ----------
//
// window.innerHeight (and its 'resize' event) is not a reliable proxy for
// the *currently visible* viewport on mobile: iOS only ever collapses a
// bottom toolbar, so innerHeight tracks it closely enough that nobody
// notices the gap; Android can show/hide a top AND a bottom bar
// independently, and 'resize' fires late or not at all during that
// transition. Since the scroll-track's CSS height is `dvh` (which IS
// spec'd to track the true dynamic viewport), reading a stale
// window.innerHeight in JS quietly falls out of sync with what's actually
// rendered — that's the "fine on iPhone, messed up on Android" symptom.
// visualViewport.height is kept in sync with the real visible area on both
// platforms and fires its own 'resize' event reliably, so every place that
// needs "how tall is the viewport right now" reads from it instead.

function getViewportH(): number {
  if (typeof window === "undefined") return FRAME.height;
  return window.visualViewport?.height ?? window.innerHeight;
}
function getViewportW(): number {
  if (typeof window === "undefined") return FRAME.width;
  return window.visualViewport?.width ?? window.innerWidth;
}
/** Extra scrollable px inside the pinned track for a given viewport height. */
function trackPxFor(vh: number): number {
  return cfg.scrollVh * vh - vh;
}

// ---------- scroll cue ----------

/**
 * "This page scrolls" hint pinned to the bottom of the hero: a label plus a
 * bobbing double chevron. Fades out within the first few % of the track.
 * Tap/click glides to the dates section.
 */
function ScrollCue({ opacity }: { opacity: number }) {
  const hidden = opacity < 0.01;
  const go = () => {
    const trackPx = trackPxFor(getViewportH());
    window.scrollTo({
      top: cfg.layout.dates.hold[0] * trackPx,
      behavior: "smooth",
    });
  };
  return (
    <button
      type="button"
      onClick={go}
      aria-label="Scroll to explore"
      className="scroll-cue fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-95 flex -translate-x-1/2 flex-col items-center gap-2 text-gold/80 transition-opacity duration-300 hover:text-gold"
      style={{
        opacity,
        pointerEvents: hidden ? "none" : "auto",
        visibility: hidden ? "hidden" : "visible",
      }}
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.35em]">
        Scroll
      </span>
      <svg
        aria-hidden
        className="scroll-cue-chevron"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 7l6 6 6-6" />
        <path d="M6 13l6 6 6-6" opacity="0.5" />
      </svg>
    </button>
  );
}

// ---------- hooks ----------

// Scale the fixed frame so it covers the viewport (fills width and height,
// keeps aspect ratio, crops the overflow edge).
function useCover() {
  const [v, setV] = useState<{ scale: number; w: number; h: number }>({
    scale: 1,
    w: FRAME.width,
    h: FRAME.height,
  });
  useEffect(() => {
    const update = () => {
      const w = getViewportW();
      const h = getViewportH();
      setV({ scale: Math.max(w / FRAME.width, h / FRAME.height), w, h });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    // The reliable signal for Android's independent top/bottom bar
    // show/hide — window 'resize' alone can miss or lag this transition.
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);
  return v;
}

// Layout tier: tablet (see cfg.tabletQuery) beats mobile (cfg.mobileQuery), else desktop.
function subscribeMode(cb: () => void) {
  const qs = [cfg.tabletQuery, cfg.tabletPortraitQuery, cfg.mobileQuery].map(
    (q) => window.matchMedia(q),
  );
  qs.forEach((q) => q.addEventListener("change", cb));
  return () => qs.forEach((q) => q.removeEventListener("change", cb));
}
function readMode(): Mode {
  if (window.matchMedia(cfg.tabletQuery).matches) return "tablet";
  if (window.matchMedia(cfg.tabletPortraitQuery).matches)
    return "tabletPortrait";
  if (window.matchMedia(cfg.mobileQuery).matches) return "mobile";
  return "desktop";
}
function useMode(): Mode {
  return useSyncExternalStore(subscribeMode, readMode, () => "desktop");
}

// Progress 0..1 across the pinned scroll track, eased toward the scrollbar's
// position each frame so the scene glides instead of jumping with the wheel.
function useTrackProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    let target = 0;
    let current = 0;
    const k = cfg.scrollSmoothing;
    const readTarget = () => {
      const trackPx = trackPxFor(getViewportH());
      target = trackPx > 0 ? clamp01(window.scrollY / trackPx) : 0;
    };
    const tick = () => {
      raf = 0;
      const diff = target - current;
      if (k <= 0 || Math.abs(diff) < 0.0004) {
        current = target;
        setP(current);
        return; // settled: stop the loop until the next scroll event
      }
      current += diff * k;
      setP(current);
      raf = requestAnimationFrame(tick);
    };
    const schedule = () => {
      readTarget();
      if (!raf) raf = requestAnimationFrame(tick);
    };
    // Initial sync (e.g. reload mid-page) goes through the same frame loop.
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    // Android's top/bottom bars can resize the visible area without a
    // window 'resize' firing in time — this keeps trackPx (and therefore
    // `p`) from drifting out of sync with what's actually on screen.
    window.visualViewport?.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return p;
}

// Section anchors on the track: where each section rests (hold start; finale = 1).
const ANCHORS = Object.values(cfg.layout).map((sec) => sec.hold[0]);

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// After the user stops scrolling, glide to the next section in their direction.
// Programmatic scrolls are ignored by the listener; any new input cancels the glide.
// (Desktop wheel / keyboard / trackpad — mobile touch is handled separately
// by useMobileSectionSwipe, which owns the gesture directly instead of
// waiting for it to go idle.)
function useSectionSnap() {
  useEffect(() => {
    if (!cfg.snap.enabled) return;
    const S = cfg.snap;
    let lastY = window.scrollY;
    let dir = 0;
    let idle = 0;
    let anim = 0;
    let animating = false;

    const cancel = () => {
      if (anim) cancelAnimationFrame(anim);
      anim = 0;
      animating = false;
    };

    const glideTo = (targetY: number) => {
      const startY = window.scrollY;
      const dist = Math.abs(targetY - startY);
      if (dist < 2) return;
      const ms = Math.min(S.maxMs, Math.max(S.minMs, dist * 0.9));
      const t0 = performance.now();
      animating = true;
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / ms);
        window.scrollTo(0, startY + (targetY - startY) * easeInOutCubic(t));
        if (t < 1) anim = requestAnimationFrame(step);
        else {
          animating = false;
          anim = 0;
          lastY = window.scrollY;
        }
      };
      anim = requestAnimationFrame(step);
    };

    const snap = () => {
      const tp = trackPxFor(getViewportH());
      if (tp <= 0) return;
      const p = window.scrollY / tp;
      if (p >= 1) return; // past the pinned scene: leave the page alone
      // Segment we're in.
      let i = 0;
      while (i + 1 < ANCHORS.length && ANCHORS[i + 1] <= p) i++;
      const lo = ANCHORS[i];
      const hi = ANCHORS[Math.min(i + 1, ANCHORS.length - 1)];
      let target = lo;
      if (dir > 0) target = p - lo < S.deadZone ? lo : hi;
      else if (dir < 0) target = hi - p < S.deadZone ? hi : lo;
      else target = p - lo < hi - p ? lo : hi;
      glideTo(target * tp);
    };

    const onScroll = () => {
      if (animating) return;
      const y = window.scrollY;
      if (y !== lastY) dir = Math.sign(y - lastY);
      lastY = y;
      clearTimeout(idle);
      idle = window.setTimeout(snap, S.idleMs);
    };
    const onInput = () => {
      // Fresh user intent: stop any glide so it never fights the finger/wheel.
      if (animating) cancel();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onInput, { passive: true });
    window.addEventListener("keydown", onInput);
    return () => {
      clearTimeout(idle);
      cancel();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onInput);
      window.removeEventListener("keydown", onInput);
    };
  }, []);
}

// Mobile only: one swipe = exactly one section, then stop. Owns the touch
// gesture directly (blocks native scrolling while dragging inside the
// pinned track) instead of letting the finger glide through several
// sections and correcting afterwards — which is what idle-based snapping
// above does, and is the "it keeps going to the next section" complaint.
// Steps aside once you're at the last section so a further swipe scrolls
// normally into the footer.
function useMobileSectionSwipe(active: boolean) {
  useEffect(() => {
    if (!active || !cfg.snap.enabled) return;
    const S = cfg.snap;
    const SWIPE_PX = 40; // minimum drag distance (px) to count as "advance one section"
    const MOVE_EPSILON = 6; // px of wiggle before we decide vertical vs horizontal

    let dragging = false;
    let decided = false;
    let vertical = false;
    let startX = 0;
    let startY = 0;
    let startScrollY = 0;
    let anim = 0;

    const cancelAnim = () => {
      if (anim) cancelAnimationFrame(anim);
      anim = 0;
    };

    const glideTo = (targetY: number) => {
      cancelAnim();
      const start = window.scrollY;
      const dist = Math.abs(targetY - start);
      if (dist < 1) return;
      const ms = Math.min(S.maxMs, Math.max(S.minMs, dist * 0.9));
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / ms);
        window.scrollTo(0, start + (targetY - start) * easeInOutCubic(t));
        if (t < 1) anim = requestAnimationFrame(step);
        else anim = 0;
      };
      anim = requestAnimationFrame(step);
    };

    const nearestIndex = (p: number) => {
      let best = 0;
      let bestDiff = Infinity;
      ANCHORS.forEach((a, idx) => {
        const diff = Math.abs(a - p);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = idx;
        }
      });
      return best;
    };

    const onTouchStart = (e: TouchEvent) => {
      const tp = trackPxFor(getViewportH());
      // Already at/past the end of the pinned track: let native scrolling
      // carry on into whatever follows (the footer).
      if (tp <= 0 || window.scrollY >= tp - 2) return;
      cancelAnim();
      dragging = true;
      decided = false;
      vertical = false;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startScrollY = window.scrollY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!dragging) return;
      const touch = e.touches[0];
      if (!decided) {
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        if (Math.abs(dx) < MOVE_EPSILON && Math.abs(dy) < MOVE_EPSILON) return;
        decided = true;
        vertical = Math.abs(dy) > Math.abs(dx);
        if (!vertical) {
          // Horizontal gesture: not ours, let the browser handle it.
          dragging = false;
          return;
        }
      }
      // Own the gesture: block native scroll so the page only ever moves
      // via glideTo below, one section at a time.
      e.preventDefault();
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!dragging || !decided || !vertical) {
        dragging = false;
        return;
      }
      dragging = false;
      const tp = trackPxFor(getViewportH());
      if (tp <= 0) return;
      const endY = e.changedTouches[0].clientY;
      const deltaY = startY - endY; // positive = swiped up = wants to advance
      const p0 = clamp01(startScrollY / tp);
      const idx = nearestIndex(p0);
      let targetIdx = idx;
      if (deltaY > SWIPE_PX && idx < ANCHORS.length - 1) targetIdx = idx + 1;
      else if (deltaY < -SWIPE_PX && idx > 0) targetIdx = idx - 1;
      glideTo(ANCHORS[targetIdx] * tp);
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      cancelAnim();
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [active]);
}

// ---------- choreography for the PNG layers ----------

type LayerStyle = { transform: string; opacity: number };

/** Move the layer so its centre lands on the pose, scaled to the pose width. */
function layerStyle(layer: Layer, p: number, mode: Mode): LayerStyle {
  const pose = poseAt(layer.asset, p, mode);
  // Portrait art only on phones; tablets keep the landscape composition.
  const art =
    (mode === "mobile" || mode === "tabletPortrait") && layer.mobile
      ? layer.mobile
      : layer;
  const cx0 = layer.x + art.width / 2;
  const cy0 = layer.y + art.height / 2;
  const scale = pose.w / art.width;
  return {
    transform: `translate(${pose.x - cx0}px, ${pose.y - cy0}px) scale(${scale}) rotate(${pose.rotate}deg) scale(${pose.sx}, ${pose.sy})`,
    opacity: pose.opacity,
  };
}

export default function Home() {
  const { scale, w, h } = useCover();
  const mode = useMode();
  const mobile = mode !== "desktop"; // panels + compact type for both tablet and phone
  const p = useTrackProgress();
  useSectionSnap();
  useMobileSectionSwipe(mode === "mobile");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Smooth initial entrance fade to prevent abrupt pop-in on page load
    const timer = setTimeout(() => setLoaded(true), 60);
    return () => clearTimeout(timer);
  }, []);

  const headerO = easeInOut(seg(p, cfg.header.fadeIn[0], cfg.header.fadeIn[1]));
  const heroO = sectionOpacity(p, cfg.text.hero);
  const statsO = sectionOpacity(p, cfg.text.stats);
  const datesO = sectionOpacity(p, cfg.text.dates);
  const duskO = sectionOpacity(p, cfg.text.dusk);
  const finaleO = sectionOpacity(p, cfg.text.finale);

  // Where the moon is right now, in frame px and in viewport px.
  const moonNow = poseAt("moon", p, mode);
  const frameLeft = (w - FRAME.width * scale) / 2;
  const frameTop = (h - FRAME.height * scale) / 2;
  const moonVx = frameLeft + moonNow.x * scale;
  const moonVy = frameTop + moonNow.y * scale;

  // Desktop: panels live inside the frame (frame px). Mobile: viewport px.
  const emergeFor = (win: readonly [number, number]) => ({
    t: easeInOut(seg(p, win[0], win[1])),
    fromX: mobile ? moonVx : moonNow.x,
    fromY: mobile ? moonVy : moonNow.y,
  });
  // Visible vertical band for panels: viewport minus the header, in the panel's
  // own coordinate space (frame px on desktop, viewport px on mobile/tablet).
  const headerPx = mobile ? 64 : 80;
  const bounds = mobile
    ? { top: headerPx, bottom: h }
    : {
        top: Math.max(0, -frameTop) + headerPx / scale,
        bottom: Math.min(FRAME.height, (h - frameTop) / scale),
      };

  // Desktop hero: fill the band between the eclipse's lower rim and the scroll
  // cue with the wordmark, instead of a fixed vh cap that leaves it small on
  // wide, short laptop screens.
  const heroLayout = (() => {
    if (mobile) return null;
    const moon = poseAt("moon", 0, mode);
    const top = moon.y + moon.w * 0.36 + 10;
    const bottom = Math.min(bounds.bottom, (h - CUE_RESERVE_PX - frameTop) / scale);
    const wordmarkH = Math.min(
      HERO_WORDMARK.max,
      Math.max(HERO_WORDMARK.min, bottom - top - HERO_COPY_PX),
    );
    return { rect: { ...cfg.text.hero.rect, y: (top + bottom) / 2 }, wordmarkH };
  })();

  // Tablets: phone markup, scaled up (see cfg.panelScaleMax). Phones: 1.
  const panelScale = mobile
    ? Math.min(cfg.panelScaleMax, Math.max(1, Math.min(w / 520, h / 720)))
    : 1;

  type Frac = { x: number; y: number; w: number };
  type TextOverrides = Partial<Record<keyof typeof cfg.textMobile, Frac>>;
  const rectFor = (name: keyof typeof cfg.textMobile) => {
    if (!mobile) return cfg.text[name].rect;
    const over =
      mode === "tablet"
        ? (cfg.textTablet as TextOverrides)[name]
        : mode === "tabletPortrait"
          ? (cfg.textTabletPortrait as TextOverrides)[name]
          : undefined;
    const r = over ?? cfg.textMobile[name];
    // Overlay scales around its centre, so shrink the box by the same factor
    // to keep the effective width (and centre) as configured.
    const fullW = w * r.w;
    const boxW = fullW / panelScale;
    return { x: w * r.x + (fullW - boxW) / 2, y: h * r.y, w: boxW };
  };

  const panels = (
    <>
      <HeroSection
        opacity={heroO}
        emerge={emergeFor(cfg.text.hero.fadeIn)}
        rect={heroLayout?.rect ?? rectFor("hero")}
        wordmarkH={heroLayout?.wordmarkH}
        bounds={bounds}
        compact={mobile}
        scale={panelScale}
      />
      <StatsSection
        opacity={statsO}
        emerge={emergeFor(cfg.text.stats.fadeIn)}
        rect={rectFor("stats")}
        bounds={bounds}
        compact={mobile}
        scale={panelScale}
        isTablet={mode === "tablet" || mode === "tabletPortrait"}
      />
      <DatesSection
        opacity={datesO}
        emerge={emergeFor(cfg.text.dates.fadeIn)}
        rect={rectFor("dates")}
        bounds={bounds}
        compact={mobile}
        scale={panelScale}
      />
      <DuskSection
        opacity={duskO}
        emerge={emergeFor(cfg.text.dusk.fadeIn)}
        rect={rectFor("dusk")}
        bounds={bounds}
        compact={mobile}
        // Tablets: enlarge heading and paragraph for better readability in tablet view
        scale={
          panelScale *
          (mode === "tablet" || mode === "tabletPortrait" ? 1.35 : 1)
        }
      />
      <FinaleSection
        opacity={finaleO}
        emerge={emergeFor(cfg.text.finale.fadeIn)}
        rect={rectFor("finale")}
        bounds={bounds}
        compact={mobile}
        // Tablets: closing line + CTA get an extra bump; the sky above the hills is empty anyway.
        scale={
          panelScale *
          (mode === "tablet" || mode === "tabletPortrait" ? 1.35 : 1)
        }
      />
    </>
  );

  return (
    <>
      {/* Pinned scroll track: gives the scene its scroll length. */}
      {/* dvh so iOS's collapsing address bar doesn't change the track mid-scroll */}
      <div
        className="scroll-track"
        style={{ height: `${cfg.scrollVh * 100}dvh` }}
        aria-hidden
      />

      {/* Always-on backing: a tiny blurred sky so the first paint is never plain black */}
      <div
        aria-hidden
        className="fixed inset-0 bg-black"
        style={{
          backgroundImage: `url(${SKY_LQIP})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Fixed scene with smooth initial entrance fade */}
      <div
        className={`fixed inset-0 overflow-hidden transition-opacity duration-1000 ease-out ${loaded ? "opacity-100" : "opacity-0"}`}
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
          {LAYERS.map((layer) => {
            const s = layerStyle(layer, p, mode);
            const art =
              (mode === "mobile" || mode === "tabletPortrait") && layer.mobile
                ? layer.mobile
                : layer;
            return (
              <img
                key={layer.id}
                id={layer.id}
                src={art.src}
                alt=""
                draggable={false}
                className="absolute block max-w-none select-none pointer-events-none will-change-[transform,opacity] backface-hidden"
                decoding="async"
                loading="eager"
                fetchPriority={
                  layer.asset === "bg" || layer.asset === "mainart"
                    ? "high"
                    : "auto"
                }
                style={{
                  left: layer.x,
                  top: layer.y,
                  width: art.width,
                  height: art.height,
                  zIndex: layer.z,
                  transform: s.transform,
                  transformOrigin: "center",
                  opacity: s.opacity,
                }}
              />
            );
          })}
          {/* Meteors cross the sky behind every figure: above bg (z 10), below the ornaments (z 12). */}
          <Meteors className="z-11" />

          {/* Desktop: panels share the frame's coordinates and sit on z-80 above the moon */}
          {!mobile && (
            <div className="absolute inset-0 z-80 pointer-events-none">
              {panels}
            </div>
          )}
        </div>

        {/* Mobile: panels in a viewport layer above the scene so they always fit the screen */}
        {mobile && <div className="absolute inset-0 z-80">{panels}</div>}
      </div>

      <SiteFooter />

      <SiteHeader opacity={headerO} />

      <ScrollCue opacity={loaded ? 1 - clamp01(p / 0.03) : 0} />
    </>
  );
}
