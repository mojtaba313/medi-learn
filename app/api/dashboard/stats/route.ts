import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, ok } from "@/lib/api";

export async function GET() {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const courses = await db.course.findMany({
    where: { status: "READY" },
    include: { _count: { select: { pages: true, questions: true } } },
    orderBy: { createdAt: "desc" },
  });

  const [annotations, responses, attempts, allQuestions] = await Promise.all([
    db.annotation.findMany({
      where: { userId: session.userId },
      select: { courseId: true, pageNumber: true, updatedAt: true },
    }),
    db.questionResponse.findMany({
      where: { userId: session.userId },
      select: { questionId: true, isCorrect: true, answeredAt: true },
      orderBy: { answeredAt: "desc" },
    }),
    db.quizAttempt.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.question.findMany({
      where: { courseId: { in: courses.map((c) => c.id) } },
      select: { id: true, courseId: true, pageNumber: true },
    }),
  ]);

  const responseCourseMap = new Map<string, { courseId: string; pageNumber: number | null }>();
  for (const q of allQuestions) {
    responseCourseMap.set(q.id, { courseId: q.courseId, pageNumber: q.pageNumber });
  }

  const annotationsByCourse = new Map<string, Set<number>>();
  for (const a of annotations) {
    if (!annotationsByCourse.has(a.courseId)) annotationsByCourse.set(a.courseId, new Set());
    annotationsByCourse.get(a.courseId)!.add(a.pageNumber);
  }

  const answeredByCourse = new Map<string, { answered: number; correct: number; incorrect: number }>();
  const weakByCourse = new Map<
    string,
    Map<number, { wrong: number; total: number }>
  >();
  const responseByQuestion = new Map<string, (typeof responses)[number]>();
  for (const r of responses) responseByQuestion.set(r.questionId, r);

  for (const q of allQuestions) {
    const res = responseByQuestion.get(q.id);
    if (!res || res.isCorrect === null) continue;

    if (!answeredByCourse.has(q.courseId)) {
      answeredByCourse.set(q.courseId, { answered: 0, correct: 0, incorrect: 0 });
    }
    const entry = answeredByCourse.get(q.courseId)!;
    entry.answered += 1;
    if (res.isCorrect === true) entry.correct += 1;
    else if (res.isCorrect === false) entry.incorrect += 1;

    if (q.pageNumber != null) {
      if (!weakByCourse.has(q.courseId)) weakByCourse.set(q.courseId, new Map());
      const pages = weakByCourse.get(q.courseId)!;
      if (!pages.has(q.pageNumber)) pages.set(q.pageNumber, { wrong: 0, total: 0 });
      const page = pages.get(q.pageNumber)!;
      page.total += 1;
      if (res.isCorrect === false) page.wrong += 1;
    }
  }

  const courseTitleById = new Map(courses.map((c) => [c.id, c.title]));

  const enrolled = courses.map((course) => {
    const annotatedPages = annotationsByCourse.get(course.id)?.size ?? 0;
    const pageProgress = course.totalPages > 0 ? Math.round((annotatedPages / course.totalPages) * 100) : 0;
    const q = answeredByCourse.get(course.id) ?? { answered: 0, correct: 0, incorrect: 0 };
    const accuracy = q.answered > 0 ? Math.round((q.correct / q.answered) * 100) : 0;

    const lastActivity: Date[] = [];
    for (const a of annotations) if (a.courseId === course.id) lastActivity.push(a.updatedAt);
    for (const r of responses) {
      if (responseCourseMap.get(r.questionId)?.courseId === course.id) lastActivity.push(r.answeredAt);
    }
    for (const a of attempts) if (a.courseId === course.id) lastActivity.push(a.createdAt);
    const lastStudy = lastActivity.length
      ? new Date(Math.max(...lastActivity.map((d) => d.getTime())))
      : null;

    const weakPages = weakByCourse.get(course.id) ?? new Map();
    const recommendations = Array.from(weakPages.entries())
      .filter(([, v]) => v.wrong > 0 && v.total > 0 && v.wrong / v.total >= 0.5)
      .sort((a, b) => b[1].wrong / b[1].total - a[1].wrong / a[1].total)
      .slice(0, 3)
      .map(([page, v]) => ({ pageNumber: page, wrong: v.wrong, total: v.total }));

    return {
      id: course.id,
      title: course.title,
      category: course.category,
      description: course.description,
      coverUrl: course.coverUrl,
      totalPages: course.totalPages,
      questionCount: course._count.questions,
      annotatedPages,
      pageProgress,
      answered: q.answered,
      correct: q.correct,
      incorrect: q.incorrect,
      accuracy,
      lastStudy,
      recommendations,
    };
  });

  const totalAnswered = responses.length;
  const totalCorrect = responses.filter((r) => r.isCorrect === true).length;
  const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const totalStudyTimeSeconds = attempts.reduce(
    (sum, a) =>
      sum +
      (a.answers as { timeSpentMs: number }[]).reduce((s, x) => s + (x.timeSpentMs ?? 0), 0) / 1000,
    0
  );

  const recentActivity = [
    ...attempts.map((a) => ({
      type: "quiz" as const,
      courseId: a.courseId,
      courseTitle: courseTitleById.get(a.courseId) ?? "",
      detail: `آزمون ${a.mode === "EXAM" ? "آزمایشی" : a.mode === "STUDY" ? "مطالعه" : "آزمون"} - ${a.correct} از ${a.total}`,
      score: a.correct,
      total: a.total,
      at: a.createdAt,
    })),
    ...annotations.map((a) => ({
      type: "study" as const,
      courseId: a.courseId,
      courseTitle: courseTitleById.get(a.courseId) ?? "",
      detail: `مطالعه صفحه ${a.pageNumber}`,
      score: null as number | null,
      total: null as number | null,
      at: a.updatedAt,
    })),
    ...responses.slice(0, 20).map((r) => {
      const meta = responseCourseMap.get(r.questionId);
      return {
        type: "question" as const,
        courseId: meta?.courseId ?? "",
        courseTitle: courseTitleById.get(meta?.courseId ?? "") ?? "",
        detail: r.isCorrect ? "پاسخ صحیح به سوال" : "پاسخ اشتباه به سوال",
        score: r.isCorrect ? 1 : 0,
        total: 1,
        at: r.answeredAt,
      };
    }),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 10);

  return ok({
    enrolled,
    overall: {
      totalAnswered,
      totalCorrect,
      overallAccuracy,
      totalStudyTimeSeconds,
      totalAttempts: attempts.length,
      totalCourses: courses.length,
    },
    recentActivity: recentActivity.map((a) => ({ ...a, at: a.at.toISOString() })),
  });
}