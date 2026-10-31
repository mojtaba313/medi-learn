import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const metadata = { title: "داشبورد" };

export default async function DashboardPage() {
  const user = await requireAuth();

const [notes, progressRows, noteRows, annotationRows, bookmarkRows, reviewRows, flashcardReviews, attempts, responses] = await Promise.all([
      db.note.findMany({
        where: { createdById: user.id },
        include: { _count: { select: { questions: true, flashcards: true, assets: true } } },
        orderBy: { order: "asc" },
      }),
      db.noteProgress.findMany({
        where: { userId: user.id },
        select: { noteId: true, done: true, lastOpenedAt: true },
      }),
      db.noteNote.findMany({
        where: { userId: user.id },
        select: { noteId: true, text: true },
      }),
      db.textAnnotation.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
      }),
      db.bookmark.findMany({
        where: { userId: user.id },
        select: { noteId: true },
      }),
      db.noteQuizAttempt.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      db.flashcardReview.findMany({
        where: { userId: user.id },
        include: { card: { select: { noteId: true } } },
      }),
      db.noteQuizAttempt.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      db.noteQuestionResponse.findMany({
        where: { userId: user.id },
        select: { questionId: true, selectedOption: true, isCorrect: true },
      }),
    ]);

  const noteIds = notes.map((n) => n.id);
  const noteIdsSet = new Set(noteIds);

  const now = new Date();
  const statsMap = new Map<
    string,
    {
      done: number;
      notes: number;
      highlights: number;
      bookmarks: number;
      due: number;
      lastOpenedAt: Date | null;
    }
  >();
  for (const row of progressRows) {
    statsMap.set(row.noteId, {
      done: row.done ? 1 : 0,
      notes: 0,
      highlights: 0,
      bookmarks: 0,
      due: 0,
      lastOpenedAt: row.lastOpenedAt,
    });
  }
  for (const row of noteRows) {
    const s = statsMap.get(row.noteId);
    if (s) s.notes++;
  }
  for (const row of annotationRows) {
    const s = statsMap.get(row.noteId);
    if (s) s.highlights++;
  }
  for (const row of bookmarkRows) {
    const s = statsMap.get(row.noteId);
    if (s) s.bookmarks++;
  }
for (const row of flashcardReviews) {
    const s = statsMap.get(row.card.noteId);
    if (s && row.due && row.due <= now) s.due++;
  }

  const overall = {
    totalNotes: notes.length,
    totalQuestions: notes.reduce((s, n) => s + n._count.questions, 0),
    totalFlashcards: notes.reduce((s, n) => s + n._count.flashcards, 0),
    totalAssets: notes.reduce((s, n) => s + n._count.assets, 0),
    totalAnnotations: annotationRows.length,
    studyStreak: 0, // simplified
    totalStudyTimeSeconds: 0, // simplified
    totalAttempts: attempts.length,
    overallAccuracy: 0, // simplified
  };

  const initialStats = {
    overall,
    notes: notes.map((note) => ({
      id: note.id,
      title: note.title,
      description: note.description,
      kind: note.kind,
      order: note.order,
      assetCount: note._count.assets,
      questionCount: note._count.questions,
      flashcardCount: note._count.flashcards,
      done: false,
      lastOpenedAt: null,
      progress: 0,
    })),
  };

  return <DashboardClient initialStats={initialStats} />;
}