import { requireArea } from "@/lib/admin/page-guard";
import { listActivity, listAdmins } from "@/lib/admin/queries";
import { PageHeader } from "@/components/admin/ui";
import { AdminsManager } from "@/components/admin/AdminsManager";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const me = await requireArea("admins");
  return (
    <>
      <PageHeader title="Admins" sub="Who can open this panel, what each person can touch, and what they did." />
      <AdminsManager admins={await listAdmins()} meId={me.id} activity={await listActivity()} />
    </>
  );
}
