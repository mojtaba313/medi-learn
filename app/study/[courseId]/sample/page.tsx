import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { SampleSetList } from "@/components/study/sample-set-list";

export const metadata = { title: "نمونه سوالات" };

export default async function SampleSetsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { courseId } = await params;

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, status: true },
  });
  if (!course || course.status !== "READY") return notFound();

  const sets = await db.sampleSet.findMany({
    where: { courseId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });

  const serialized = {
    courseId: course.id,
    courseTitle: course.title,
    sets: sets.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      timeLimitMinutes: s.timeLimitMinutes,
      questionCount: s._count.questions,
    })),
  };

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <SampleSetList {...serialized} />
      </main>
    </AppShell>
  );
}
