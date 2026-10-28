import { ATLAS_CATEGORIES, atlasArt, type AtlasCategory } from "@/constants/events";
import { SolarSystem, type OrbitPoint } from "./solar-system";

/*
 * Events atlas runtime: the category orbit, the zoom into a category's world of
 * event planets, and the directory/detail dialogs. Imperative by design — one
 * requestAnimationFrame loop and native Web Animations, no per-frame React
 * renders. Atlas wheel/drag input rotates the orbit; event mode keeps native
 * page scrolling as the camera.
 *
 * Ported from design/events-atlas/poc (app.js). `mountAtlas` returns a cleanup
 * that removes every listener, timer, animation and generated node, so it is
 * safe under React strict-mode double mounting.
 */

type Mode = "atlas" | "events";

const ORBIT_STEP = (Math.PI * 2) / 7;
const ORBIT_ANGLES = [
  (-Math.PI * 3) / 7, Math.PI, -Math.PI / 7, Math.PI / 7, (Math.PI * 3) / 7, (Math.PI * 5) / 7, (-Math.PI * 5) / 7,
];
const EASE = "cubic-bezier(.76,0,.24,1)";
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function mountAtlas(root: HTMLElement): () => void {
  const data = ATLAS_CATEGORIES;
  const controller = new AbortController();
  const { signal } = controller;
  const on = <T extends Event>(
    target: EventTarget,
    type: string,
    handler: (event: T) => void,
    options: AddEventListenerOptions = {},
  ) => target.addEventListener(type, handler as EventListener, { ...options, signal });

  const $ = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = () => innerWidth <= 760;

  let mode: Mode = "atlas";
  let busy = false;
  let disposed = false;
  let category: AtlasCategory | null = null;
  let active = -1;
  let progress = 0;
  let planets: HTMLButtonElement[] = [];
  const categoryButtons: HTMLButtonElement[] = [];
  let pointerX = 0, pointerY = 0, skyX = 0, skyY = 0;
  let directoryFilter = "all";
  let previousTime = 0;
  let focusedWorld: HTMLButtonElement | null = null;
  let modalScroll = 0;
  let orbitRotation = 0, orbitTarget = 0, orbitVelocity = 0, blockOrbitClickUntil = 0;
  let orbitGesture: { id: number; x: number; y: number; rotation: number; last: number; time: number; moved: boolean } | null = null;
  let orbitReady = false;
  let frontCategory = "";
  let frontWorld: AtlasCategory | null = null;
  let wheelSnap = 0, loadTimeout = 0, rafId = 0;
  let floatClock = 0;
  let traveling = false;
  /** Opening sequence in flight: input waits, and the orbit spin is driven by `introSpin`. */
  let introPlaying = false;
  let introSpin: { start: number; duration: number; from: number } | null = null;
  let introAnimations: Animation[] = [];

  const camera = $("atlas-camera");
  const overview = $("overview");
  const scene = $("event-scene");
  const directory = $<HTMLDialogElement>("directory");
  const detail = $<HTMLDialogElement>("event-detail");
  const loadStatus = $("load-status");
  const skyTexture = root.querySelector<HTMLElement>(".sky-texture")!;
  const dust = root.querySelector<HTMLElement>(".dust")!;
  const failedImages = new Set<string>();
  root.dataset.mode = mode;

  let solar: SolarSystem | null = null;
  try {
    solar = new SolarSystem(camera, data);
  } catch (error) {
    console.error("Atlas projection unavailable", error);
    loadStatus.textContent = "The atlas could not load. All events remain available in the directory.";
  }

  function image(src: string, className: string, priority = false) {
    const img = new Image();
    img.src = src;
    img.alt = "";
    img.className = className;
    img.decoding = "async";
    img.draggable = false;
    if (priority) img.fetchPriority = "high";
    let retry = 0;
    on(img, "load", () => {
      if (failedImages.delete(src) && failedImages.size === 0) loadStatus.hidden = true;
    });
    on(img, "error", () => {
      if (retry++ < 1) {
        img.src = `${src}?reload=${Date.now()}`;
        return;
      }
      failedImages.add(src);
      loadStatus.textContent = "An illustration could not load. Refresh to try again.";
      loadStatus.hidden = false;
    });
    return img;
  }

  function animate(el: Element, frames: Keyframe[], duration = 850, options: KeyframeAnimationOptions = {}) {
    const animation = el.animate(frames, { duration: reduce.matches ? 1 : duration, easing: EASE, fill: "forwards", ...options });
    return animation.finished.catch(() => {}).then(() => animation);
  }
  const cancelAnimations = (el: Element) => el.getAnimations().forEach((a) => a.cancel());

  function fadeCopy() {
    const copy = $("event-copy");
    cancelAnimations(copy);
    copy.animate([{ opacity: 0, translate: "0 15px" }, { opacity: 1, translate: "0 0" }], {
      duration: reduce.matches ? 1 : 470,
      easing: "cubic-bezier(.22,1,.36,1)",
    });
  }

  function worldGraphic(c: AtlasCategory) {
    const graphic = document.createElement("span");
    graphic.className = "world-art";
    graphic.append(
      image(atlasArt.shared("corona-halo"), "world-halo"),
      image(atlasArt.shared("medallion-base"), "world-base"),
      image(atlasArt.category(c.id), "world-artwork", true),
    );
    // Eclipse lighting, clipped to the medallion disc.
    const shade = document.createElement("span");
    shade.className = "world-shade";
    const rim = document.createElement("span");
    rim.className = "world-rim";
    graphic.append(shade, rim);
    return graphic;
  }

  // One caption, pinned to the fixed front slot; it names whichever world
  // sits there and fades out as worlds pass through mid-turn.
  const frontCaption = document.createElement("button");
  frontCaption.id = "front-caption";
  frontCaption.tabIndex = -1;
  frontCaption.setAttribute("aria-hidden", "true");
  frontCaption.innerHTML =
    '<span class="category-name"></span><span class="category-kind"></span><span class="world-enter">ENTER WORLD ↗</span>';
  on(frontCaption, "click", () => {
    if (performance.now() >= blockOrbitClickUntil && frontWorld) enterCategory(frontWorld);
  });

  data.forEach((c, i) => {
    const button = document.createElement("button");
    button.className = "category-world";
    button.dataset.category = c.id;
    button.style.setProperty("--i", String(i));
    button.setAttribute("aria-label", `Enter ${c.name}, ${c.kind}, ${c.events.length} events`);
    const shadow = document.createElement("span");
    shadow.className = "world-shadow";
    button.append(shadow, worldGraphic(c));
    on<MouseEvent>(button, "click", (e) => {
      if (performance.now() < blockOrbitClickUntil) {
        e.preventDefault();
        return;
      }
      enterCategory(c);
    });
    $("category-worlds").append(button);
    categoryButtons.push(button);

    const dock = document.createElement("button");
    dock.className = "dock-world";
    dock.title = c.name;
    dock.setAttribute("aria-label", `Enter ${c.name}`);
    const caption = document.createElement("span");
    caption.textContent = c.name;
    dock.append(image(atlasArt.category(c.id), ""), caption);
    on(dock, "click", () => switchCategory(c));
    $("category-dock").append(dock);
  });
  $("category-worlds").append(frontCaption);

  const step = () => innerHeight * (mobile() ? 1.06 : 1.12);
  const planetSize = () =>
    mobile() ? Math.min(innerWidth * 0.78, innerHeight * 0.44) : Math.min(innerWidth * 0.47, innerHeight * 0.76, 730);

  function layout() {
    // A hidden or collapsing viewport can report 0 × 0; projecting with it
    // yields NaN geometry, so keep the last good layout until it is real.
    if (!innerWidth || !innerHeight) return;
    solar?.resize(innerWidth, innerHeight);
    orbitReady = true;
    renderOrbit();
    if (category) {
      $("scroll-track").style.height = mode === "events" ? `${innerHeight + (category.events.length - 1) * step()}px` : "0px";
      root.style.setProperty("--planet-size", `${planetSize()}px`);
    }
    renderPlanets();
  }

  function renderOrbit() {
    if (!orbitReady) return;
    const small = mobile();
    const points: OrbitPoint[] | undefined = solar?.update(orbitRotation, ORBIT_ANGLES);
    const sun = solar?.sun ?? { x: innerWidth * 0.6, y: innerHeight * 0.5 };
    let front = 0;
    let frontDepth = Infinity;
    categoryButtons.forEach((button, i) => {
      const p = points?.[i] ?? { x: innerWidth * (0.13 + i * 0.12), y: innerHeight * 0.6, size: innerWidth * 0.1, depth: 30, frontness: 1, turn: 0 };
      const f = p.frontness;
      const back = 1 - f;
      const s = button.style;
      s.setProperty("--size", `${p.size}px`);
      s.setProperty("--x", `${p.x}px`);
      s.setProperty("--y", `${p.y}px`);
      s.setProperty("--turn", `${p.turn.toFixed(4)}rad`);
      // Light falls from the eclipse: a warm rim on the sun-facing edge and
      // shade on the far side; rear worlds are backlit and sink into haze.
      s.setProperty("--sun-angle", `${Math.atan2(sun.x - p.x, p.y - sun.y).toFixed(4)}rad`);
      s.setProperty("--shade", (0.3 + back * 0.3).toFixed(3));
      s.setProperty("--rim", (0.5 + back * 0.3).toFixed(3));
      s.setProperty("--halo", (0.12 + back * back * 0.5).toFixed(3));
      s.setProperty("--contact", (0.2 + f * 0.55).toFixed(3));
      s.setProperty(
        "--haze",
        `blur(${(back * back * (small ? 0.3 : 0.55)).toFixed(2)}px) brightness(${(0.7 + 0.3 * Math.pow(f, 0.7)).toFixed(3)}) saturate(${(0.82 + 0.18 * f).toFixed(3)})`,
      );
      // The sun sits between the rear and front orbital hemispheres.
      s.zIndex = String((f < 0.5 ? 20 : 60) + Math.round(f * 20));
      if (p.depth < frontDepth) {
        frontDepth = p.depth;
        front = i;
      }
    });
    if (frontCategory !== data[front].name) {
      frontCategory = data[front].name;
      frontWorld = data[front];
      frontCaption.querySelector(".category-name")!.textContent = frontWorld.name;
      frontCaption.querySelector(".category-kind")!.textContent = `${frontWorld.kind} · ${frontWorld.events.length} events`;
    }
    if (solar) {
      const slot = solar.frontSlot();
      // Fully visible when a world is seated; zero exactly at mid-turn.
      const offset = Math.abs(
        Math.atan2(Math.sin(Math.PI - ORBIT_ANGLES[front] - orbitRotation), Math.cos(Math.PI - ORBIT_ANGLES[front] - orbitRotation)),
      );
      frontCaption.style.setProperty("--x", `${slot.x}px`);
      frontCaption.style.setProperty("--y", `${slot.y + slot.size * 0.5 + (small ? 6 : 12)}px`);
      frontCaption.style.opacity = clamp(1 - offset / (ORBIT_STEP * 0.42), 0, 1).toFixed(3);
      frontCaption.style.pointerEvents = offset < ORBIT_STEP * 0.1 ? "auto" : "none";
    }
  }

  function turnOrbit(direction: number) {
    if (mode !== "atlas" || busy || introPlaying) return;
    orbitTarget += direction * ORBIT_STEP;
  }

  function snapOrbit() {
    let adjustment = Infinity;
    ORBIT_ANGLES.forEach((a) => {
      const delta = Math.atan2(Math.sin(Math.PI - a - orbitTarget), Math.cos(Math.PI - a - orbitTarget));
      if (Math.abs(delta) < Math.abs(adjustment)) adjustment = delta;
    });
    orbitTarget += adjustment;
  }

  on<PointerEvent>(camera, "pointerdown", (e) => {
    if (mode !== "atlas" || busy || introPlaying || e.button !== 0) return;
    orbitGesture = { id: e.pointerId, x: e.clientX, y: e.clientY, rotation: orbitTarget, last: orbitTarget, time: e.timeStamp, moved: false };
    orbitVelocity = 0;
  });
  on<PointerEvent>(camera, "pointermove", (e) => {
    const d = orbitGesture;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) > 7) {
      d.moved = true;
      camera.setPointerCapture(e.pointerId);
      camera.classList.add("is-dragging");
    }
    if (!d.moved) return;
    e.preventDefault();
    const next = d.rotation + (dx - dy * 0.45) / (innerWidth * 0.3);
    const elapsed = Math.max(8, e.timeStamp - d.time) / 16.667;
    orbitVelocity = orbitVelocity * 0.45 + ((next - d.last) / elapsed) * 0.55;
    orbitTarget = next;
    d.last = next;
    d.time = e.timeStamp;
  });
  const finishOrbitGesture = (e: PointerEvent) => {
    if (!orbitGesture || orbitGesture.id !== e.pointerId) return;
    // Release settles the nearest world into the front slot; a flick may
    // carry it at most one world further.
    if (orbitGesture.moved) {
      blockOrbitClickUntil = performance.now() + 350;
      orbitTarget += clamp(orbitVelocity * 6, -ORBIT_STEP * 0.6, ORBIT_STEP * 0.6);
      snapOrbit();
    }
    if (camera.hasPointerCapture(e.pointerId)) camera.releasePointerCapture(e.pointerId);
    orbitGesture = null;
    camera.classList.remove("is-dragging");
  };
  on(camera, "pointerup", finishOrbitGesture);
  on(camera, "pointercancel", finishOrbitGesture);
  on<WheelEvent>(
    camera,
    "wheel",
    (e) => {
      if (mode !== "atlas" || busy || introPlaying) return;
      e.preventDefault();
      orbitTarget += clamp(e.deltaX || e.deltaY, -90, 90) * 0.0028;
      clearTimeout(wheelSnap);
      wheelSnap = window.setTimeout(snapOrbit, 140);
    },
    { passive: false },
  );

  function buildSystem(c: AtlasCategory) {
    category = c;
    active = -1;
    progress = 0;
    planets = [];
    $("planet-system").replaceChildren();
    $("event-progress").replaceChildren();
    $("breadcrumb").textContent = c.name;
    $("world-label").textContent = `THE ${c.name.toUpperCase()} WORLD`;
    $("category-line").textContent = c.line;
    root.style.setProperty("--planet-size", `${planetSize()}px`);
    c.events.forEach((event, i) => {
      const node = document.createElement("button");
      node.className = "event-planet";
      node.setAttribute("aria-label", `View ${event.name}`);
      node.append(
        image(atlasArt.shared("corona-halo"), "planet-halo"),
        image(atlasArt.shared("event-orbit"), "planet-ring rear"),
        image(atlasArt.shared("planet-base"), "planet-base"),
        image(atlasArt.event(c.id, event.id), "planet-artwork", i === 0),
        image(atlasArt.shared("event-orbit"), "planet-ring front"),
      );
      const preview = document.createElement("span");
      preview.className = "planet-preview";
      preview.textContent = event.name;
      node.append(preview);
      on(node, "click", () => (i === active ? openDetail() : goTo(i)));
      $("planet-system").append(node);
      planets.push(node);
      const stop = document.createElement("button");
      stop.className = "progress-stop";
      stop.setAttribute("aria-label", `Go to ${event.name}`);
      stop.title = event.name;
      on(stop, "click", () => goTo(i));
      $("event-progress").append(stop);
    });
    [...$("category-dock").children].forEach((b, i) => b.setAttribute("aria-current", String(data[i] === c)));
    updateCopy(0);
    renderPlanets();
  }

  function updateCopy(index: number) {
    if (!category || index === active) return;
    active = index;
    const event = category.events[index];
    $("event-title").textContent = event.name;
    $("event-description").textContent = event.description;
    $("event-kind").textContent = event.kind;
    $("event-counter").textContent = `${index + 1} / ${category.events.length} events`;
    $("journey-label").textContent = `${index + 1} of ${category.events.length}`;
    $<HTMLButtonElement>("previous").disabled = index === 0;
    $<HTMLButtonElement>("next").disabled = index === category.events.length - 1;
    [...$("event-progress").children].forEach((b, i) => b.setAttribute("aria-current", String(i === index)));
    planets.forEach((p, i) => {
      p.classList.toggle("is-current", i === index);
      p.tabIndex = Math.abs(i - index) <= 1 ? 0 : -1;
    });
    setHash(`#${category.id}/${event.id}`);
    fadeCopy();
  }

  // Keep Next's history state intact; only the hash changes.
  const setHash = (hash: string) =>
    window.history.replaceState(window.history.state, "", `${location.pathname}${location.search}${hash}`);

  function renderPlanets() {
    if (!category) return;
    const w = innerWidth;
    const h = innerHeight;
    const size = planetSize();
    const small = mobile();
    planets.forEach((node, i) => {
      const offset = i - progress;
      let x: number, y: number, scale: number, opacity: number;
      if (offset >= 0) {
        const first = Math.min(offset, 1);
        const rest = Math.max(0, offset - 1);
        x = w * ((small ? 0.54 : 0.705) + (small ? 0.39 : 0.18) * first + 0.19 * rest);
        y = h * ((small ? 0.335 : 0.515) - (small ? 0.13 : 0.3) * first + 0.04 * rest);
        scale = Math.exp(-(small ? 1.28 : 1.09) * offset);
        opacity = Math.pow(0.56, offset);
      } else {
        const t = -offset;
        x = w * ((small ? 0.54 : 0.705) - (small ? 0.78 : 0.79) * t);
        y = h * ((small ? 0.335 : 0.515) + 0.66 * t);
        scale = 1 + 0.8 * t;
        opacity = 1 - clamp(t, 0, 1);
      }
      const visible = offset > -1.05 && offset < 2.15;
      node.style.visibility = visible ? "visible" : "hidden";
      node.style.pointerEvents = visible && opacity > 0.2 ? "auto" : "none";
      node.style.opacity = String(clamp(opacity, 0, 1));
      node.style.zIndex = String(offset < 0 ? 3 : Math.max(0, 2 - i + Math.floor(progress)));
      node.style.transform = `translate3d(${x - size / 2}px,${y - size / 2}px,0) scale(${scale})`;
    });
  }

  // Camera zoom toward a world, stopped part-way along the full dive: zooming
  // the whole atlas to ~6x makes Chrome rasterize it huge and paint it in
  // visible tiles. The atlas is faded out long before it would get there.
  function setZoom(x: number, y: number, width: number) {
    camera.style.transformOrigin = `${x}px ${y}px`;
    const tx = innerWidth * 0.63 - x;
    const ty = innerHeight * 0.5 - y;
    const full = Math.max(5.8, (Math.max(innerWidth, innerHeight) * 1.4) / width);
    const at = (scale: number) => {
      const k = (scale - 1) / (full - 1);
      return `translate3d(${tx * k}px,${ty * k}px,0) scale(${scale})`;
    };
    camera.dataset.zoomIn = at(2);
    camera.dataset.zoomBack = at(2);
  }

  // Decode a scene's images before revealing it, so nothing paints half-drawn;
  // capped so a slow image never holds the transition hostage.
  const decoded = (imgs: HTMLImageElement[], cap: number) =>
    Promise.race([
      Promise.all(imgs.map((img) => img.decode().catch(() => {}))),
      new Promise((resolve) => setTimeout(resolve, cap)),
    ]);
  const sceneImages = (index: number) => [
    ...scene.querySelectorAll<HTMLImageElement>(".immersive-corona"),
    ...planets.slice(index, index + 2).flatMap((p) => [...p.querySelectorAll("img")]),
  ];

  async function enterCategory(c: AtlasCategory, index = 0, instant = false): Promise<void> {
    if (busy || introPlaying) return;
    if (mode === "events") return switchCategory(c, index);
    busy = true;
    focusedWorld = categoryButtons[data.indexOf(c)];
    orbitTarget = orbitRotation;
    const rect = focusedWorld.querySelector(".world-art")!.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    buildSystem(c);
    scene.hidden = false;
    scene.inert = true;
    scene.style.opacity = "0";
    setZoom(x, y, rect.width);
    focusedWorld.classList.add("selected");
    const ready = decoded(sceneImages(index), 500);
    const start = performance.now();
    const duration = instant ? 1 : 1250;
    const intro = root.querySelector(".intro")!;
    const silk = root.querySelector(".foreground")!;
    const copyFade = animate(intro, [{ opacity: 1, translate: "0 0" }, { opacity: 0, translate: "-30px 0" }], duration * 0.45);
    const decorFade = animate(silk, [{ opacity: getComputedStyle(silk).opacity }, { opacity: 0 }], duration * 0.5);
    categoryButtons.filter((b) => b !== focusedWorld).forEach((b) => animate(b, [{ opacity: 1 }, { opacity: 0 }], duration * 0.52));
    animate(focusedWorld.querySelector(".world-artwork")!, [{ opacity: 1 }, { opacity: 0 }], duration * 0.55);
    const zooming = animate(
      camera,
      [{ transform: "none", opacity: 1 }, { opacity: 0, offset: 0.8 }, { transform: camera.dataset.zoomIn, opacity: 0 }],
      duration,
    );
    const revealing = ready.then(() =>
      animate(scene, [{ opacity: 0, transform: "scale(.88)" }, { opacity: 1, transform: "scale(1)" }], duration * 0.65, {
        delay: reduce.matches ? 0 : Math.max(0, duration * 0.4 - (performance.now() - start)),
      }),
    );
    await Promise.all([copyFade, decorFade, zooming, revealing]);
    if (disposed) return;
    mode = "events";
    root.dataset.mode = mode;
    overview.inert = true;
    overview.style.visibility = "hidden";
    scene.inert = false;
    scene.style.opacity = "1";
    scene.style.transform = "none";
    cancelAnimations(scene);
    $("scroll-track").style.height = `${innerHeight + (c.events.length - 1) * step()}px`;
    window.scrollTo({ top: index * step(), behavior: "instant" });
    progress = index;
    updateCopy(index);
    renderPlanets();
    busy = false;
    $("back").focus({ preventScroll: true });
  }

  async function leaveCategory() {
    if (busy || mode !== "events") return;
    busy = true;
    // Atlas images may have been discarded while hidden; decode them before
    // they become visible so none paint in half-drawn.
    await decoded([...overview.querySelectorAll("img")], 300);
    if (disposed) return;
    scene.inert = true;
    mode = "atlas";
    root.dataset.mode = mode;
    $("scroll-track").style.height = "0px";
    window.scrollTo({ top: 0, behavior: "instant" });
    overview.style.visibility = "visible";
    overview.inert = false;
    categoryButtons.forEach((b) => b.classList.remove("selected"));
    cancelAnimations(camera);
    camera.style.transform = camera.dataset.zoomBack ?? "none";
    const duration = 1000;
    const fade = animate(scene, [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.85)" }], duration * 0.65);
    const zoom = animate(camera, [{ opacity: 0, transform: camera.dataset.zoomBack ?? "none" }, { opacity: 1, transform: "none" }], duration);
    const settling = [
      animate(root.querySelector(".intro")!, [{ opacity: 0, translate: "-20px 0" }, { opacity: 1, translate: "0 0" }], duration, {
        delay: reduce.matches ? 0 : 180,
        fill: "both",
      }),
    ];
    const silk = root.querySelector(".foreground")!;
    cancelAnimations(silk);
    settling.push(animate(silk, [{ opacity: 0 }, { opacity: getComputedStyle(silk).opacity }], duration));
    categoryButtons.forEach((b) => {
      cancelAnimations(b);
      b.style.opacity = "1";
      settling.push(animate(b, [{ opacity: 0 }, { opacity: 1 }], duration, { delay: reduce.matches ? 0 : 120, fill: "both" }));
    });
    // A world entered earlier and then switched away from via the dock still
    // holds its faded-out artwork; clear every one, then fade in the current.
    categoryButtons.forEach((b) => cancelAnimations(b.querySelector(".world-artwork")!));
    if (focusedWorld) settling.push(animate(focusedWorld.querySelector(".world-artwork")!, [{ opacity: 0 }, { opacity: 1 }], duration));
    await Promise.all([fade, zoom]);
    if (disposed) return;
    scene.hidden = true;
    // Release the world's planets: their full-size art otherwise stays in the
    // decode cache and evicts the atlas images, which then re-decode mid-orbit.
    // enterCategory rebuilds them.
    $("planet-system").replaceChildren();
    planets = [];
    cancelAnimations(scene);
    cancelAnimations(camera);
    camera.style.transform = "none";
    setHash("");
    busy = false;
    focusedWorld?.focus({ preventScroll: true });
    // Drop the finished fade-ins once they end: a lingering fill keeps every
    // world on its own compositor layer, repainted each frame by the float.
    Promise.all(settling).then((done) => done.forEach((a) => a.cancel()));
  }

  async function switchCategory(c: AtlasCategory, index = 0): Promise<void> {
    if (busy) return;
    if (mode === "atlas") return enterCategory(c, index);
    if (c === category) {
      goTo(index);
      return;
    }
    busy = true;
    scene.inert = true;
    await animate(scene, [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.12)" }], 430);
    if (disposed) return;
    buildSystem(c);
    $("scroll-track").style.height = `${innerHeight + (c.events.length - 1) * step()}px`;
    window.scrollTo({ top: index * step(), behavior: "instant" });
    progress = index;
    updateCopy(index);
    renderPlanets();
    focusedWorld = categoryButtons[data.indexOf(c)];
    cancelAnimations(camera);
    camera.style.transform = "none";
    const rect = focusedWorld.querySelector(".world-art")!.getBoundingClientRect();
    setZoom(rect.left + rect.width / 2, rect.top + rect.height / 2, rect.width);
    await decoded(sceneImages(index), 500);
    await animate(scene, [{ opacity: 0, transform: "scale(.88)" }, { opacity: 1, transform: "scale(1)" }], 650);
    if (disposed) return;
    window.scrollTo({ top: index * step(), behavior: "instant" });
    progress = index;
    updateCopy(index);
    renderPlanets();
    scene.style.opacity = "1";
    scene.style.transform = "none";
    cancelAnimations(scene);
    scene.inert = false;
    busy = false;
  }

  function goTo(index: number) {
    if (busy || !category) return;
    window.scrollTo({ top: clamp(index, 0, category.events.length - 1) * step(), behavior: reduce.matches ? "instant" : "smooth" });
  }

  on($("back"), "click", leaveCategory);
  on($("previous"), "click", () => goTo(active - 1));
  on($("next"), "click", () => goTo(active + 1));

  function openDetail() {
    if (!category) return;
    const e = category.events[active];
    const art = $<HTMLImageElement>("detail-art");
    art.src = atlasArt.event(category.id, e.id);
    art.alt = `${e.name} illustration`;
    $("detail-category").textContent = `${category.name} / ${e.kind}`;
    $("detail-title").textContent = e.name;
    $("detail-description").textContent = e.description;
    openModal(detail);
  }
  on($("discover"), "click", openDetail);

  function renderDirectory() {
    const query = $<HTMLInputElement>("event-search").value.toLowerCase().trim();
    const container = $("directory-results");
    container.replaceChildren();
    let count = 0;
    data.forEach((c) =>
      c.events.forEach((e, i) => {
        if (directoryFilter !== "all" && directoryFilter !== c.id) return;
        if (query && !`${c.name} ${c.kind} ${e.id} ${e.name} ${e.description} ${e.kind}`.toLowerCase().includes(query)) return;
        count++;
        const b = document.createElement("button");
        b.className = "directory-entry";
        const thumbnail = image(atlasArt.event(c.id, e.id), "");
        thumbnail.loading = "lazy";
        const text = document.createElement("span");
        const name = document.createElement("strong");
        const kind = document.createElement("small");
        name.textContent = e.name;
        kind.textContent = `${c.name} / ${e.kind}`;
        text.append(name, kind);
        const arrow = document.createElement("span");
        arrow.textContent = "↗";
        arrow.setAttribute("aria-hidden", "true");
        b.append(thumbnail, text, arrow);
        on(b, "click", () => {
          directory.close();
          if (mode === "atlas") enterCategory(c, i);
          else switchCategory(c, i);
        });
        container.append(b);
      }),
    );
    $("no-results").hidden = count > 0;
  }

  [["all", "All worlds"], ...data.map((c) => [c.id, c.name])].forEach(([id, name]) => {
    const b = document.createElement("button");
    b.textContent = name;
    b.setAttribute("aria-pressed", String(id === "all"));
    on(b, "click", () => {
      directoryFilter = id;
      [...$("directory-filters").children].forEach((el) => el.setAttribute("aria-pressed", String(el === b)));
      renderDirectory();
    });
    $("directory-filters").append(b);
  });

  function openModal(dialog: HTMLDialogElement) {
    modalScroll = document.scrollingElement!.scrollTop;
    dialog.showModal();
    window.scrollTo({ top: modalScroll, behavior: "instant" });
  }
  function openDirectory() {
    if (busy) return;
    renderDirectory();
    openModal(directory);
  }
  on($("browse-bottom"), "click", openDirectory);
  on($("event-search"), "input", renderDirectory);
  root.querySelectorAll<HTMLElement>("[data-close]").forEach((b) =>
    on(b, "click", () => $<HTMLDialogElement>(b.dataset.close!).close()),
  );
  [directory, detail].forEach((d) => {
    on(d, "close", () => {
      if (!busy) window.scrollTo({ top: modalScroll, behavior: "instant" });
    });
    on<MouseEvent>(d, "click", (e) => {
      if (e.target !== d) return;
      const r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
    });
  });

  on<KeyboardEvent>(window, "keydown", (e) => {
    if (!directory.open && !detail.open && !busy && mode === "atlas" && ["ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      turnOrbit(e.key === "ArrowLeft" ? -1 : 1);
      return;
    }
    if (directory.open || detail.open || busy || mode !== "events" || (e.target as Element).matches?.("input,textarea")) return;
    if (e.key === "Escape") {
      leaveCategory();
      return;
    }
    if (["ArrowRight", "ArrowDown", "PageDown"].includes(e.key)) {
      e.preventDefault();
      goTo(active + 1);
    }
    if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) {
      e.preventDefault();
      goTo(active - 1);
    }
    if (e.key === "Home") {
      e.preventDefault();
      goTo(0);
    }
    if (e.key === "End" && category) {
      e.preventDefault();
      goTo(category.events.length - 1);
    }
  });
  on<PointerEvent>(
    window,
    "pointermove",
    (e) => {
      pointerX = e.clientX / innerWidth - 0.5;
      pointerY = e.clientY / innerHeight - 0.5;
    },
    { passive: true },
  );
  on(window, "resize", layout, { passive: true });

  function frame(time: number) {
    const dt = Math.min(3, (time - previousTime) / 16.667 || 1);
    previousTime = time;
    // Opening spin: the system winds down from over a full turn and seats the
    // front world, decelerating like a released orrery.
    if (introSpin) {
      const t = clamp((performance.now() - introSpin.start) / introSpin.duration, 0, 1);
      orbitRotation = introSpin.from * Math.pow(1 - t, 4);
      if (t >= 1) {
        introSpin = null;
        orbitRotation = orbitTarget = 0;
      }
      renderOrbit();
    }
    if (mode === "atlas" && !busy && !introSpin && Math.abs(orbitTarget - orbitRotation) > 0.0001) {
      orbitRotation = reduce.matches
        ? orbitTarget
        : orbitRotation + (orbitTarget - orbitRotation) * (1 - Math.pow(orbitGesture?.moved ? 0.66 : 0.88, dt));
      if (Math.abs(orbitTarget - orbitRotation) < 0.0001) orbitRotation = orbitTarget;
      renderOrbit();
    }
    // The blurred rail glow is the costliest layer to rescale; drop it while
    // travelling and let it fade back once the camera has settled.
    if (traveling !== busy) {
      traveling = busy;
      root.classList.toggle("atlas-travel", busy);
    }
    // Idle life: worlds float gently on their rail; the orbit itself holds
    // still so the front slot stays put. Paused while the camera zooms, since
    // any style write inside it forces the scaled layer to repaint each frame.
    if (mode === "atlas" && !busy && !reduce.matches) {
      floatClock += dt * 16.667;
      const s = floatClock / 1000;
      categoryButtons.forEach((b, i) => {
        b.style.setProperty("--bob", `${(Math.sin(s * 0.9 + i * 1.7) * 2.6).toFixed(2)}px`);
        b.style.setProperty("--sway", `${(Math.sin(s * 0.55 + i * 2.3) * 1.1).toFixed(3)}deg`);
      });
    }
    if (!reduce.matches && (Math.abs(pointerX * 12 - skyX) > 0.003 || Math.abs(pointerY * 8 - skyY) > 0.003)) {
      skyX += (pointerX * 12 - skyX) * 0.045 * dt;
      skyY += (pointerY * 8 - skyY) * 0.045 * dt;
      skyTexture.style.transform = `translate3d(${skyX}px,${skyY}px,0) scale(1.04)`;
      dust.style.transform = `translate3d(${-skyX * 1.7}px,${-skyY * 1.7}px,0)`;
      camera.style.setProperty("--depth-x", `${-skyX * 1.8}px`);
      camera.style.setProperty("--depth-y", `${-skyY * 1.8}px`);
    }
    if (mode === "events" && !busy && !directory.open && !detail.open && category) {
      const target = clamp(document.scrollingElement!.scrollTop / step(), 0, category.events.length - 1);
      if (target !== progress) {
        progress = reduce.matches ? target : progress + (target - progress) * (1 - Math.pow(0.86, dt));
        if (Math.abs(target - progress) < 0.0005) progress = target;
        renderPlanets();
        updateCopy(clamp(Math.round(progress), 0, category.events.length - 1));
      }
    }
    rafId = requestAnimationFrame(frame);
  }

  layout();
  rafId = requestAnimationFrame(frame);
  const initialImages = [...root.querySelectorAll<HTMLImageElement>("#category-worlds img,.asset-eclipse img,.asset-orbits")];
  const imagesReady = decoded(initialImages, 2500).then(() => {
    if (!disposed) loadStatus.hidden = true;
  });
  loadTimeout = window.setTimeout(() => (loadStatus.hidden = true), 8000);

  // The site's opening loader may still be covering the page on a first
  // visit; start the entrance as its iris opens so the eclipses hand over.
  const loaderDone = () =>
    new Promise<void>((resolve) => {
      const settled = () => {
        const loader = document.querySelector(".site-loader");
        return !loader || loader.classList.contains("is-exit");
      };
      if (settled()) return resolve();
      const observer = new MutationObserver(() => {
        if (!settled()) return;
        observer.disconnect();
        resolve();
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
      signal.addEventListener("abort", () => observer.disconnect());
      window.setTimeout(() => {
        observer.disconnect();
        resolve();
      }, 7500);
    });

  /**
   * Entrance, ~3.2 s: the eclipse ignites, the orbit rises, light runs once
   * round the outer rail, the worlds fade in while the system spins down and
   * seats Tandav in front, then the title, caption, silk and footer arrive.
   * Any press or key skips straight to the end.
   */
  function playIntro() {
    root.removeAttribute("data-intro");
    if (reduce.matches) return;
    introPlaying = true;
    root.classList.add("atlas-intro");
    const out = "cubic-bezier(.16,1,.3,1)";
    const play = (el: Element | null, frames: Keyframe[], delay: number, duration: number, easing = out) => {
      if (!el) return;
      introAnimations.push(el.animate(frames, { delay, duration, easing, fill: "backwards" }));
    };
    const q = (selector: string) => root.querySelector(selector);
    const all = (selector: string) => [...root.querySelectorAll(selector)];

    play(q(".sky"), [{ opacity: 0 }, { opacity: 1 }], 0, 1100, "ease-out");
    play(q(".asset-eclipse"), [{ opacity: 0, scale: ".5" }, { opacity: 1, scale: "1" }], 150, 1400);
    play(q(".asset-corona"), [{ filter: "brightness(2.6)" }, { filter: "brightness(1)" }], 350, 2000);
    all(".asset-orbits").forEach((el) => play(el, [{ opacity: 0, translate: "0 34px", scale: ".94" }, {}], 450, 1500));
    all(".asset-trail").forEach((el) => play(el, [{ opacity: 0 }, {}], 900, 500, "ease-out"));
    // Light runs once round the outer rail, leaving the glow behind it.
    all(".trail-loop").forEach((path) => {
      path.setAttribute("pathLength", "1");
      play(path, [{ strokeDasharray: "1 1", strokeDashoffset: "1" }, { strokeDasharray: "1 1", strokeDashoffset: "0" }], 900, 1900, "cubic-bezier(.45,0,.2,1)");
    });
    introSpin = { start: performance.now() + 650, duration: 2400, from: -Math.PI * 2.5 };
    orbitRotation = orbitTarget = introSpin.from;
    renderOrbit();
    categoryButtons.forEach((b, i) => play(b, [{ opacity: 0, scale: ".55" }, {}], 650 + i * 95, 1000));
    play(q(".intro .eyebrow"), [{ opacity: 0, translate: "0 14px" }, {}], 1500, 900);
    play(q(".intro h1"), [{ opacity: 0, translate: "0 26px", clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0 0)" }], 1650, 1100);
    play(q(".intro-note"), [{ opacity: 0, translate: "0 12px" }, {}], 2000, 800);
    play(frontCaption, [{ opacity: 0, translate: "0 14px" }, { opacity: 1 }], 2800, 800);
    play(q(".foreground"), [{ opacity: 0, translate: "0 70px" }, {}], 1900, 1300);
    play(q(".atlas-footer"), [{ opacity: 0 }, {}], 2500, 900, "ease-out");
    Promise.all(introAnimations.map((a) => a.finished.catch(() => {}))).then(endIntro);
  }

  function endIntro() {
    if (!introPlaying || disposed) return;
    introPlaying = false;
    root.classList.remove("atlas-intro");
    introAnimations.forEach((a) => a.cancel());
    introAnimations = [];
    root.querySelectorAll(".trail-loop").forEach((path) => path.removeAttribute("pathLength"));
    if (introSpin) {
      introSpin = null;
      orbitRotation = orbitTarget = 0;
      renderOrbit();
    }
  }

  const skipIntro = () => {
    if (introPlaying) endIntro();
  };
  on(root, "pointerdown", skipIntro, { capture: true });
  on(window, "keydown", skipIntro, { capture: true });

  // Deep link: #category/event opens straight into that world.
  const [route, eventId] = location.hash.slice(1).split("/");
  const initial = data.find((c) => c.id === route);
  if (initial) {
    root.removeAttribute("data-intro");
    enterCategory(initial, Math.max(0, initial.events.findIndex((e) => e.id === eventId)), true);
  } else {
    Promise.all([imagesReady, loaderDone()]).then(() => {
      if (!disposed) playIntro();
    });
  }

  return () => {
    disposed = true;
    controller.abort();
    cancelAnimationFrame(rafId);
    clearTimeout(wheelSnap);
    clearTimeout(loadTimeout);
    root.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    solar?.destroy();
    for (const id of ["category-worlds", "category-dock", "planet-system", "event-progress", "directory-filters", "directory-results"]) {
      $(id).replaceChildren();
    }
    if (directory.open) directory.close();
    if (detail.open) detail.close();
    $("scroll-track").style.height = "0px";
  };
}
