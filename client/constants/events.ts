/** Events atlas line-up: seven worlds, thirty events. Copy is short editorial
 *  framing only; dates, rules, fees and prizes are not invented here. The site
 *  reads each world's copy from here but its events from Mongo; these events
 *  only feed scripts/seed-events.ts. */

export interface AtlasEvent {
  id: string;
  name: string;
  description: string;
  kind: string;
}

export interface AtlasCategory {
  id: string;
  name: string;
  kind: string;
  line: string;
  events: AtlasEvent[];
}

export const ATLAS_CATEGORIES: AtlasCategory[] = [
  {
    id: "kalakriti",
    name: "Kalakriti",
    kind: "Art & Photography",
    line: "A different way of seeing.",
    events: [
      { id: "short-film", name: "Short Film", description: "A story told through your lens.", kind: "Filmmaking" },
      { id: "fabric-painting", name: "Fabric Painting", description: "Turn fabric into a canvas of your own.", kind: "Visual art" },
      { id: "cover-art-poster-making", name: "Cover Art / Poster Making", description: "Make an image that says it all.", kind: "Design" },
      { id: "face-painting", name: "Face Painting", description: "An expression beyond the canvas.", kind: "Visual art" },
      { id: "photography", name: "Photography", description: "Find the extraordinary in a single frame.", kind: "Photography" },
    ],
  },
  {
    id: "tandav",
    name: "Tandav",
    kind: "Dance",
    line: "Let movement do the talking.",
    events: [
      { id: "solo-eastern-dance", name: "Solo Eastern Dance", description: "One dancer. A story in every gesture.", kind: "Solo dance" },
      { id: "solo-western-dance", name: "Solo Western Dance", description: "Find your rhythm. Own the floor.", kind: "Solo dance" },
      { id: "group-eastern-dance", name: "Group Eastern Dance", description: "Many dancers, one expression.", kind: "Group dance" },
      { id: "group-western-dance", name: "Group Western Dance", description: "Move together. Make your mark.", kind: "Group dance" },
      { id: "street-battle", name: "Street Battle", description: "Your crew. Your moves. Your moment.", kind: "Dance battle" },
    ],
  },
  {
    id: "rangmanch",
    name: "Rangmanch",
    kind: "Drama",
    line: "The world becomes your stage.",
    events: [
      { id: "stage-play", name: "Stage Play", description: "Bring a world to life before the curtain falls.", kind: "Theatre" },
      { id: "street-play", name: "Street Play", description: "A voice that reaches beyond the stage.", kind: "Street theatre" },
      { id: "monoact", name: "Monoact", description: "One performer. A thousand possibilities.", kind: "Solo theatre" },
    ],
  },
  {
    id: "akshar",
    name: "Akshar",
    kind: "Literary",
    line: "A world written in your words.",
    events: [
      { id: "audio-drama", name: "Audio Drama", description: "Build an entire world through sound.", kind: "Audio performance" },
      { id: "storytelling", name: "Storytelling", description: "Make us see the story you tell.", kind: "Spoken word" },
      { id: "recitation", name: "Recitation", description: "Give every word a life of its own.", kind: "Poetry recital" },
    ],
  },
  {
    id: "roop-rang",
    name: "Roop Rang",
    kind: "Fashion",
    line: "An expression all your own.",
    events: [
      { id: "ramp-walk", name: "Ramp Walk", description: "Carry your story down the runway.", kind: "Fashion" },
      { id: "cosplay", name: "Cosplay", description: "Step into a character. Make it yours.", kind: "Costume performance" },
    ],
  },
  {
    id: "sargam",
    name: "Sargam",
    kind: "Music",
    line: "Where sound becomes a universe.",
    events: [
      { id: "solo-singing-eastern", name: "Solo Singing (Eastern)", description: "One voice. An entire universe listening.", kind: "Solo vocals" },
      { id: "solo-singing-western", name: "Solo Singing (Western)", description: "Your voice, in its own element.", kind: "Solo vocals" },
      { id: "solo-instrumental", name: "Solo Instrumental", description: "Let your instrument tell the story.", kind: "Instrumental" },
      { id: "battle-of-bands-eastern", name: "Battle of Bands (Eastern)", description: "Bring your sound. Make it resonate.", kind: "Live bands" },
      { id: "battle-of-bands-western", name: "Battle of Bands (Western)", description: "A stage built for your collective sound.", kind: "Live bands" },
    ],
  },
  {
    id: "brahmand",
    name: "Brahmand",
    kind: "Beyond the ordinary",
    line: "Curiosity has no boundaries.",
    events: [
      { id: "oxford-debate", name: "Oxford Debate", description: "Take a stand. Make your argument count.", kind: "Debate" },
      { id: "general-quiz", name: "General Quiz", description: "Follow your curiosity to the next answer.", kind: "Quiz" },
      { id: "india-crisis-conclave", name: "India Crisis Conclave", description: "Think deeply. Speak with conviction.", kind: "Conclave" },
      { id: "the-unfiltered-mic", name: "The Unfiltered Mic", description: "A microphone. Your unfiltered voice.", kind: "Open mic" },
      { id: "headline-hustle", name: "Headline Hustle", description: "Find the story. Make the headline.", kind: "Media challenge" },
      { id: "pentathlon", name: "Pentathlon", description: "Let every sher leave an impression.", kind: "Shayari competition" },
      { id: "kavi-sammelan", name: "Kavi Sammelan", description: "An assembly of voices, united by poetry.", kind: "Poetry" },
    ],
  },
];

/** Atlas art, served from public/assets/opt/events (immutable cache headers). */
const ATLAS_MEDIA = "/assets/opt/events";

export const atlasArt = {
  shared: (name: string) => `${ATLAS_MEDIA}/shared/${name}.webp`,
  category: (categoryId: string) => `${ATLAS_MEDIA}/categories/${categoryId}/artwork.webp`,
  event: (categoryId: string, eventId: string) => `${ATLAS_MEDIA}/events/${categoryId}/${eventId}/artwork.webp`,
} as const;
