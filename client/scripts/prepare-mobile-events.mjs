import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const client = fileURLToPath(new URL("../", import.meta.url));
const media = path.join(client, "public/assets/opt/events");
const mobile = path.join(media, "mobile");
await fs.mkdir(mobile, { recursive: true });
await sharp(path.resolve(client, "../design/mobile-events/chakra-frame-source.png"))
  .resize({ width: 1200, withoutEnlargement: true })
  .webp({ quality: 94, alphaQuality: 100, effort: 6 })
  .toFile(path.join(mobile, "chakra-frame-v1.webp"));

// Thumbnails are separate from full-size artwork to keep the seven-category
// rail and all-events directory cheap to decode on a phone.
for (const kind of ["categories", "events"]) {
  const entries = await fs.readdir(path.join(media, kind), { recursive: true });
  for (const file of entries.filter((entry) => entry.endsWith("artwork.webp"))) {
    const target = path.join(mobile, "thumbnails", kind, file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await sharp(path.join(media, kind, file)).resize({ width: 160, withoutEnlargement: true })
      .webp({ quality: 88, alphaQuality: 100, effort: 5 }).toFile(target);
  }
}
console.log("Prepared the chakra frame and 37 small category/event thumbnails.");
