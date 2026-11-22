import Link from "next/link";
import { requireArea } from "@/lib/admin/page-guard";
import { listResults } from "@/lib/admin/queries";
import { Badge, Empty, PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminResultsPage() {
  await requireArea("results");
  const events = await listResults();
  const published = events.filter((e) => e.state === "published").length;
  return (
    <>
      <PageHeader title="Results" sub={`${published} of ${events.length} published. Published results appear on the event's page.`} />
      {events.length ? (
        <div className="adm-panel overflow-x-auto">
          <table className="adm-table min-w-[560px]">
            <thead>
              <tr>
                <th>Event</th>
                <th>World</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link href={`/admin/results/${e.id}`} className="font-medium hover:text-gold">
                      {e.name}
                    </Link>
                  </td>
                  <td className="text-parchment/65">{e.category}</td>
                  <td>
                    {e.state === "published" ? (
                      <Badge tone="ok">published · {e.winners}</Badge>
                    ) : e.state === "draft" ? (
                      <Badge tone="warn">draft</Badge>
                    ) : (
                      <Badge>not started</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>No events yet.</Empty>
      )}
    </>
  );
}
