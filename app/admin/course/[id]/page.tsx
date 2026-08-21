import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { CourseDetailClient } from "@/components/admin/course-detail-client";

export const metadata = { title: "جزئیات درس" };

export default async function AdminCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAdmin();
  const { id } = await params;

  const course = await db.course.findUnique({
    where: { id },
    include: {
      pages: { orderBy: { pageNumber: "asc" } },
      _count: { select: { questions: true } },
    },
  });

  if (!course || course.createdById !== user.id) return notFound();

  if (course.status === "PROCESSING") {
    redirect(`/admin?processing=${course.id}`);
  }

  const serialized = {
    id: course.id,
    title: course.title,
    description: course.description,
    category: course.category,
    coverUrl: course.coverUrl,
    status: course.status,
    totalPages: course.totalPages,
    pages: course.pages.map((p) => ({
      id: p.id,
      pageNumber: p.pageNumber,
      imageUrl: p.imageUrl,
      width: p.width,
      height: p.height,
    })),
    questionCount: course._count.questions,
  };

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <CourseDetailClient course={serialized} />
      </main>
    </AppShell>
  );
}