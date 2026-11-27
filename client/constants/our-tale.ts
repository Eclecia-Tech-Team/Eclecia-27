/**
 * Content for /our-tale — the story of Eclecia, told mostly in pictures.
 *
 * Everything the page says lives here so the PR/content team can swap in
 * final copy and photos without touching layout code. Anything marked
 * TODO(content) is a placeholder waiting on real content or a fact only
 * the team knows (years, names, numbers).
 *
 * Copy rules (DESIGN.md §7, CONTRIBUTING.md):
 * - "The eclipse", never "the moon". No space talk — it's performance & culture.
 * - Don't repeat stats already shown on the landing page (Days / Events /
 *   Colleges / Footfall) or /sponsors (social reach, students involved,
 *   cities, previous attendance).
 */

export interface OurTaleChapter {
  /** Small uppercase mono label above the title. */
  eyebrow: string;
  title: string;
  /** Gold italic accent rendered after `title`. */
  titleAccent?: string;
  /** One short line under the title — headers carry the story now. */
  line: string;
  /** Image beside the chapter — WebP URL (Cloudinary or /assets/opt). */
  image?: { src: string; alt: string; caption?: string };
}

export interface OurTaleEdition {
  year: string;
  theme: string;
  /** One or two lines on what that edition is remembered for. */
  highlight: string;
}

export type GallerySpan = "default" | "wide" | "tall" | "large";

export interface OurTaleGalleryItem {
  src: string;
  alt: string;
  /** Small caption overlaid on the tile — club name, edition, moment. */
  label?: string;
  /** Second, dimmer line under the label. */
  sublabel?: string;
  /** Bento cell size. */
  span?: GallerySpan;
}

export interface OurTaleStat {
  value: string;
  label: string;
}

export const OUR_TALE = {
  hero: {
    eyebrow: "Our Tale",
    title: "The story of",
    titleAccent: "Eclecia",
    intro:
      "Before it was a name on a poster, Eclecia was a stage somebody believed in. This is where it began, what it has become, and why thousands of people clear their January for it.",
  },

  chapters: [
    {
      eyebrow: "Chapter one",
      title: "It started small.",
      titleAccent: "On a college stage.",
      line: "TODO(content): one line on how Eclecia began.",
      image: {
        src: "/assets/opt/mainart-layer6.webp",
        alt: "TODO(content): photo from an early edition of Eclecia",
        caption: "TODO(content): caption for the photo",
      },
    },
    {
      eyebrow: "Chapter two",
      title: "It learned to",
      titleAccent: "grow loud.",
      line: "TODO(content): one line on how it grew.",
      image: {
        src: "/assets/opt/banner.webp",
        alt: "TODO(content): photo from a packed edition of Eclecia",
        caption: "TODO(content): caption for the photo",
      },
    },
    {
      eyebrow: "Chapter three",
      title: "It became",
      titleAccent: "a ritual.",
      line: "TODO(content): one line on why people keep coming back.",
      image: {
        src: "/assets/opt/hand.webp",
        alt: "TODO(content): art or photo representing the people of Eclecia",
        caption: "TODO(content): caption for the photo",
      },
    },
  ] as OurTaleChapter[],

  editions: {
    eyebrow: "The editions",
    title: "Every year leaves",
    titleAccent: "a mark.",
    intro:
      "Some editions are remembered for a headline act, some for a moment nobody planned. These are the ones people still talk about.",
    items: [
      {
        year: "TODO(content)",
        theme: "TODO(content): edition theme",
        highlight: "TODO(content): what that edition is remembered for.",
      },
      {
        year: "TODO(content)",
        theme: "TODO(content): edition theme",
        highlight: "TODO(content): what that edition is remembered for.",
      },
      {
        year: "TODO(content)",
        theme: "TODO(content): edition theme",
        highlight: "TODO(content): what that edition is remembered for.",
      },
      {
        year: "TODO(content)",
        theme: "TODO(content): edition theme",
        highlight: "TODO(content): what that edition is remembered for.",
      },
    ] as OurTaleEdition[],
  },

  gallery: {
    eyebrow: "The faces of it",
    title: "Clubs, crowds and",
    titleAccent: "the moments between.",
    intro:
      "TODO(content): one line about the gallery — the clubs, the editions, the people.",
    // Club artwork + edition highlights, laid out as a bento grid.
    // Swap these for real Cloudinary WebP photos when they arrive; keep
    // span assignments so the grid rhythm survives the swap.
    items: [
      // --- Cultural clubs (one tile per club, labelled) ---
      {
        src: "/assets/opt/events/categories/celeste.webp",
        alt: "TODO(content): Pravasana — art & photography club",
        label: "Pravasana",
        sublabel: "Art & Photography Club",
        span: "large",
      },
      {
        src: "/assets/opt/events/categories/anubhuti.webp",
        alt: "TODO(content): Ghungroo — dance club",
        label: "Ghungroo",
        sublabel: "Dance Club",
        span: "tall",
      },
      {
        src: "/assets/opt/events/categories/bakya-rongo.webp",
        alt: "TODO(content): Anahita — literary club",
        label: "Anahita",
        sublabel: "Literary Club",
      },
      {
        src: "/assets/opt/events/categories/aetheria.webp",
        alt: "TODO(content): Heritage Fashion Club",
        label: "Heritage Fashion Club",
        span: "wide",
      },
      {
        src: "/assets/opt/events/categories/cadence.webp",
        alt: "TODO(content): Resonance — music club",
        label: "Resonance",
        sublabel: "Music Club",
        span: "large",
      },
      {
        src: "/assets/opt/events/events/brahmand/pentathlon.webp",
        alt: "TODO(content): Atmadweep — quiz club",
        label: "Atmadweep",
        sublabel: "Quiz Club",
      },
      {
        src: "/assets/opt/events/categories/brahmand.webp",
        alt: "TODO(content): DEBSOC — debating society",
        label: "DEBSOC",
        sublabel: "Heritage Debating Society",
      },
      {
        src: "/assets/opt/events/events/brahmand/headline-hustle.webp",
        alt: "TODO(content): News Club of HITK",
        label: "News Club",
      },
      {
        src: "/assets/opt/events/events/bakya-rongo/echo-theatre.webp",
        alt: "TODO(content): Anubhav — drama club",
        label: "Anubhav",
        sublabel: "Drama Club",
        span: "wide",
      },
      {
        src: "/assets/opt/events/events/taal-tarang/manjari.webp",
        alt: "TODO(content): Zubaan — language club",
        label: "Zubaan",
        sublabel: "Language Club",
      },
      // --- Past editions & moments ---
      {
        src: "/assets/opt/events/events/anubhuti/rangamancha.webp",
        alt: "TODO(content): a moment from a past edition",
        label: "TODO(content): edition name",
        sublabel: "TODO(content): the moment people remember",
        span: "large",
      },
      {
        src: "/assets/opt/events/categories/taal-tarang.webp",
        alt: "TODO(content): another moment from a past edition",
        label: "TODO(content): edition name",
        sublabel: "TODO(content): the moment people remember",
      },
      {
        src: "/assets/opt/events/events/cadence/dhunkaar.webp",
        alt: "TODO(content): a moment from a past edition",
        label: "TODO(content): edition name",
        sublabel: "TODO(content): the moment people remember",
        span: "large",
      },
    ] as OurTaleGalleryItem[],
  },

  /** Auto-scrolling strip of floor pics — past editions, crowd shots, moments. */
  strip: {
    eyebrow: "From the floor",
    title: "The bits that",
    titleAccent: "don't fit in a frame.",
    intro:
      "TODO(content): one line about the strip — candid shots, crowd energy, behind-the-scenes.",
    images: [
      { src: "/assets/opt/events/events/celeste/patalila.webp", alt: "TODO(content): floor pic 1", label: "TODO(content)" },
      { src: "/assets/opt/events/events/anubhuti/hunkaar.webp", alt: "TODO(content): floor pic 2" },
      { src: "/assets/opt/events/events/taal-tarang/groovex.webp", alt: "TODO(content): floor pic 3", label: "TODO(content)" },
      { src: "/assets/opt/events/events/bakya-rongo/verbatim.webp", alt: "TODO(content): floor pic 4" },
      { src: "/assets/opt/events/events/cadence/unison.webp", alt: "TODO(content): floor pic 5" },
      { src: "/assets/opt/events/events/brahmand/rifaqat.webp", alt: "TODO(content): floor pic 6", label: "TODO(content)" },
      { src: "/assets/opt/events/events/aetheria/the-incarnates.webp", alt: "TODO(content): floor pic 7" },
      { src: "/assets/opt/events/events/celeste/drishya.webp", alt: "TODO(content): floor pic 8" },
    ] as { src: string; alt: string; label?: string }[],
  },

  stats: {
    eyebrow: "By the numbers",
    title: "The crowd keeps",
    titleAccent: "counting.",
    intro:
      "Numbers only tell part of it — these are the figures that don't already live on the landing page or the sponsors page.",
    items: [
      { value: "—", label: "TODO(content): e.g. editions completed" },
      { value: "—", label: "TODO(content): e.g. performances staged" },
      { value: "—", label: "TODO(content): e.g. volunteers over the years" },
      { value: "—", label: "TODO(content): e.g. cities the fest has travelled to" },
    ] as OurTaleStat[],
  },

  closing: {
    eyebrow: "Eclecia ’27",
    title: "The next chapter is",
    titleAccent: "already written.",
    paragraphs: [
      "Eclecia ’27 is TODO(content): what's new this year — the theme, the first names announced, the thing we are most excited about.",
      "Whatever the story becomes, it starts the same way it always has: with a stage, a crowd, and three days in January people clear their calendars for. TODO(content): the final invitation line.",
    ],
    cta: { label: "See what's on", href: "/events" },
  },
} as const;
