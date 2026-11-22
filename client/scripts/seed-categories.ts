/**
 * Seeds the atlascategories collection from the atlas line-up in constants/events.ts
 * and Cloudinary links in constants/assets.ts.
 *
 *   bun scripts/seed-categories.ts
 *   or: npx tsx --env-file=.env.local scripts/seed-categories.ts
 */
import mongoose from "mongoose";
import { ATLAS_CATEGORIES } from "../constants/events";
import { ASSETS } from "../constants/assets";
import AtlasCategory from "../lib/models/AtlasCategory";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI (put it in client/.env.local)");
    process.exit(1);
  }

  await mongoose.connect(uri);

  // Upsert by id: safe to re-run, nothing references categories by _id.
  const ops = ATLAS_CATEGORIES.map((category) => {
    const cloudImage = ASSETS.cloudinary.categories[category.id] || "";

    const updateDoc = {
      $set: {
        name: category.name,
        kind: category.kind,
        line: category.line,
        ...(cloudImage ? { image: cloudImage } : {}),
      },
      $setOnInsert: {
        id: category.id,
        ...(!cloudImage ? { image: "" } : {}),
      },
    };

    return {
      updateOne: {
        filter: { id: category.id },
        update: updateDoc,
        upsert: true,
      },
    };
  });

  const result = await AtlasCategory.bulkWrite(ops);
  console.log(
    `categories: ${ops.length} in line-up, ${result.upsertedCount} inserted, ${result.modifiedCount} updated`,
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Failed to seed categories:", err);
  process.exit(1);
});
