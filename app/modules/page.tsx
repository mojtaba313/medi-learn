import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  Brain,
  Clock,
  FileQuestion,
  Highlighter,
  Layers,
  NotebookPen,
} from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toFa, formatRelative } from "@/lib/utils";

export const metadata = { title: "جزوه‌های مطالعه" };

export default async function ModulesPage() {
  const user = await requireAuth();

  const notes = await db.note.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { questions: true, flashcards: true } },
    },
  });

  const noteIds = notes.map((note) => note.id);
  const [progressRows, noteRows, annotations, bookmarks, reviews] =
    await Promise.all([
      db.noteProgress.findMany({
        where: { userId: user.id, noteId: { in: noteIds } },
        select: {
          done: true,
          lastOpenedAt: true,
          noteId: true,
        },
      }),
      db.noteNote.findMany({
        where: { userId: user.id, noteId: { in: noteIds } },
        select: { noteId: true },
      }),
      db.textAnnotation.findMany({
        where: { userId: user.id, noteId: { in: noteIds } },
        select: { noteId: true },
      }),
      db.bookmark.findMany({
        where: { userId: user.id, noteId: { in: noteIds } },
        select: { noteId: true },
      }),
      db.flashcardReview.findMany({
        where: { userId: user.id, card: { noteId: { in: noteIds } } },
        select: { due: true, card: { select: { noteId: true } } },
      }),
    ]);

  const now = new Date();
  const stats = new Map<
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
  const get = (noteId: string) => {
    if (!stats.has(noteId)) {
      stats.set(noteId, {
        done: 0,
        notes: 0,
        highlights: 0,
        bookmarks: 0,
        due: 0,
        lastOpenedAt: null,
      });
    }
    return stats.get(noteId)!;
  };

  for (const noteItem of notes) {
    get(noteItem.id).due = noteItem._count.flashcards;
  }

  for (const row of progressRows) {
    const entry = get(row.noteId);
    if (row.done) entry.done += 1;
    if (row.lastOpenedAt && (!entry.lastOpenedAt || row.lastOpenedAt > entry.lastOpenedAt)) {
      entry.lastOpenedAt = row.lastOpenedAt;
    }
  }
  for (const row of noteRows) get(row.noteId).notes += 1;
  for (const row of annotations) get(row.noteId).highlights += 1;
  for (const row of bookmarks) get(row.noteId).bookmarks += 1;
  for (const row of reviews) {
    if (row.due > now) get(row.card.noteId).due -= 1;
  }

  const totalDone = Array.from(stats.values()).reduce((sum, entry) => sum + entry.done, 0);
  const totalLessons = notes.length;

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-600 dark:text-teal-400">
              <Layers className="h-3.5 w-3.5" />
              درس‌یار تعاملی
            </div>
            <h1 className="text-2xl font-bold sm:text-3xl">جزوه‌های مطالعه</h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              درس‌های ساختارمند همراه با هایلایت، یادداشت، فلش‌کارت و آزمون جامع.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/60 px-5 py-3 text-sm">
            <span className="text-muted-foreground">پیشرفت کلی: </span>
            <span className="font-bold text-teal-600 dark:text-teal-400">
              {toFa(totalDone)} از {toFa(totalLessons)} درس
            </span>
          </div>
        </div>

        {notes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-20 text-center text-muted-foreground">
            هنوز جزوهی وارد نشده است.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {notes.map((note) => {
              const entry = stats.get(note.id) ?? {
                done: 0,
                notes: 0,
                highlights: 0,
                bookmarks: 0,
                due: 0,
                lastOpenedAt: null,
              };
              const total = 1;
              const percent = total > 0 ? Math.round((entry.done / total) * 100) : 0;

              return (
                <Card
                  key={note.id}
                  className="group overflow-hidden border-border/60 transition-colors hover:border-teal-500/40"
                >
                  <CardContent className="p-0">
                    <div className="relative border-b border-border/60 bg-gradient-to-l from-teal-500/10 via-cyan-500/5 to-transparent p-5">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">نوت {toFa(note.number)}</Badge>
                        {note.eyebrow && (
                          <span className="text-xs text-muted-foreground">{note.eyebrow}</span>
                        )}
                        {entry.due > 0 && (
                          <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400">
                            {toFa(entry.due)} فلش‌کارت سررسید
                          </Badge>
                        )}
                      </div>
                      <h2 className="text-xl font-bold leading-8">{note.cardTitle}</h2>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {note.cardDescription ?? note.description}
                      </p>
                    </div>

                    <div className="space-y-4 p-5">
                      <div>
                        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{toFa(percent)}٪ تکمیل</span>
                          <span>
                            {toFa(entry.done)} از {toFa(total)} نوت
                          </span>
                        </div>
                        <Progress value={percent} className="h-2" />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                        <Stat icon={FileQuestion} value={note._count.questions} label="سوال" />
                        <Stat icon={Brain} value={note._count.flashcards} label="فلش‌کارت" />
                        <Stat icon={Highlighter} value={entry.highlights} label="هایلایت" />
                        <Stat icon={NotebookPen} value={entry.notes} label="یادداشت" />
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {entry.lastOpenedAt
                            ? `آخرین مطالعه ${formatRelative(entry.lastOpenedAt)}`
                            : "هنوز شروع نشده"}
                          {entry.bookmarks > 0 && (
                            <span className="mr-2 inline-flex items-center gap-1">
                              <Bookmark className="h-3.5 w-3.5" />
                              {toFa(entry.bookmarks)}
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/modules/${note.id}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                        >
                          {entry.done > 0 ? "ادامه مطالعه" : "شروع مطالعه"}
                          <ArrowLeft className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" />
          همه درس‌ها بر پایه فصل ۴ رابینز و اسلایدهای آموزشی تدوین شده‌اند.
        </div>
      </main>
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof BookOpen;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-2.5 py-2">
      <Icon className="h-3.5 w-3.5 text-teal-500" />
      <span className="font-semibold">{toFa(value)}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
