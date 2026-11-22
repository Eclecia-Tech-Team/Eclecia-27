import { requireArea } from "@/lib/admin/page-guard";
import { EventEditor } from "@/components/admin/EventEditor";
import type { EventInput } from "@/lib/admin/event-input";

const BLANK: EventInput = {
  eventName: "",
  slug: "",
  category: "Celeste",
  kind: "",
  description: "",
  date: "",
  time: "",
  duration: "",
  venue: "",
  banner: "",
  doc: "",
  rules: [],
  clubs: [],
  pocs: [],
  isTeamEvent: false,
  minMembersPerTeam: 1,
  maxMembersPerTeam: 1,
  teamLimit: null,
  isPaidEvent: false,
  fees: 0,
  prizePool: "",
  isActive: false,
  isFoodProvided: false,
  maxFoodServingsPerParticipant: 1,
};

export default async function NewEventPage() {
  await requireArea("events", true);
  return <EventEditor id={null} initial={BLANK} registrations={0} writable />;
}
