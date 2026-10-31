import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ModuleStudy } from "@/components/modules/module-study";
import type {
  AttemptAnswer,
  AttemptData,
  GalleryData,
  NoteMeta,
  ReviewData,
} from "@/components/modules/types";
import type {
  TextAnnotation,
  TextAnnotationColor,
} from "@/lib/text-annotations";
import type { AnnotationData } from "@/lib/annotations";
import { extractBlockHeadings, splitBlocksByHeadings, type ContentBlock } from "@/lib/content-blocks";

export const metadata = { title: "مطالعه نوت" };

export default async function ModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ note?: string; view?: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;
  const { note: noteParam, view } = await searchParams;

  const noteRecord = await db.note.findUnique({
    where: { id },
    include: {
      assets: true,
      questions: { orderBy: { order: "asc" } },
      flashcards: { orderBy: { order: "asc" } },
    },
  });

  if (!noteRecord) notFound();

  const [progressRows, noteRows, annotationRows, bookmarkRows, reviewRows, attempts, responses] =
    await Promise.all([
      db.noteProgress.findMany({
        where: { userId: user.id, noteId: id },
        select: { noteId: true, done: true },
      }),
      db.noteNote.findMany({
        where: { userId: user.id, noteId: id },
        select: { noteId: true, text: true },
      }),
      db.textAnnotation.findMany({
        where: { userId: user.id, noteId: id },
        orderBy: { createdAt: "asc" },
      }),
      db.bookmark.findMany({
        where: { userId: user.id, noteId: id },
        select: { noteId: true },
      }),
      db.flashcardReview.findMany({
        where: { userId: user.id, card: { noteId: id } },
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
      db.noteQuizAttempt.findMany({
        where: { userId: user.id, noteId: id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      db.noteQuestionResponse.findMany({
        where: { userId: user.id, question: { noteId: id } },
        select: { questionId: true, selectedOption: true, isCorrect: true },
      }),
    ]);

  const lessons = splitBlocksByHeadings(
    (noteRecord.blocks as unknown as ContentBlock[]) ?? [],
    noteRecord.id,
    noteRecord.title,
  );

  const initialProgress: Record<string, boolean> = {};
  for (const row of progressRows) {
    initialProgress[row.noteId] = row.done;
  }

  const initialNotes: Record<string, string> = {};
  for (const row of noteRows) {
    initialNotes[row.noteId] = row.text;
  }

  const initialAnnotations: TextAnnotation[] = annotationRows.map((row) => ({
    id: row.id,
    lessonSlug: noteRecord.slug,
    color: row.color as TextAnnotationColor,
    note: row.content ?? "",
    quote: row.quote,
    startPath: row.startPath,
    startOffset: row.startOffset,
    endPath: row.endPath,
    endOffset: row.endOffset,
    createdAt: row.createdAt.getTime(),
  }));

  const initialBookmarks = bookmarkRows
    .map((row) => row.noteId)
    .filter((noteId): noteId is string => Boolean(noteId));

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

  const assetsById: Record<string, { url: string; width?: number; height?: number }> = {};
  for (const asset of noteRecord.assets ?? []) {
    assetsById[asset.assetId] = {
      url: `/api/modules/${encodeURIComponent(noteRecord.id)}/assets/${encodeURIComponent(asset.assetId)}/image`,
      width: asset.width ?? undefined,
      height: asset.height ?? undefined,
    };
  }

  const moduleData: NoteMeta = {
    id: noteRecord.id,
    title: noteRecord.title,
    cardTitle: noteRecord.cardTitle,
    cardDescription: noteRecord.cardDescription,
    eyebrow: noteRecord.eyebrow,
    description: noteRecord.description,
    pills: noteRecord.pills,
    footer: noteRecord.footer,
    gallery: (noteRecord.gallery as unknown as GalleryData | null) ?? null,
    referencesTitle: noteRecord.referencesTitle,
    referencesIntro: noteRecord.referencesIntro,
    referencesHtml: noteRecord.referencesHtml,
    quizTitle: noteRecord.quizTitle,
    quizDescription: noteRecord.quizDescription,
    quizNavLabel: noteRecord.quizNavLabel,
    assets: noteRecord.assets,
  };

  return (
    <ModuleStudy
      module={moduleData}
      lessons={lessons.map((item) => ({
        id: item.id,
        slug: item.slug,
        order: item.order,
        title: item.title,
        mins: item.mins,
        source: item.source,
        summary: item.summary,
        html: item.html,
        blocks: item.blocks,
        searchText: item.searchText ?? null,
        assets: assetsById,
        imageAnnotations: item.imageAnnotations,
      }))}
      questions={noteRecord.questions.map((item) => ({
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
      flashcards={noteRecord.flashcards.map((item) => ({
        id: item.id,
        order: item.order,
        term: item.term,
        definition: item.definition,
      }))}
      initialLessonSlug={noteParam}
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
