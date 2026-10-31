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

  const [
    notes,
    noteProgress,
    noteNotes,
    noteAnnotations,
    noteBookmarks,
    noteReviews,
    noteAttempts,
    studySessions,
  ] = await Promise.all([
    db.note.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      include: {
        _count: { select: { questions: true, flashcards: true } },
      },
    }),
    db.noteProgress.findMany({
      where: { userId: session.userId },
      select: { done: true, updatedAt: true, noteId: true },
    }),
    db.noteNote.findMany({
      where: { userId: session.userId },
      select: { updatedAt: true, noteId: true },
    }),
    db.textAnnotation.findMany({
      where: { userId: session.userId },
      select: { updatedAt: true, noteId: true },
    }),
    db.bookmark.findMany({
      where: { userId: session.userId },
      select: { createdAt: true, noteId: true },
    }),
    db.flashcardReview.findMany({
      where: { userId: session.userId },
      select: { due: true, card: { select: { noteId: true } } },
    }),
    db.noteQuizAttempt.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      select: {
        noteId: true,
        mode: true,
        score: true,
        total: true,
        correct: true,
        incorrect: true,
        createdAt: true,
      },
    }),
    db.studySession.findMany({
      where: { userId: session.userId },
      orderBy: { startedAt: "asc" },
      select: { minutes: true, startedAt: true, kind: true },
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
    ...noteAttempts.slice(0, 10).map((attempt) => ({
      type: "module-quiz" as const,
      courseId: "",
      courseTitle: noteById.get(attempt.noteId)?.cardTitle ?? "",
      moduleId: attempt.noteId,
      detail: `آزمون جزوه - ${attempt.correct} از ${attempt.total}`,
      score: attempt.correct,
      total: attempt.total,
      at: attempt.createdAt,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 10);

  const noteById = new Map(notes.map((note) => [note.id, note]));
  const noteRowsMap = new Map<
    string,
    {
      done: number;
      notes: number;
      highlights: number;
      bookmarks: number;
      due: number;
      quizCorrect: number;
      quizTotal: number;
      quizAttempts: number;
      lastActivity: Date | null;
    }
  >();
  const getNoteRow = (noteId: string) => {
    if (!noteRowsMap.has(noteId)) {
      noteRowsMap.set(noteId, {
        done: 0,
        notes: 0,
        highlights: 0,
        bookmarks: 0,
        due: 0,
        quizCorrect: 0,
        quizTotal: 0,
        quizAttempts: 0,
        lastActivity: null,
      });
    }
    return noteRowsMap.get(noteId)!;
  };
  const bumpActivity = (row: { lastActivity: Date | null }, at: Date) => {
    if (!row.lastActivity || at > row.lastActivity) row.lastActivity = at;
  };

  for (const noteItem of notes) {
    getNoteRow(noteItem.id).due = noteItem._count.flashcards;
  }

  for (const row of noteProgress) {
    if (!noteById.has(row.noteId)) continue;
    const entry = getNoteRow(row.noteId);
    if (row.done) entry.done += 1;
    bumpActivity(entry, row.updatedAt);
  }
  for (const row of noteNotes) {
    if (!noteById.has(row.noteId)) continue;
    const entry = getNoteRow(row.noteId);
    entry.notes += 1;
    bumpActivity(entry, row.updatedAt);
  }
  for (const row of noteAnnotations) {
    if (!noteById.has(row.noteId)) continue;
    const entry = getNoteRow(row.noteId);
    entry.highlights += 1;
    bumpActivity(entry, row.updatedAt);
  }
  for (const row of noteBookmarks) {
    if (!noteById.has(row.noteId)) continue;
    const entry = getNoteRow(row.noteId);
    entry.bookmarks += 1;
    bumpActivity(entry, row.createdAt);
  }
  const now = Date.now();
  for (const row of noteReviews) {
    if (!noteById.has(row.card.noteId)) continue;
    if (row.due.getTime() > now) getNoteRow(row.card.noteId).due -= 1;
  }
  for (const row of noteAttempts) {
    if (!noteById.has(row.noteId)) continue;
    const entry = getNoteRow(row.noteId);
    entry.quizCorrect += row.correct;
    entry.quizTotal += row.total;
    entry.quizAttempts += 1;
    bumpActivity(entry, row.createdAt);
  }

  const noteRows = notes.map((note) => {
    const entry = noteRowsMap.get(note.id) ?? {
      done: 0,
      notes: 0,
      highlights: 0,
      bookmarks: 0,
      due: 0,
      quizCorrect: 0,
      quizTotal: 0,
      quizAttempts: 0,
      lastActivity: null,
    };
    return {
      id: note.id,
      title: note.cardTitle,
      description: note.cardDescription ?? note.description,
      lessonCount: 1,
      done: entry.done,
      percent: entry.done,
      notes: entry.notes,
      highlights: entry.highlights,
      bookmarks: entry.bookmarks,
      dueCards: entry.due,
      questionCount: note._count.questions,
      flashcardCount: note._count.flashcards,
      quizCorrect: entry.quizCorrect,
      quizTotal: entry.quizTotal,
      quizPercent: entry.quizTotal
        ? Math.round((entry.quizCorrect / entry.quizTotal) * 100)
        : 0,
      quizAttempts: entry.quizAttempts,
      lastActivity: entry.lastActivity,
    };
  });

  const noteTotals = noteRows.reduce(
    (sum, row) => ({
      totalLessons: sum.totalLessons + row.lessonCount,
      completedLessons: sum.completedLessons + row.done,
      notes: sum.notes + row.notes,
      highlights: sum.highlights + row.highlights,
      bookmarks: sum.bookmarks + row.bookmarks,
      dueCards: sum.dueCards + row.dueCards,
      quizCorrect: sum.quizCorrect + row.quizCorrect,
      quizTotal: sum.quizTotal + row.quizTotal,
      quizAttempts: sum.quizAttempts + row.quizAttempts,
    }),
    {
      totalLessons: 0,
      completedLessons: 0,
      notes: 0,
      highlights: 0,
      bookmarks: 0,
      dueCards: 0,
      quizCorrect: 0,
      quizTotal: 0,
      quizAttempts: 0,
    },
  );

  const dateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const studyByDay = new Map<string, number>();
  let totalStudyMinutes = 0;
  for (const row of studySessions) {
    const key = dateKey(row.startedAt);
    studyByDay.set(key, (studyByDay.get(key) ?? 0) + row.minutes);
    totalStudyMinutes += row.minutes;
  }

  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!studyByDay.get(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let studyStreak = 0;
  while ((studyByDay.get(dateKey(cursor)) ?? 0) > 0) {
    studyStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const studyHeatmap = Array.from({ length: 91 }, (_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (90 - index));
    const key = dateKey(day);
    return { date: key, minutes: studyByDay.get(key) ?? 0 };
  });

  const moduleQuizCorrect = noteTotals.quizCorrect;
  const moduleQuizTotal = noteTotals.quizTotal;

  return ok({
    enrolled,
    modules: noteRows.map((row) => ({
      ...row,
      lastActivity: row.lastActivity?.toISOString() ?? null,
    })),
    overall: {
      totalAnswered,
      totalCorrect,
      overallAccuracy,
      totalStudyTimeSeconds,
      totalAttempts: attempts.length,
      totalCourses: courses.length,
      totalModules: notes.length,
      totalLessons: noteTotals.totalLessons,
      completedLessons: noteTotals.completedLessons,
      notes: noteTotals.notes,
      highlights: noteTotals.highlights,
      bookmarks: noteTotals.bookmarks,
      dueCards: noteTotals.dueCards,
      moduleQuizAttempts: noteTotals.quizAttempts,
      moduleQuizAccuracy: moduleQuizTotal
        ? Math.round((moduleQuizCorrect / moduleQuizTotal) * 100)
        : 0,
      totalStudyMinutes,
      todayMinutes: studyByDay.get(dateKey(new Date())) ?? 0,
      studyStreak,
    },
    studyHeatmap,
    recentActivity: recentActivity.map((a) => ({ ...a, at: a.at.toISOString() })),
  });
}