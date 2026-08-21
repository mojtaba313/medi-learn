import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { QuestionBuilder } from "@/components/admin/question-builder";

export const metadata = { title: "مدیریت سوالات" };

export default async function AdminQuestionsPage({
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
      questions: {
        include: {
          responses: {
            where: { userId: user.id },
            select: { selectedOption: true, isCorrect: true, timeSpentMs: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!course || course.createdById !== user.id) return notFound();

  const serialized = {
    id: course.id,
    title: course.title,
    pages: course.pages.map((p) => p.pageNumber),
    questions: course.questions.map((q) => ({
      id: q.id,
      pageNumber: q.pageNumber,
      text: q.text,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctOption: q.correctOption,
      explanation: q.explanation,
      tags: q.tags,
      createdAt: q.createdAt.toISOString(),
      response: q.responses[0] ?? null,
    })),
  };

  return <QuestionBuilder course={serialized} />;
}