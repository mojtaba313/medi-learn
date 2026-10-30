"use client";

import { Bookmark, BookmarkX, ChevronLeft } from "lucide-react";
import type { LessonData } from "@/components/modules/types";
import { toFa } from "@/lib/utils";

export function ModuleBookmarks({
  lessons,
  bookmarks,
  onOpenLesson,
  onRemove,
}: {
  lessons: LessonData[];
  bookmarks: string[];
  onOpenLesson: (slug: string) => void;
  onRemove: (slug: string) => void;
}) {
  const lessonBySlug = new Map(lessons.map((lesson) => [lesson.slug, lesson]));
  const entries = bookmarks
    .map((slug) => lessonBySlug.get(slug))
    .filter((lesson): lesson is LessonData => Boolean(lesson));

  return (
    <section className="mx-auto w-full max-w-3xl">
      <header className="mb-5">
        <div className="mb-1 flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400">
          <Bookmark className="h-3.5 w-3.5" />
          نشان‌شده‌ها
        </div>
        <h1 className="text-2xl font-black sm:text-3xl">درس‌های نشان‌شده</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          {toFa(entries.length)} درس برای مرور سریع نشان کرده‌اید.
        </p>
      </header>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          هنوز درسی را نشان نکرده‌اید. در هر درس روی «نشان کردن» بزنید.
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((lesson) => (
            <div
              key={lesson.slug}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/70 p-4"
            >
              <div className="min-w-0">
                <div className="mb-1 text-xs text-muted-foreground">
                  بخش {toFa(lessons.findIndex((item) => item.slug === lesson.slug) + 1)}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenLesson(lesson.slug)}
                  className="truncate text-right font-semibold hover:text-primary"
                >
                  {lesson.title}
                </button>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onRemove(lesson.slug)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="حذف نشان"
                >
                  <BookmarkX className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenLesson(lesson.slug)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20"
                >
                  مطالعه
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
