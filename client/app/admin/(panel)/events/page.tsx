import Link from "next/link";
import { requireArea } from "@/lib/admin/page-guard";
import { can } from "@/lib/admin/access";
import { listEvents } from "@/lib/admin/queries";
import { PageHeader, Empty } from "@/components/admin/ui";
import { EventsTable } from "@/components/admin/EventsTable";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const admin = await requireArea("events");
  const events = await listEvents();
  const writable = can(admin, "events", true);
  return (
    <>
      <PageHeader
        title="Events"
        sub={`${events.length} events · ${events.filter((e) => e.isActive).length} open for registration`}
        actions={
          writable && (
            <Link href="/admin/events/new" className="adm-btn" data-variant="primary">
              + New event
            </Link>
          )
        }
      />
      {events.length ? <EventsTable events={events} writable={writable} /> : <Empty>No events yet. Create one, or run `bun run seed:events`.</Empty>}
    </>
  );
}
