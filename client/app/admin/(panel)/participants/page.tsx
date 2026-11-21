import { one, requireArea } from "@/lib/admin/page-guard";
import { can } from "@/lib/admin/access";
import { listParticipants } from "@/lib/admin/queries";
import { PageHeader } from "@/components/admin/ui";
import { ParticipantsTable } from "@/components/admin/ParticipantsTable";

export const dynamic = "force-dynamic";

export default async function AdminParticipantsPage({ searchParams }: { searchParams: Promise<Record<"q" | "filter" | "page", string | string[] | undefined>> }) {
  const admin = await requireArea("participants");
  const sp = await searchParams;
  const data = await listParticipants({ q: one(sp.q), filter: one(sp.filter), page: Number(one(sp.page)) || 1 });
  return (
    <>
      <PageHeader title="Participants" sub="Everyone with a festival account." />
      <ParticipantsTable data={data} writable={can(admin, "participants", true)} />
    </>
  );
}
