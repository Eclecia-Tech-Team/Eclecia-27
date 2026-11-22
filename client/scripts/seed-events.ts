/**
 * Seeds the events collection from the atlas line-up in constants/events.ts
 * and Cloudinary links in constants/assets.ts.
 *
 *   bun run seed:events             # add missing events only; never touches existing ones
 *   bun run seed:events --sync-copy # also overwrite name/kind/description/clubs/artwork from constants
 *   bun run seed:events --reset     # drop and re-create (refused once anyone has registered)
 *
 * Events are managed in the admin panel (/admin/events) once seeded, so the
 * default run is insert-only: re-running it can't undo admin edits, and event
 * ids (which registrations point at) never change.
 */
import mongoose from "mongoose";
import { ATLAS_CATEGORIES } from "../constants/events";
import { ASSETS } from "../constants/assets";
import Event from "../lib/models/Events";
import Registration from "../lib/models/Registrations";

const args = new Set(process.argv.slice(2));
const reset = args.has("--reset");
const syncCopy = args.has("--sync-copy");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI (put it in client/.env.local)");
    process.exit(1);
  }

  await mongoose.connect(uri);

  if (reset) {
    const regs = await Registration.estimatedDocumentCount();
    if (regs > 0) {
      console.error(`Refusing --reset: ${regs} registrations point at the current events. Edit events in /admin instead.`);
      process.exit(1);
    }
    await Event.deleteMany({});
    console.log("Removed all events (--reset).");
  }

  const ops = ATLAS_CATEGORIES.flatMap((category) =>
    category.events.map((event) => {
      const catEvents = ASSETS.cloudinary.events[category.id];
      const banner = (catEvents ? catEvents[event.id] : "") || "";
      const copy = {
        eventName: event.name,
        category: category.name,
        kind: event.kind,
        description: event.description,
        clubs: event.club ? [event.club] : [],
        banner,
      };
      const defaults = {
        slug: event.id,
        date: "TBA",
        time: "TBA",
        duration: "TBA",
        venue: "TBA",
        isTeamEvent: false,
        minMembersPerTeam: 1,
        maxMembersPerTeam: 1,
        isPaidEvent: false,
        isActive: false,
      };
      return {
        updateOne: {
          filter: { slug: event.id },
          update: syncCopy ? { $set: copy, $setOnInsert: defaults } : { $setOnInsert: { ...copy, ...defaults } },
          upsert: true,
          // Insert-only runs must not even bump updatedAt on existing events.
          timestamps: syncCopy,
        },
      };
    }),
  );

  const result = await Event.bulkWrite(ops);
  console.log(`events: ${ops.length} in line-up, ${result.upsertedCount} inserted, ${result.modifiedCount} updated`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Failed to seed events:", err);
  process.exit(1);
});
