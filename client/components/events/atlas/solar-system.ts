import { atlasArt, type AtlasCategory } from "@/constants/events";
import { closedCatmullRom, makeCamera, type Projected, type Vec3 } from "./orbit-math";
import { ORBIT_TRACE as trace } from "./orbit-trace";

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const SVG_NS = "http://www.w3.org/2000/svg";

export interface OrbitPoint {
  x: number;
  y: number;
  size: number;
  /** 0 at the front of the orbit, 1 at the back. */
  depth: number;
  /** 1 at the front of the orbit, 0 at the back. */
  frontness: number;
  /** Rotation about the vertical axis (radians) so the world faces the eclipse. */
  turn: number;
}

interface TracedSample {
  phase: number;
  x: number;
  y: number;
}

interface MaskWorld {
  group: SVGGElement;
  base: SVGImageElement;
  art: SVGImageElement;
}

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attributes: Record<string, string | number> = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

function image(src: string, className: string) {
  const img = new Image();
  img.src = src;
  img.alt = "";
  img.className = className;
  img.draggable = false;
  return img;
}

/**
 * The orbit system behind the category worlds. All visible layers are original
 * art; camera math supplies their depth. Owns the rear/front orbit passes, the
 * eclipse, the rail glow and the occlusion mask that keeps the front rail off
 * the medallion artwork.
 */
export class SolarSystem {
  readonly tracedPath: TracedSample[];
  readonly nodes: Element[];
  sun = { x: 0, y: 0 };
  private orbit: HTMLImageElement;
  private frontOrbit: HTMLImageElement;
  private trails: SVGSVGElement[];
  private mask: SVGMaskElement;
  private maskBackground: SVGRectElement;
  private maskWorlds: MaskWorld[];
  private eclipse: HTMLDivElement;
  private project: (point: Vec3, radius?: number) => Projected = () => ({ x: 0, y: 0, size: 0, depth: 0 });
  private small = false;
  private farSize = 0;
  private depthPerspective = 0;
  private orbitLayout = { width: 0, height: 0, cx: 0, cy: 0, roll: 0 };

  constructor(host: HTMLElement, categories: readonly AtlasCategory[]) {
    const c = Math.cos(trace.axisAngle);
    const s = Math.sin(trace.axisAngle);
    // Parameterize the traced rail by orbital phase, so near/far scaling and
    // the snap controls retain consistent spatial meaning.
    this.tracedPath = closedCatmullRom(trace.anchors, 1440)
      .slice(0, -1)
      .map(([x, y]) => {
        const dx = x - trace.cx;
        const dy = y - trace.cy;
        const theta = Math.atan2((-s * dx + c * dy) / trace.b, (c * dx + s * dy) / trace.a);
        return { phase: (theta + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2), x, y };
      })
      .sort((a, b) => a.phase - b.phase);

    this.orbit = image(atlasArt.shared("orbit-perspective-v2"), "asset-orbits asset-orbits-rear");
    this.orbit.setAttribute("aria-hidden", "true");
    this.frontOrbit = this.orbit.cloneNode() as HTMLImageElement;
    this.frontOrbit.className = "asset-orbits asset-orbits-front";

    // Use the actual artwork alpha as an occlusion mask, not circular holes:
    // feather tips and silk remain protected without cutting gaps around them.
    const maskDefs = svg("svg", { width: 0, height: 0, "aria-hidden": "true" });
    maskDefs.style.position = "absolute";
    const defs = svg("defs");
    const black = svg("filter", { id: "atlas-mask-black", "color-interpolation-filters": "sRGB" });
    black.append(svg("feColorMatrix", { type: "matrix", values: "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" }));
    this.mask = svg("mask", {
      id: "atlas-orbit-occlusion",
      maskUnits: "userSpaceOnUse",
      maskContentUnits: "userSpaceOnUse",
      x: 0,
      y: 0,
      "mask-type": "luminance",
    });
    this.maskBackground = svg("rect", { x: 0, y: 0, fill: "white" });
    this.mask.append(this.maskBackground);
    this.maskWorlds = categories.map((category) => {
      const group = svg("g", { filter: "url(#atlas-mask-black)" });
      const base = svg("image", { href: atlasArt.shared("medallion-base"), preserveAspectRatio: "xMidYMid meet" });
      const art = svg("image", { href: atlasArt.category(category.id), preserveAspectRatio: "xMidYMid meet" });
      group.append(base, art);
      this.mask.append(group);
      return { group, base, art };
    });
    defs.append(black, this.mask);
    maskDefs.append(defs);
    this.frontOrbit.style.mask = "url(#atlas-orbit-occlusion)";

    this.eclipse = document.createElement("div");
    this.eclipse.className = "asset-eclipse";
    this.eclipse.setAttribute("aria-hidden", "true");
    this.eclipse.append(image(atlasArt.shared("eclipse-core"), "asset-core"), image(atlasArt.shared("corona-halo"), "asset-corona"));

    // Static, heavily blurred glow along the traced rail: light, not a line.
    const d = `M${this.tracedPath.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L")} Z`;
    this.trails = ["rear", "front"].map((side) => {
      const layer = svg("svg", {
        class: `asset-trail asset-trail-${side}`,
        viewBox: `0 0 ${trace.width} ${trace.height}`,
        preserveAspectRatio: "none",
        "aria-hidden": "true",
      });
      layer.append(svg("path", { d, class: "trail-loop" }));
      return layer;
    });
    // Front glow shares the front rail's occlusion so it never crosses a world.
    this.trails[1].style.mask = "url(#atlas-orbit-occlusion)";

    this.nodes = [maskDefs, this.orbit, this.trails[0], this.eclipse, this.frontOrbit, this.trails[1]];
    host.prepend(...this.nodes);
  }

  /** Removes every node this system added to the host. */
  destroy() {
    this.nodes.forEach((node) => node.remove());
  }

  resize(w: number, h: number) {
    this.small = w <= 760;
    const distance = this.small ? Math.max(42, 21.5 / (w / h)) : Math.max(19, 27 / (w / h));
    // Offset lifts the composition, reserving space for the larger foreground world.
    this.project = makeCamera({
      position: [0, distance * (this.small ? 0.4 : 0.31), distance],
      target: [0, this.small ? 0 : 0.2, 0],
      roll: this.small ? -0.58 : -0.16,
      fov: this.small ? 49 : 48,
      width: w,
      height: h,
      offsetY: h * (this.small ? -0.09 : 0.1),
    });
    this.layoutArtwork();
  }

  private layoutArtwork() {
    // Perspective is baked into the orbit art. Scale uniformly, never flatten or warp it.
    const center = this.project([0, 0, 0], 0);
    const perimeter = Array.from({ length: 96 }, (_, i) => {
      const t = (i / 96) * Math.PI * 2;
      return this.project([Math.sin(t) * 10.6, 0, Math.cos(t) * 10.6], 0);
    });
    const width = (Math.max(...perimeter.map((p) => p.x)) - Math.min(...perimeter.map((p) => p.x))) * 1.06;
    const height = (width * trace.height) / trace.width;
    this.orbitLayout = { width, height, cx: center.x, cy: center.y, roll: this.small ? -0.42 : 0 };
    for (const node of [this.mask, this.maskBackground]) {
      node.setAttribute("width", String(width));
      node.setAttribute("height", String(height));
    }
    const box = {
      width: `${width}px`,
      height: `${height}px`,
      left: `${center.x - width * 0.5}px`,
      top: `${center.y - height * 0.4}px`,
      transform: this.small ? "rotate(-.42rad)" : "none",
    };
    for (const layer of [this.orbit, this.frontOrbit, ...this.trails]) Object.assign(layer.style, box);

    const lineLeft = ((trace.cy - trace.cx * Math.tan(trace.axisAngle)) / trace.height) * 100;
    const lineRight = ((trace.cy + (trace.width - trace.cx) * Math.tan(trace.axisAngle)) / trace.height) * 100;
    // Extend the split past the layer box so the blurred glow is not cut
    // off along its edges; only the diagonal front/rear line stays hard.
    const pad = 12;
    const slope = (lineRight - lineLeft) / 100;
    const outL = lineLeft - pad * slope;
    const outR = lineRight + pad * slope;
    const rear = `polygon(-${pad}% -40%,${100 + pad}% -40%,${100 + pad}% ${outR}%,-${pad}% ${outL}%)`;
    const front = `polygon(-${pad}% ${outL}%,${100 + pad}% ${outR}%,${100 + pad}% 140%,-${pad}% 140%)`;
    for (const layer of [this.orbit, this.trails[0]]) layer.style.clipPath = rear;
    for (const layer of [this.frontOrbit, this.trails[1]]) layer.style.clipPath = front;

    const core = this.project([0, 0.22, 0], 1.95);
    this.sun = this.assetToScreen(trace.cx, trace.cy);
    Object.assign(this.eclipse.style, {
      left: `${this.sun.x}px`,
      top: `${this.sun.y}px`,
      width: `${core.size}px`,
      height: `${core.size}px`,
    });
    this.farSize = this.project([0, 0.12, -8.6], 1.28).size;
    const nearSize = this.project([0, 0.12, 8.6], 1.28).size;
    this.depthPerspective = 1 - this.farSize / nearSize;
  }

  private assetToScreen(x: number, y: number) {
    const { width, height, cx, cy, roll } = this.orbitLayout;
    const dx = (x / trace.width) * width - width * 0.5;
    const dy = (y / trace.height) * height - height * 0.4;
    return { x: cx + Math.cos(roll) * dx - Math.sin(roll) * dy, y: cy + Math.sin(roll) * dx + Math.cos(roll) * dy };
  }

  private tracePoint(angle: number) {
    const phase = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const path = this.tracedPath;
    let lo = 0;
    let hi = path.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (path[mid].phase < phase) lo = mid + 1;
      else hi = mid;
    }
    const b = path[lo % path.length];
    const a = path[(lo + path.length - 1) % path.length];
    let end = b.phase;
    const start = a.phase;
    let value = phase;
    if (end < start) end += Math.PI * 2;
    if (value < start) value += Math.PI * 2;
    const f = (value - start) / (end - start || 1);
    return this.assetToScreen(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f);
  }

  pointAt(t: number): OrbitPoint {
    const frontness = (1 - Math.cos(t)) / 2;
    // Deliberate foreground emphasis; preserve the approved far-side size.
    const size = (this.farSize / (1 - this.depthPerspective * frontness)) * (1 + 0.72 * Math.pow(frontness, 4));
    const p = this.tracePoint(t);
    const { roll, width } = this.orbitLayout;
    // Medallions turn to face the eclipse as they travel round the flanks.
    const side = clamp((Math.cos(roll) * (p.x - this.sun.x) + Math.sin(roll) * (p.y - this.sun.y)) / (width * 0.42), -1, 1);
    return { ...p, size, depth: 1 - frontness, frontness, turn: -side * 0.38 };
  }

  frontSlot() {
    return this.pointAt(Math.PI);
  }

  update(rotation: number, angles: readonly number[]) {
    this.eclipse.style.transform = `translate(-50%,-50%) rotate(${-rotation * 0.55}rad)`;
    const points = angles.map((a) => this.pointAt(a + rotation));
    this.updateOcclusion(points);
    return points;
  }

  private updateOcclusion(points: OrbitPoint[]) {
    const { width, height, cx, cy, roll } = this.orbitLayout;
    const cos = Math.cos(roll);
    const sin = Math.sin(roll);
    points.forEach((p, i) => {
      const { group, base, art } = this.maskWorlds[i];
      const dx = p.x - cx;
      const dy = p.y - cy;
      const x = cos * dx + sin * dy + width * 0.5;
      const y = -sin * dx + cos * dy + height * 0.4;
      // Invert the portrait orbit's rigid rotation so mask artwork remains
      // upright in screen space, exactly like the visible medallions.
      group.setAttribute("transform", `translate(${x} ${y}) rotate(${(-roll * 180) / Math.PI}) scale(${Math.cos(p.turn).toFixed(4)} 1)`);
      for (const [node, factor] of [[base, 1], [art, 0.94]] as const) {
        const size = p.size * factor;
        node.setAttribute("x", String(-size / 2));
        node.setAttribute("y", String(-size / 2));
        node.setAttribute("width", String(size));
        node.setAttribute("height", String(size));
      }
    });
  }
}
