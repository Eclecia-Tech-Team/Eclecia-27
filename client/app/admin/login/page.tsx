import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin/session";
import { AdminLogin } from "@/components/admin/AdminLogin";

export default async function AdminLoginPage() {
  if (await getAdmin()) redirect("/admin");
  return <AdminLogin masterKeyEnabled={Boolean(process.env.ADMIN_MASTER_KEY)} />;
}
