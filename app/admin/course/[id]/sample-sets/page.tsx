import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { SampleSetsAdmin } from "@/components/admin/sample-set-admin";

export const metadata = { title: "مجموعه‌های نمونه سوالات" };

export default async function AdminSampleSetsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAdmin();
  const { id } = await params;

  const course = await db.course.findUnique({
    where: { id },
    select: { id: true, title: true, createdById: true },
  });
  if (!course || course.createdById !== user.id) return notFound();

  const sets = await db.sampleSet.findMany({
    where: { courseId: id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true, attempts: true } } },
  });

  const serialized = {
    id: course.id,
    title: course.title,
    sets: sets.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      timeLimitMinutes: s.timeLimitMinutes,
      questionCount: s._count.questions,
      attemptCount: s._count.attempts,
    })),
  };

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <SampleSetsAdmin course={serialized} />
      </main>
    </AppShell>
  );
}
