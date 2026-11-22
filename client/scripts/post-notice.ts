/**
 * Posts a notice to an event page (or every event page).
 *
 *   bun --env-file=.env.local scripts/post-notice.ts <event-slug|all> "<title>" "<body>" [info|update|important] [--pin] [--expires=2027-01-18]
 *
 * e.g. bun --env-file=.env.local scripts/post-notice.ts stage-play "Venue moved" "Now in the main auditorium." update --pin
 * List: scripts/post-notice.ts --list <event-slug|all>   Remove: scripts/post-notice.ts --remove <notice-id>
 */
import mongoose from "mongoose";
import Event from "../lib/models/Events";
import EventNotice, { NOTICE_TONES } from "../lib/models/EventNotice";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")).map((a) => a.split("=")[0]));
const flag = (name: string) => args.find((a) => a.startsWith(`${name}=`))?.split("=")[1];
const [target, title, body, tone = "info"] = args.filter((a) => !a.startsWith("--"));

async function eventIdFor(slug: string) {
  if (slug === "all") return null;
  const event = await Event.findOne({ slug: slug.toLowerCase() }).select("_id");
  if (!event) throw new Error(`No event with slug "${slug}"`);
  return event._id;
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("Missing MONGODB_URI (put it in client/.env.local)");
  await mongoose.connect(process.env.MONGODB_URI);

  if (flags.has("--remove")) {
    const id = args[args.indexOf("--remove") + 1];
    const { deletedCount } = await EventNotice.deleteOne({ _id: id });
    console.log(deletedCount ? "Removed." : "No notice with that id.");
  } else if (flags.has("--list")) {
    const slug = args[args.indexOf("--list") + 1] ?? "all";
    const eventId = await eventIdFor(slug);
    const notices = await EventNotice.find({ eventId }).sort({ pinned: -1, createdAt: -1 }).lean();
    for (const n of notices) console.log(`${n._id}  [${n.tone}${n.pinned ? ", pinned" : ""}]  ${n.title}`);
    if (!notices.length) console.log("No notices.");
  } else {
    if (!target || !title || !body) throw new Error("Usage: post-notice.ts <event-slug|all> \"<title>\" \"<body>\" [tone] [--pin] [--expires=YYYY-MM-DD]");
    if (!NOTICE_TONES.includes(tone as (typeof NOTICE_TONES)[number])) throw new Error(`tone must be one of ${NOTICE_TONES.join(", ")}`);
    const expires = flag("--expires");
    const notice = await EventNotice.create({
      eventId: await eventIdFor(target),
      title,
      body,
      tone,
      pinned: flags.has("--pin"),
      ...(expires ? { expiresAt: new Date(expires) } : {}),
    });
    console.log(`Posted ${notice._id} to ${target === "all" ? "every event" : target}.`);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
