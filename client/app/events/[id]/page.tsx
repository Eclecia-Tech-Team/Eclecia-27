import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { EventDetail } from "@/components/events/detail/EventDetail";
import { ComingSoon } from "@/components/common/ComingSoon";
import { getEventPage, getEventRecord } from "@/lib/event-page";

type EventPageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { id } = await params;
  const event = await getEventRecord(id);
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

  // When NEXT_PUBLIC_ENABLE_EVENTS_DETAILS is not "true" (default: false), show Coming Soon
  if (process.env.NEXT_PUBLIC_ENABLE_EVENTS_DETAILS !== "true") {
    return (
      <ComingSoon
        eyebrow="Celestial Stage"
        note="Event details and registration for this world will be unveiled shortly."
        backHref="/events"
        backLabel="Back to Events Atlas"
      />
    );
  }

  const session = await auth();
  const data = await getEventPage(id, session?.user?.id);
  if (!data) notFound();

  return <EventDetail data={data} />;
}
