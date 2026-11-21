import { one, requireArea } from "@/lib/admin/page-guard";
import { eventOptions } from "@/lib/admin/queries";
import { PageHeader } from "@/components/admin/ui";
import { CheckInDesk } from "@/components/admin/CheckInDesk";

export const dynamic = "force-dynamic";

export default async function CheckInPage({ searchParams }: { searchParams: Promise<{ event?: string | string[] }> }) {
  await requireArea("checkin");
  const [events, { event }] = await Promise.all([eventOptions(), searchParams]);
  return (
    <>
      <PageHeader title="Check-in" sub="Scan the pass QR from the participant's profile." />
      <CheckInDesk events={events} initialEventId={events.some((e) => e.id === one(event)) ? one(event) : ""} />
    </>
  );
}
