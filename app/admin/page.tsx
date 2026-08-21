import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata = { title: "پنل مدیریت" };

export default async function AdminPage() {
  const user = await requireAdmin();

  const courses = await db.course.findMany({
    where: { createdById: user.id },
    include: { _count: { select: { pages: true, questions: true } } },
    orderBy: { createdAt: "desc" },
  });

  const pageCounts = await db.page.groupBy({
    by: ["courseId"],
    _count: { _all: true },
  });
  const counts = new Map(pageCounts.map((p) => [p.courseId, p._count._all]));

  const serialized = courses.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    totalPages: counts.get(c.id) ?? 0,
  }));

  return <AdminDashboard initialCourses={serialized} />;
}