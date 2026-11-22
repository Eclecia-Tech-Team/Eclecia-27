import { notFound } from "next/navigation";
import { requireArea } from "@/lib/admin/page-guard";
import { can } from "@/lib/admin/access";
import { getResultEditor } from "@/lib/admin/queries";
import { ResultEditor } from "@/components/admin/ResultEditor";

export const dynamic = "force-dynamic";

export default async function EditResultPage({ params }: { params: Promise<{ eventId: string }> }) {
  const admin = await requireArea("results");
  const data = await getResultEditor((await params).eventId);
  if (!data) notFound();
  return <ResultEditor data={data} writable={can(admin, "results", true)} />;
}
