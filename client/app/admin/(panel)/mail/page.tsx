import { requireArea } from "@/lib/admin/page-guard";
import { can } from "@/lib/admin/access";
import { eventOptions } from "@/lib/admin/queries";
import { PageHeader } from "@/components/admin/ui";
import { MailComposer } from "@/components/admin/MailComposer";

export const dynamic = "force-dynamic";
/** Big sends run for a while (Resend batches of 100). */
export const maxDuration = 300;

export default async function AdminMailPage() {
  const admin = await requireArea("mail");
  return (
    <>
      <PageHeader title="Mail" sub="Send an announcement in the festival email style." />
      <MailComposer events={await eventOptions()} canSend={can(admin, "mail", true)} />
    </>
  );
}
