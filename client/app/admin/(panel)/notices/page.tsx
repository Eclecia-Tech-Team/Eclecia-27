import { one, requireArea } from "@/lib/admin/page-guard";
import { can } from "@/lib/admin/access";
import { eventOptions, listNotices } from "@/lib/admin/queries";
import { PageHeader } from "@/components/admin/ui";
import { NoticesManager } from "@/components/admin/NoticesManager";

export const dynamic = "force-dynamic";

export default async function AdminNoticesPage({ searchParams }: { searchParams: Promise<{ event?: string | string[] }> }) {
  const admin = await requireArea("notices");
  const { event } = await searchParams;
  const [notices, events] = await Promise.all([listNotices(one(event)), eventOptions()]);
  return (
    <>
      <PageHeader title="Notices" sub="Shown on event pages: timing changes, venue moves, reminders. Fest-wide notices appear on every event." />
      <NoticesManager notices={notices} events={events} writable={can(admin, "notices", true)} />
    </>
  );
}
