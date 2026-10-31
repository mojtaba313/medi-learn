"use client";

import {
  Download,
  Highlighter,
  NotebookPen,
  PencilLine,
  Trash2,
} from "lucide-react";
import type { NoteData } from "@/components/modules/types";
import type { TextAnnotation } from "@/lib/text-annotations";
import { cn, toFa } from "@/lib/utils";

const COLOR_CLASSES: Record<string, string> = {
  yellow: "bg-yellow-300",
  green: "bg-emerald-300",
  blue: "bg-sky-300",
  pink: "bg-pink-300",
};

const downloadText = (filename: string, text: string) => {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

interface ModuleNotesProps {
  moduleTitle: string;
  lessons: NoteData[];
  notes: Record<string, string>;
  annotations: TextAnnotation[];
  onOpenLesson: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onDeleteAnnotation: (id: string) => void;
}

export function ModuleNotes({
  moduleTitle,
  lessons,
  notes,
  annotations,
  onOpenLesson,
  onDeleteNote,
  onDeleteAnnotation,
}: ModuleNotesProps) {
  const lessonBySlug = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const noteEntries = Object.entries(notes)
    .filter(([, text]) => text.trim())
    .map(([id, text]) => ({ lesson: lessonBySlug.get(id), id, text }))
    .filter((entry) => entry.lesson);

  const exportMarkdown = () => {
    const lines = [`# ${moduleTitle}`, ""];
    lines.push("## یادداشت‌ها", "");
    for (const entry of noteEntries) {
      lines.push(`### ${entry.lesson?.title ?? entry.id}`, "", entry.text, "");
    }
    lines.push("## هایلایت‌ها", "");
    for (const annotation of annotations) {
      const lesson = lessonBySlug.get(annotation.lessonSlug);
      lines.push(
        `- «${annotation.quote}»${annotation.note ? ` — ${annotation.note}` : ""} (${lesson?.title ?? annotation.lessonSlug})`,
      );
    }
    downloadText(`${moduleTitle.replace(/\s+/g, "-")}-notes.md`, lines.join("\n"));
  };

  return (
    <section className="mx-auto w-full max-w-4xl">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-teal-600 dark:text-teal-400">
            <NotebookPen className="h-3.5 w-3.5" />
            دفتر مطالعه
          </div>
          <h1 className="text-2xl font-black sm:text-3xl">یادداشت‌ها و هایلایت‌ها</h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            {toFa(noteEntries.length)} یادداشت و {toFa(annotations.length)} هایلایت در این
            جزوه.
          </p>
        </div>
        <button
          type="button"
          onClick={exportMarkdown}
          disabled={noteEntries.length === 0 && annotations.length === 0}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
          خروجی Markdown
        </button>
      </header>

      <div className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <NotebookPen className="h-4 w-4 text-teal-500" />
          یادداشت‌های درس
        </h2>
        {noteEntries.length === 0 ? (
          <EmptyState text="هنوز یادداشتی ننوشته‌اید. در هر درس، بخش «یادداشت من» را پر کنید." />
        ) : (
          <div className="space-y-3">
            {noteEntries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-border/60 bg-card/70 p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenLesson(entry.id)}
                    className="text-right font-semibold hover:text-primary"
                  >
                    {entry.lesson?.title}
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenLesson(entry.id)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
                      title="ویرایش در درس"
                    >
                      <PencilLine className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteNote(entry.id)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="حذف یادداشت"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {entry.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Highlighter className="h-4 w-4 text-teal-500" />
          هایلایت‌ها
        </h2>
        {annotations.length === 0 ? (
          <EmptyState text="هنوز متنی را هایلایت نکرده‌اید. متن درس را انتخاب کنید و یک رنگ بزنید." />
        ) : (
          <div className="space-y-3">
            {annotations.map((annotation) => {
              const lesson = lessonBySlug.get(annotation.lessonSlug);
              return (
                <div
                  key={annotation.id}
                  className="rounded-2xl border border-border/60 bg-card/70 p-4"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-3 w-3 shrink-0 rounded-full",
                          COLOR_CLASSES[annotation.color] ?? "bg-yellow-300",
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => onOpenLesson(annotation.lessonSlug)}
                        className="text-right text-xs font-medium text-muted-foreground hover:text-primary"
                      >
                        {lesson?.title}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteAnnotation(annotation.id)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="حذف هایلایت"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <blockquote className="border-r-2 border-primary/30 pr-3 text-sm leading-7">
                    {annotation.quote}
                  </blockquote>
                  {annotation.note && (
                    <p className="mt-2 rounded-xl bg-muted/50 px-3 py-2 text-xs leading-6 text-muted-foreground">
                      {annotation.note}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
