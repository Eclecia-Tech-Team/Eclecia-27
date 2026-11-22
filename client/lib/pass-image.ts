"use client";

import QRCode from "qrcode";

/**
 * Draws the festival pass to a canvas, matching the profile page's pass, so it
 * can be saved or shared as a PNG. Two outputs:
 *  - renderPass(…, { withQr: true }): the pass itself, QR included, for the
 *    holder's own gallery (handy offline at the gate).
 *  - renderShareCard(…): a 1080×1920 story card. Never carries the QR: a
 *    shared QR would let anyone walk in on the holder's pass.
 * Everything drawn is same-origin (local art, generated QR), so the canvas
 * never taints and can be exported.
 */

export interface PassInfo {
  name: string;
  username: string;
  college: string;
  stream: string;
  avatarSrc: string;
  qrPayload?: string;
  ready: boolean;
}

const W = 400;
const H = 624;
const PERF_Y = 454;
const NOTCH = 13;
const GOLD = "#d9a441";
const GOLD_HI = "#ffd875";
const PARCH = "236, 228, 210";

type Fonts = { display: string; taiganja: string; mono: string; sans: string };

/** next/font family names, read from the CSS variables the root layout sets. */
async function loadFonts(): Promise<Fonts> {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) =>
    css.getPropertyValue(name).trim() || fallback;
  const fonts = {
    display: v("--font-cormorant", "Georgia, serif"),
    taiganja: v("--font-taiganja", "Georgia, serif"),
    mono: v("--font-geist-mono", "monospace"),
    sans: v("--font-geist-sans", "system-ui, sans-serif"),
  };
  await Promise.all([
    document.fonts.load(`600 34px ${fonts.display}`),
    document.fonts.load(`italic 600 17px ${fonts.display}`),
    document.fonts.load(`400 17px ${fonts.display}`),
    document.fonts.load(`600 13px ${fonts.taiganja}`),
    document.fonts.load(`400 12px ${fonts.mono}`),
    document.fonts.load(`400 14px ${fonts.sans}`),
  ]).catch(() => {});
  return fonts;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Text with manual letter-spacing (canvas letterSpacing isn't everywhere yet). */
function spaced(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  align: "left" | "right" | "center" = "left",
) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total =
    widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, text.length - 1);
  let cx = align === "left" ? x : align === "right" ? x - total : x - total / 2;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, cx, y);
    cx += widths[i] + spacing;
  });
  ctx.textAlign = prev;
  return total;
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max)
    t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** The pass outline: a rectangle with half-moon notches cut at the tear line. */
function passPath(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, PERF_Y - NOTCH);
  ctx.arc(W, PERF_Y, NOTCH, -Math.PI / 2, Math.PI / 2, true);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.lineTo(0, PERF_Y + NOTCH);
  ctx.arc(0, PERF_Y, NOTCH, Math.PI / 2, -Math.PI / 2, true);
  ctx.closePath();
}

function grain(ctx: CanvasRenderingContext2D) {
  const tile = document.createElement("canvas");
  tile.width = tile.height = 3;
  const t = tile.getContext("2d")!;
  t.fillStyle = "rgba(255, 236, 190, 0.05)";
  t.fillRect(1, 1, 1, 1);
  const pattern = ctx.createPattern(tile, "repeat");
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
  }
}

/** Draws the pass at (0,0) in pass units (400×624). */
async function drawPass(
  ctx: CanvasRenderingContext2D,
  info: PassInfo,
  fonts: Fonts,
  withQr: boolean,
) {
  const [avatar, qr] = await Promise.all([
    loadImage(info.avatarSrc),
    withQr && info.qrPayload
      ? QRCode.toDataURL(info.qrPayload, {
          errorCorrectionLevel: "M",
          margin: 0,
          width: 600,
          color: { dark: "#000000", light: "#f6f1e4" },
        }).then(loadImage)
      : Promise.resolve(null),
  ]);

  ctx.save();
  passPath(ctx);
  ctx.clip();

  // Paper
  const bg = ctx.createLinearGradient(0, 0, W * 0.35, H);
  bg.addColorStop(0, "#14110c");
  bg.addColorStop(0.46, "#0a0b0d");
  bg.addColorStop(1, "#070808");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  grain(ctx);

  // Halo behind the crest
  const crestY = 178;
  const halo = ctx.createRadialGradient(W / 2, crestY, 0, W / 2, crestY, 160);
  halo.addColorStop(0, "rgba(217,164,65,0.20)");
  halo.addColorStop(0.4, "rgba(217,164,65,0.06)");
  halo.addColorStop(1, "rgba(217,164,65,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, H);

  // Inner printed rule
  ctx.strokeStyle = "rgba(217,164,65,0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(9.5, 9.5, W - 19, H - 19);
  ctx.restore();

  // Foil edge
  ctx.save();
  passPath(ctx);
  const foil = ctx.createLinearGradient(0, 0, W, H);
  foil.addColorStop(0, "rgba(255,220,140,0.95)");
  foil.addColorStop(0.3, "rgba(217,164,65,0.3)");
  foil.addColorStop(0.55, "rgba(217,164,65,0.14)");
  foil.addColorStop(1, "rgba(255,216,117,0.7)");
  ctx.strokeStyle = foil;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  ctx.textBaseline = "alphabetic";

  // Header
  ctx.fillStyle = GOLD;
  ctx.font = `600 13px ${fonts.taiganja}`;
  const wordW = spaced(ctx, "ECLECIA", 32, 48, 2.9);
  ctx.font = `italic 600 17px ${fonts.display}`;
  ctx.fillText("’27", 32 + wordW + 7, 49);
  ctx.fillStyle = `rgba(${PARCH},0.45)`;
  ctx.font = `400 10px ${fonts.mono}`;
  spaced(ctx, "FESTIVAL PASS", W - 32, 47, 2.6, "right");

  // Crest: gold ring, dark gap, artwork
  const r = 66;
  let ring: CanvasGradient;
  if (
    typeof (ctx as { createConicGradient?: unknown }).createConicGradient ===
    "function"
  ) {
    ring = ctx.createConicGradient((210 * Math.PI) / 180, W / 2, crestY);
    ring.addColorStop(0, "rgba(255,220,140,0.95)");
    ring.addColorStop(0.25, "rgba(217,164,65,0.18)");
    ring.addColorStop(0.5, "rgba(255,216,117,0.8)");
    ring.addColorStop(0.75, "rgba(217,164,65,0.18)");
    ring.addColorStop(1, "rgba(255,220,140,0.95)");
  } else {
    ring = ctx.createLinearGradient(
      W / 2 - r,
      crestY - r,
      W / 2 + r,
      crestY + r,
    );
    ring.addColorStop(0, GOLD_HI);
    ring.addColorStop(1, GOLD);
  }
  ctx.beginPath();
  ctx.arc(W / 2, crestY, r, 0, Math.PI * 2);
  ctx.fillStyle = ring;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W / 2, crestY, r - 5, 0, Math.PI * 2);
  ctx.fillStyle = "#0b0b0b";
  ctx.fill();
  if (avatar) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(W / 2, crestY, r - 8, 0, Math.PI * 2);
    ctx.clip();
    const s = (r - 8) * 2;
    const ratio = Math.max(s / avatar.width, s / avatar.height);
    const dw = avatar.width * ratio;
    const dh = avatar.height * ratio;
    ctx.drawImage(avatar, W / 2 - dw / 2, crestY - dh / 2, dw, dh);
    ctx.restore();
  }

  // Name (shrinks to fit), handle
  ctx.textAlign = "center";
  ctx.fillStyle = `rgb(${PARCH})`;
  let size = 34;
  do {
    ctx.font = `600 ${size}px ${fonts.display}`;
    size -= 1;
  } while (ctx.measureText(info.name).width > W - 64 && size > 20);
  ctx.fillText(ellipsize(ctx, info.name, W - 64), W / 2, 296);
  ctx.fillStyle = "rgba(217,164,65,0.8)";
  ctx.font = `400 12px ${fonts.mono}`;
  ctx.fillText(`@${info.username}`, W / 2, 320);

  // College / stream
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(217,164,65,0.16)";
  ctx.fillRect(32, 346, W - 64, 1);
  const col = (label: string, value: string, x: number) => {
    const max = (W - 64) / 2 - 16;
    ctx.fillStyle = `rgba(${PARCH},0.42)`;
    ctx.font = `400 10px ${fonts.mono}`;
    spaced(ctx, label, x, 372, 2.4);
    ctx.fillStyle = value ? `rgba(${PARCH},0.92)` : `rgba(${PARCH},0.3)`;
    ctx.font = `400 16.5px ${fonts.display}`;
    // Up to two lines, the second shortened if it still doesn't fit.
    const lines = wrap(ctx, value || "—", max);
    lines.slice(0, 2).forEach((line, i) => {
      const last =
        i === 1 && lines.length > 2
          ? `${line} ${lines.slice(2).join(" ")}`
          : line;
      ctx.fillText(ellipsize(ctx, last, max), x, 395 + i * 21);
    });
  };
  col("COLLEGE", info.college, 32);
  col("STREAM", info.stream, W / 2 + 8);

  // Tear line and notch rims
  ctx.save();
  ctx.strokeStyle = "rgba(217,164,65,0.5)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4.5, 4.5]);
  ctx.beginPath();
  ctx.moveTo(NOTCH + 8, PERF_Y + 0.5);
  ctx.lineTo(W - NOTCH - 8, PERF_Y + 0.5);
  ctx.stroke();
  ctx.restore();

  // Stub
  if (withQr && qr) {
    const tile = 112;
    const tx = 32;
    const ty = PERF_Y + 30;
    ctx.fillStyle = "#f6f1e4";
    ctx.fillRect(tx, ty, tile, tile);
    ctx.strokeStyle = "rgba(217,164,65,0.6)";
    ctx.strokeRect(tx + 0.5, ty + 0.5, tile - 1, tile - 1);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(qr, tx + 10, ty + 10, tile - 20, tile - 20);
    ctx.imageSmoothingEnabled = true;

    const sx = tx + tile + 24;
    ctx.fillStyle = info.ready ? "#9ccfa6" : "#e6c06a";
    ctx.beginPath();
    ctx.arc(sx + 3, ty + 22, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `400 10px ${fonts.mono}`;
    spaced(ctx, info.ready ? "READY" : "INCOMPLETE", sx + 14, ty + 26, 2.2);
    ctx.fillStyle = `rgba(${PARCH},0.66)`;
    ctx.font = `400 13.5px ${fonts.sans}`;
    wrap(
      ctx,
      "Show this QR code to the volunteers to scan for event entry.",
      W - sx - 32,
    ).forEach((l, i) => ctx.fillText(l, sx, ty + 52 + i * 19));
    ctx.fillStyle = `rgba(${PARCH},0.4)`;
    ctx.font = `400 10px ${fonts.mono}`;
    spaced(ctx, "15–17 JAN 2027 · HITK", sx, ty + 104, 1.6);
  } else {
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(${PARCH},0.45)`;
    ctx.font = `400 10px ${fonts.mono}`;
    spaced(ctx, "SEE YOU AT THE ECLIPSE", W / 2, PERF_Y + 52, 2.8, "center");
    ctx.fillStyle = `rgb(${PARCH})`;
    ctx.font = `600 30px ${fonts.display}`;
    ctx.fillText("15–17 January 2027", W / 2, PERF_Y + 92);
    ctx.fillStyle = "rgba(217,164,65,0.85)";
    ctx.font = `italic 400 17px ${fonts.display}`;
    ctx.fillText(
      "Heritage Institute of Technology, Kolkata",
      W / 2,
      PERF_Y + 122,
    );
    ctx.textAlign = "left";
  }
}

/** The pass alone, transparent around the notches. 3× by default (1200×1872). */
export async function renderPass(
  info: PassInfo,
  { withQr = true, scale = 3 } = {},
) {
  const fonts = await loadFonts();
  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  await drawPass(ctx, info, fonts, withQr);
  return canvas;
}

/** 1080×1920 story card: the scene, the pass (no QR), the dates and the site. */
export async function renderShareCard(info: PassInfo) {
  const fonts = await loadFonts();
  const CW = 1080;
  const CH = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = CW;
  canvas.height = CH;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#030405";
  ctx.fillRect(0, 0, CW, CH);
  const [sky, corona] = await Promise.all([
    loadImage("/assets/opt/bg-layer1.webp"),
    loadImage("/assets/opt/events/shared/corona-halo.webp"),
  ]);
  if (sky) {
    const ratio = Math.max(CW / sky.width, CH / sky.height);
    ctx.globalAlpha = 0.55;
    ctx.drawImage(
      sky,
      (CW - sky.width * ratio) / 2,
      (CH - sky.height * ratio) / 2,
      sky.width * ratio,
      sky.height * ratio,
    );
    ctx.globalAlpha = 1;
  }
  const vignette = ctx.createRadialGradient(
    CW / 2,
    CH * 0.48,
    200,
    CW / 2,
    CH * 0.48,
    CH * 0.75,
  );
  vignette.addColorStop(0, "rgba(3,4,5,0)");
  vignette.addColorStop(1, "rgba(3,4,5,0.9)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, CW, CH);

  const scale = 2;
  const px = (CW - W * scale) / 2;
  const py = 390;
  if (corona) {
    const cs = 1250;
    ctx.globalAlpha = 0.5;
    ctx.drawImage(corona, CW / 2 - cs / 2, py + 178 * scale - cs / 2, cs, cs);
    ctx.globalAlpha = 1;
  }

  // Lift the pass off the sky.
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 90;
  ctx.shadowOffsetY = 40;
  ctx.fillStyle = "#070808";
  ctx.fillRect(px + 10, py + 10, W * scale - 20, H * scale - 20);
  ctx.restore();

  ctx.save();
  ctx.translate(px, py);
  ctx.scale(scale, scale);
  await drawPass(ctx, info, fonts, false);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(217,164,65,0.85)";
  ctx.font = `400 26px ${fonts.mono}`;
  spaced(ctx, "I’M GOING TO", CW / 2, 205, 9, "center");
  ctx.fillStyle = `rgb(${PARCH})`;
  ctx.font = `600 96px ${fonts.taiganja}`;
  const ww = spaced(ctx, "ECLECIA", CW / 2 - 50, 300, 10, "center");
  ctx.fillStyle = GOLD;
  ctx.font = `italic 600 110px ${fonts.display}`;
  ctx.textAlign = "left";
  ctx.fillText("’27", CW / 2 - 50 + ww / 2 + 22, 303);

  ctx.textAlign = "center";
  ctx.fillStyle = `rgba(${PARCH},0.55)`;
  ctx.font = `400 24px ${fonts.mono}`;
  spaced(ctx, "THE ANNUAL CULTURAL FEST OF HITK", CW / 2, 1710, 5, "center");
  ctx.fillStyle = GOLD;
  ctx.font = `600 44px ${fonts.display}`;
  ctx.fillText("eclecia-hitk.in", CW / 2, 1785);
  return canvas;
}

export const toBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Couldn't make the image"))),
      "image/png",
    ),
  );

/** Phones and tablets: where a native share sheet is the right tool. */
export const isTouchDevice = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: coarse)").matches;

/**
 * Native share sheet with only the image (no title/text: some targets turn
 * extra fields into a second item). Returns false when the device can't.
 */
export async function shareImage(
  blob: Blob,
  filename: string,
): Promise<"shared" | "cancelled" | "unsupported"> {
  const file = new File([blob], filename, { type: "image/png" });
  if (
    typeof navigator === "undefined" ||
    !navigator.canShare?.({ files: [file] })
  )
    return "unsupported";
  try {
    await navigator.share({ files: [file] });
    return "shared";
  } catch (err) {
    return (err as DOMException)?.name === "AbortError"
      ? "cancelled"
      : "unsupported";
  }
}

export function downloadImage(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const canCopyImage = () =>
  typeof window !== "undefined" &&
  "ClipboardItem" in window &&
  Boolean(navigator.clipboard?.write);

/** Puts the PNG itself on the clipboard (paste straight into WhatsApp Web, Slack, a story editor). */
export async function copyImage(blob: Blob) {
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}
