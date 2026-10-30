/**
 * Seeds the events collection from the atlas line-up in constants/events.ts.
 *
 *   bun scripts/seed-events.ts            (reads MONGODB_URI from .env.local)
 *
 * Idempotent: upserts by slug. Name, category, kind and description follow the
 * constants on every run; logistics (date, venue, rules, fees, POCs...) are
 * only written as "TBA" placeholders the first time, so edits made in the DB
 * are never overwritten.
 */
import mongoose from "mongoose";
import { ATLAS_CATEGORIES } from "../constants/events";
import Event from "../lib/models/Events";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('Missing MONGODB_URI (put it in client/.env.local)');
  process.exit(1);
}

await mongoose.connect(uri);

const ops = ATLAS_CATEGORIES.flatMap((category) =>
  category.events.map((event) => ({
    updateOne: {
      filter: { slug: event.id },
      update: {
        $set: {
          eventName: event.name,
          category: category.name,
          kind: event.kind,
          description: event.description,
        },
        $setOnInsert: {
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
        },
      },
      upsert: true,
    },
  })),
);

const result = await Event.bulkWrite(ops);
console.log(
  `events: ${ops.length} in line-up, ${result.upsertedCount} inserted, ${result.modifiedCount} updated`,
);

await mongoose.disconnect();
