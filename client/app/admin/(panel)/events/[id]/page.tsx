import { notFound } from "next/navigation";
import { requireArea } from "@/lib/admin/page-guard";
import { can } from "@/lib/admin/access";
import { getEventForEdit, venueSuggestions } from "@/lib/admin/queries";
import { EventEditor } from "@/components/admin/EventEditor";

export const dynamic = "force-dynamic";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireArea("events");
  const { id } = await params;
  const [event, venues] = await Promise.all([getEventForEdit(id), venueSuggestions()]);
  if (!event) notFound();
  const { id: eventId, registrations, ...initial } = event;
  return <EventEditor id={eventId} initial={initial} registrations={registrations} writable={can(admin, "events", true)} venueSuggestions={venues} />;
}
