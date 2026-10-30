import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ModuleStudy } from "@/components/modules/module-study";
import type {
  AttemptAnswer,
  AttemptData,
  GalleryData,
  ModuleData,
  ReviewData,
} from "@/components/modules/types";
import type {
  TextAnnotation,
  TextAnnotationColor,
} from "@/lib/text-annotations";

export const metadata = { title: "مطالعه ماژول" };

export default async function ModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lesson?: string; view?: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;
  const { lesson: lessonParam, view } = await searchParams;

  const moduleRecord = await db.module.findUnique({
    where: { id },
    include: {
      lessons: { orderBy: { order: "asc" } },
      questions: { orderBy: { order: "asc" } },
      flashcards: { orderBy: { order: "asc" } },
    },
  });

  if (!moduleRecord) notFound();

  const [progressRows, noteRows, annotationRows, bookmarkRows, reviewRows, attempts, responses] =
    await Promise.all([
      db.lessonProgress.findMany({
        where: { userId: user.id, lesson: { moduleId: id } },
        select: { lessonId: true, done: true },
      }),
      db.lessonNote.findMany({
        where: { userId: user.id, lesson: { moduleId: id } },
        select: { lessonId: true, text: true },
      }),
      db.lessonAnnotation.findMany({
        where: { userId: user.id, lesson: { moduleId: id } },
        orderBy: { createdAt: "asc" },
      }),
      db.bookmark.findMany({
        where: { userId: user.id, lesson: { moduleId: id } },
        select: { lessonId: true },
      }),
      db.flashcardReview.findMany({
        where: { userId: user.id, card: { moduleId: id } },
        select: {
          cardId: true,
          interval: true,
          ease: true,
          reps: true,
          lapses: true,
          due: true,
          last: true,
        },
      }),
      db.moduleQuizAttempt.findMany({
        where: { userId: user.id, moduleId: id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      db.moduleQuestionResponse.findMany({
        where: { userId: user.id, question: { moduleId: id } },
        select: { questionId: true, selectedOption: true, isCorrect: true },
      }),
    ]);

  const slugById = new Map(moduleRecord.lessons.map((item) => [item.id, item.slug]));

  const initialProgress: Record<string, boolean> = {};
  for (const row of progressRows) {
    const slug = slugById.get(row.lessonId);
    if (slug) initialProgress[slug] = row.done;
  }

  const initialNotes: Record<string, string> = {};
  for (const row of noteRows) {
    const slug = slugById.get(row.lessonId);
    if (slug) initialNotes[slug] = row.text;
  }

  const initialAnnotations: TextAnnotation[] = annotationRows.flatMap((row) => {
    const lessonSlug = slugById.get(row.lessonId);
    if (!lessonSlug) return [];
    return [
      {
        id: row.id,
        lessonSlug,
        color: row.color as TextAnnotationColor,
        note: row.note ?? "",
        quote: row.quote,
        startPath: row.startPath,
        startOffset: row.startOffset,
        endPath: row.endPath,
        endOffset: row.endOffset,
        createdAt: row.createdAt.getTime(),
      },
    ];
  });

  const initialBookmarks = bookmarkRows
    .map((row) => slugById.get(row.lessonId))
    .filter((slug): slug is string => Boolean(slug));

  const initialReviews: Record<string, ReviewData> = {};
  for (const row of reviewRows) {
    initialReviews[row.cardId] = {
      interval: row.interval,
      ease: row.ease,
      reps: row.reps,
      lapses: row.lapses,
      due: row.due.toISOString(),
      last: row.last?.toISOString() ?? null,
    };
  }

  const initialAttempts: AttemptData[] = attempts.map((attempt) => ({
    id: attempt.id,
    mode: attempt.mode,
    score: attempt.score,
    total: attempt.total,
    correct: attempt.correct,
    incorrect: attempt.incorrect,
    skipped: attempt.skipped,
    answers: (attempt.answers as unknown as AttemptAnswer[]) ?? [],
    topicStats:
      (attempt.topicStats as Record<string, { correct: number; total: number }> | null) ?? null,
    wrongQuestionIds: attempt.wrongQuestionIds,
    createdAt: attempt.createdAt.toISOString(),
  }));

  const initialResponses: Record<
    string,
    { selectedOption: string | null; isCorrect: boolean | null }
  > = {};
  for (const row of responses) {
    initialResponses[row.questionId] = {
      selectedOption: row.selectedOption,
      isCorrect: row.isCorrect,
    };
  }

  const moduleData: ModuleData = {
    id: moduleRecord.id,
    title: moduleRecord.title,
    cardTitle: moduleRecord.cardTitle,
    cardDescription: moduleRecord.cardDescription,
    eyebrow: moduleRecord.eyebrow,
    description: moduleRecord.description,
    pills: moduleRecord.pills,
    footer: moduleRecord.footer,
    gallery: (moduleRecord.gallery as unknown as GalleryData | null) ?? null,
    referencesTitle: moduleRecord.referencesTitle,
    referencesIntro: moduleRecord.referencesIntro,
    referencesHtml: moduleRecord.referencesHtml,
    quizTitle: moduleRecord.quizTitle,
    quizDescription: moduleRecord.quizDescription,
    quizNavLabel: moduleRecord.quizNavLabel,
  };

  return (
    <ModuleStudy
      module={moduleData}
      lessons={moduleRecord.lessons.map((item) => ({
        id: item.id,
        slug: item.slug,
        order: item.order,
        title: item.title,
        mins: item.mins,
        source: item.source,
        summary: item.summary,
        html: item.html,
      }))}
      questions={moduleRecord.questions.map((item) => ({
        id: item.id,
        order: item.order,
        text: item.text,
        optionA: item.optionA,
        optionB: item.optionB,
        optionC: item.optionC,
        optionD: item.optionD,
        correctOption: item.correctOption,
        explanation: item.explanation,
        topic: item.topic,
      }))}
      flashcards={moduleRecord.flashcards.map((item) => ({
        id: item.id,
        order: item.order,
        term: item.term,
        definition: item.definition,
      }))}
      initialLessonSlug={lessonParam}
      initialView={view}
      initialProgress={initialProgress}
      initialNotes={initialNotes}
      initialAnnotations={initialAnnotations}
      initialBookmarks={initialBookmarks}
      initialReviews={initialReviews}
      initialAttempts={initialAttempts}
      initialResponses={initialResponses}
    />
  );
}
