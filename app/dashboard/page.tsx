import { requireAuth } from "@/lib/auth";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const metadata = { title: "داشبورد" };

export default async function DashboardPage() {
  const user = await requireAuth();
  return <DashboardClient user={{ id: user.id, name: user.name, role: user.role }} />;
}