import { one, requireArea } from "@/lib/admin/page-guard";
import { can } from "@/lib/admin/access";
import { eventOptions, listRegistrations } from "@/lib/admin/queries";
import { PageHeader } from "@/components/admin/ui";
import { RegistrationsTable } from "@/components/admin/RegistrationsTable";

export const dynamic = "force-dynamic";

type SP = Record<"event" | "status" | "q" | "page", string | string[] | undefined>;

export default async function AdminRegistrationsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const admin = await requireArea("registrations");
  const raw = await searchParams;
  const sp = { event: one(raw.event), status: one(raw.status), q: one(raw.q), page: one(raw.page) };
  const filter = { eventId: sp.event, status: sp.status, q: sp.q, page: Number(sp.page) || 1 };
  const [data, events] = await Promise.all([listRegistrations(filter), eventOptions()]);
  const exportQs = new URLSearchParams(Object.entries({ event: sp.event, status: sp.status, q: sp.q }).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <>
      <PageHeader
        title="Registrations"
        sub="Verify payments, fix check-ins, export lists."
        actions={
          <a className="adm-btn" href={`/api/admin/registrations/export${exportQs ? `?${exportQs}` : ""}`}>
            Download CSV
          </a>
        }
      />
      <RegistrationsTable
        data={data}
        events={events}
        canVerify={can(admin, "registrations", true)}
        canCheckIn={can(admin, "checkin", true)}
      />
    </>
  );
}
