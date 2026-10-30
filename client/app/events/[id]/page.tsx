import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComingSoon } from "@/components/common/ComingSoon";
import { getEventSummary } from "@/lib/events";

type EventPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { id } = await params;
  const event = await getEventSummary(id);
  if (!event) return {};

  const title = `${event.eventName}: Eclecia'27 | Heritage Institute of Technology, Kolkata`;
  const url = `/events/${event.slug}`;
  return {
    title,
    description: event.description,
    alternates: { canonical: url },
    openGraph: { title, description: event.description, url, type: "website" },
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;
  const event = await getEventSummary(id);
  if (!event) notFound();

  return (
    <ComingSoon
      eyebrow={event.eventName}
      note="Event details and registration are coming soon."
      backHref="/events"
      backLabel="Back to events"
    />
  );
}
