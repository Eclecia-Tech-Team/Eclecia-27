export interface AvatarItem {
  id: number;
  name: string;
  slug: string;
  src: string;
}

export const AVATARS: AvatarItem[] = [
  { id: 1, name: "Artsy", slug: "avatar-01", src: "/assets/opt/avatars/avatar-01.webp" },
  { id: 2, name: "Groovy", slug: "avatar-02", src: "/assets/opt/avatars/avatar-02.webp" },
  { id: 3, name: "Dreamy", slug: "avatar-03", src: "/assets/opt/avatars/avatar-03.webp" },
  { id: 4, name: "Dapper", slug: "avatar-04", src: "/assets/opt/avatars/avatar-04.webp" },
  { id: 5, name: "Spirited", slug: "avatar-05", src: "/assets/opt/avatars/avatar-05.webp" },
  { id: 6, name: "Nerdy", slug: "avatar-06", src: "/assets/opt/avatars/avatar-06.webp" },
  { id: 7, name: "Edgy", slug: "avatar-07", src: "/assets/opt/avatars/avatar-07.webp" },
  { id: 8, name: "Classic", slug: "avatar-08", src: "/assets/opt/avatars/avatar-08.webp" },
  { id: 9, name: "Bookish", slug: "avatar-09", src: "/assets/opt/avatars/avatar-09.webp" },
  { id: 10, name: "Offbeat", slug: "avatar-10", src: "/assets/opt/avatars/avatar-10.webp" },
  { id: 11, name: "Creative", slug: "avatar-11", src: "/assets/opt/avatars/avatar-11.webp" },
  { id: 12, name: "Indie", slug: "avatar-12", src: "/assets/opt/avatars/avatar-12.webp" },
  { id: 13, name: "Curious", slug: "avatar-13", src: "/assets/opt/avatars/avatar-13.webp" },
  { id: 14, name: "Chill", slug: "avatar-14", src: "/assets/opt/avatars/avatar-14.webp" },
  { id: 15, name: "Radiant", slug: "avatar-15", src: "/assets/opt/avatars/avatar-15.webp" },
  { id: 16, name: "Quirky", slug: "avatar-16", src: "/assets/opt/avatars/avatar-16.webp" },
];

export const getAvatarSrc = (avatarId?: number | null): string => {
  if (!avatarId || avatarId < 1 || avatarId > AVATARS.length) {
    return AVATARS[0].src;
  }
  return AVATARS[avatarId - 1].src;
};
