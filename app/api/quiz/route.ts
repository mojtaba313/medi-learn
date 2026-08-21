import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, ok, dbUnavailable, isDbConnectionError } from "@/lib/api";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  if (!courseId) return err("شناسه درس لازم است", 422);

  try {
    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course) return err("درس پیدا نشد", 404);

    const [questions, pages, attempts] = await Promise.all([
      db.question.findMany({
        where: { courseId },
        include: {
          responses: {
            where: { userId: session.userId },
            select: { selectedOption: true, isCorrect: true, timeSpentMs: true, answeredAt: true },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      db.page.findMany({
        where: { courseId },
        select: { pageNumber: true },
        orderBy: { pageNumber: "asc" },
      }),
      db.quizAttempt.findMany({
        where: { userId: session.userId, courseId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);

  const mapped = questions.map((q) => ({
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
    response: q.responses[0] ?? null,
  }));

  const stats = {
    total: mapped.length,
    answered: mapped.filter((q) => q.response?.selectedOption).length,
    correct: mapped.filter((q) => q.response?.isCorrect).length,
    incorrect: mapped.filter((q) => q.response?.selectedOption && !q.response?.isCorrect).length,
    unanswered: mapped.filter((q) => !q.response?.selectedOption).length,
  };

  return ok({
    course: { id: course.id, title: course.title, totalPages: course.totalPages },
    questions: mapped,
    pageNumbers: pages.map((p) => p.pageNumber),
    stats,
    attempts,
  });
  } catch (e) {
    if (isDbConnectionError(e)) return dbUnavailable(e);
    throw e;
  }
}