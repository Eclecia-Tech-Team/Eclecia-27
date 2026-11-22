"use client";

import { useEffect, useRef, type CSSProperties } from "react";

interface Meteor {
  x: number;
  y: number;
  /** Unit direction of travel. */
  dx: number;
  dy: number;
  /** px / s */
  speed: number;
  /** Longest tail, px. */
  len: number;
  width: number;
  /** Seconds. */
  life: number;
  born: number;
  bright: number;
  fireball: boolean;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Distant meteors crossing the sky: a sparse shower from one radiant above the
 * top-right, so streaks fan out down-left like a real shower. Thin, short-lived
 * and softly blurred to read as far away; now and then a slower, brighter
 * fireball. One canvas; the animation loop only runs while a meteor is in
 * flight, and pauses off-screen, in hidden tabs and for reduced motion.
 *
 * Fills its positioned parent. Inside a scaled container (the landing's frame)
 * it renders at the on-screen resolution, so streaks stay crisp.
 */
export function Meteors({
  className = "",
  rate = 1,
  style,
}: {
  className?: string;
  rate?: number;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (
      !canvas ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let meteors: Meteor[] = [];
    let raf = 0;
    let timer = 0;
    let onScreen = true;
    const timers = new Set<number>();

    const fit = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      if (!w || !h) return;
      const shown = canvas.getBoundingClientRect().width / w;
      const ratio = Math.min(2, shown * window.devicePixelRatio);
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const active = () => onScreen && !document.hidden && w > 0;

    const spawn = () => {
      if (!active()) return;
      const unit = Math.min(1.4, Math.max(0.5, Math.min(w, h) / 900));
      const fireball = Math.random() < 0.08;
      const angle = Math.PI * rand(0.72, 0.82);
      meteors.push({
        x: rand(0.15, 1.05) * w,
        y: rand(-0.05, 0.55) * h,
        dx: Math.cos(angle),
        dy: Math.sin(angle),
        speed: (fireball ? rand(380, 480) : rand(650, 1300)) * unit,
        len: (fireball ? rand(260, 380) : rand(90, 220)) * unit,
        width: fireball ? rand(1.6, 2.2) : rand(0.6, 1.2),
        life: fireball ? rand(1.6, 2.2) : rand(0.45, 1.1),
        born: performance.now(),
        bright: fireball ? 0.95 : rand(0.4, 0.85),
        fireball,
      });
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const draw = (m: Meteor, t: number) => {
      const travelled = m.speed * m.life * t;
      const hx = m.x + m.dx * travelled;
      const hy = m.y + m.dy * travelled;
      // Tail grows from the start point, then draws in as the meteor burns out.
      const tail =
        Math.min(m.len, travelled) *
        (t > 0.8 ? 1 - ((t - 0.8) / 0.2) * 0.6 : 1);
      const tx = hx - m.dx * tail;
      const ty = hy - m.dy * tail;
      // Brightens through most of its flight, then vanishes quickly.
      const a = m.bright * smooth(t < 0.72 ? t / 0.72 : (1 - t) / 0.28);
      if (a <= 0.005) return;

      const streak = ctx.createLinearGradient(hx, hy, tx, ty);
      streak.addColorStop(0, `rgba(255,248,232,${a})`);
      streak.addColorStop(0.18, `rgba(255,222,168,${a * 0.55})`);
      streak.addColorStop(1, "rgba(255,196,120,0)");
      ctx.strokeStyle = streak;
      ctx.lineWidth = m.width;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(hx, hy);
      ctx.stroke();

      const r = m.width * (m.fireball ? 5 : 3);
      const head = ctx.createRadialGradient(hx, hy, 0, hx, hy, r);
      head.addColorStop(0, `rgba(255,250,238,${a})`);
      head.addColorStop(0.4, `rgba(255,214,150,${a * 0.35})`);
      head.addColorStop(1, "rgba(255,200,130,0)");
      ctx.fillStyle = head;
      ctx.beginPath();
      ctx.arc(hx, hy, r, 0, Math.PI * 2);
      ctx.fill();
    };

    function frame(now: number) {
      raf = 0;
      ctx!.clearRect(0, 0, w, h);
      ctx!.globalCompositeOperation = "lighter";
      meteors = meteors.filter((m) => {
        const t = (now - m.born) / 1000 / m.life;
        if (t >= 1) return false;
        draw(m, t);
        return true;
      });
      ctx!.globalCompositeOperation = "source-over";
      if (meteors.length && active()) raf = requestAnimationFrame(frame);
      else if (!meteors.length) ctx!.clearRect(0, 0, w, h);
    }

    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
      return id;
    };

    // Roughly one every 1.4 s, often a pair close together.
    const schedule = (ms = rand(600, 2200) / rate) => {
      timer = later(() => {
        spawn();
        if (Math.random() < 0.25) later(spawn, rand(180, 700));
        schedule();
      }, ms);
    };

    const resize = new ResizeObserver(fit);
    resize.observe(canvas);
    const seen = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
    });
    seen.observe(canvas);
    const onVisibility = () => {
      // Drop anything mid-flight rather than replaying it on return.
      if (document.hidden) meteors = [];
    };
    document.addEventListener("visibilitychange", onVisibility);
    fit();
    schedule(rand(400, 1200) / rate);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      timers.forEach(clearTimeout);
      resize.disconnect();
      seen.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [rate]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      // A touch of blur sells the distance.
      style={{ filter: "blur(0.8px)", mixBlendMode: "screen", ...style }}
    />
  );
}
