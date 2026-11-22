import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin/session";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return <AdminShell admin={admin}>{children}</AdminShell>;
}
