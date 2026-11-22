export interface AvatarItem {
  id: number;
  name: string;
  slug: string;
  src: string;
}

export const AVATARS: AvatarItem[] = [
  {
    id: 1,
    name: "Aetheria",
    slug: "aetheria",
    src: "/assets/opt/events/mobile/thumbnails/categories/aetheria/artwork.webp",
  },
  {
    id: 2,
    name: "Anubhuti",
    slug: "anubhuti",
    src: "/assets/opt/events/mobile/thumbnails/categories/anubhuti/artwork.webp",
  },
  {
    id: 3,
    name: "BakyaRongo",
    slug: "bakya-rongo",
    src: "/assets/opt/events/mobile/thumbnails/categories/bakya-rongo/artwork.webp",
  },
  {
    id: 4,
    name: "Brahmand",
    slug: "brahmand",
    src: "/assets/opt/events/mobile/thumbnails/categories/brahmand/artwork.webp",
  },
  {
    id: 5,
    name: "Cadence",
    slug: "cadence",
    src: "/assets/opt/events/mobile/thumbnails/categories/cadence/artwork.webp",
  },
  {
    id: 6,
    name: "Celeste",
    slug: "celeste",
    src: "/assets/opt/events/mobile/thumbnails/categories/celeste/artwork.webp",
  },
  {
    id: 7,
    name: "Taal Tarang",
    slug: "taal-tarang",
    src: "/assets/opt/events/mobile/thumbnails/categories/taal-tarang/artwork.webp",
  },
];

export const getAvatarSrc = (avatarId?: number | null): string => {
  if (!avatarId || avatarId < 1 || avatarId > AVATARS.length) {
    return AVATARS[0].src;
  }
  return AVATARS[avatarId - 1].src;
};
