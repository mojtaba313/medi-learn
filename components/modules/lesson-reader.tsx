"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Highlighter,
  ListTree,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  annotationTimestamp,
  applyTextAnnotations,
  createTextAnnotationId,
  serializeSelection,
  TEXT_ANNOTATION_COLORS,
  type TextAnnotation,
  type TextAnnotationColor,
} from "@/lib/text-annotations";
import { extractBlockHeadings } from "@/lib/content-blocks";
import { AnnotationPopover } from "@/components/modules/annotation-popover";
import { BlockRenderer } from "@/components/modules/block-renderer";
import type { NoteData } from "@/components/modules/types";
import type { StudyPrefs } from "@/lib/study-prefs";
import { cn, toFa } from "@/lib/utils";

const COLOR_LABELS: Record<TextAnnotationColor, string> = {
  yellow: "زرد",
  green: "سبز",
  blue: "آبی",
  pink: "صورتی",
};

const COLOR_CLASSES: Record<TextAnnotationColor, string> = {
  yellow: "bg-yellow-300",
  green: "bg-emerald-300",
  blue: "bg-sky-300",
  pink: "bg-pink-300",
};

interface LessonReaderProps {
  lesson: NoteData;
  lessonIndex: number;
  total: number;
  isDone: boolean;
  isBookmarked: boolean;
  note: string;
  annotations: TextAnnotation[];
  searchQuery: string;
  prefs: StudyPrefs;
  onPrev: () => void;
  onNext: () => void;
  onToggleDone: () => void;
  onToggleBookmark: () => void;
  onNoteChange: (text: string) => void;
  onAddAnnotation: (annotation: TextAnnotation) => void;
  onUpdateAnnotation: (
    id: string,
    patch: { note?: string; color?: TextAnnotationColor },
  ) => void;
  onDeleteAnnotation: (id: string) => void;
  onOpenQuiz: () => void;
}

export function LessonReader({
  lesson,
  lessonIndex,
  total,
  isDone,
  isBookmarked,
  note,
  annotations,
  searchQuery,
  prefs,
  onPrev,
  onNext,
  onToggleDone,
  onToggleBookmark,
  onNoteChange,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onOpenQuiz,
}: LessonReaderProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [toolbar, setToolbar] = useState<{
    top: number;
    left: number;
    payload: Omit<TextAnnotation, "id" | "lessonSlug" | "color" | "note" | "createdAt">;
  } | null>(null);
  const [popoverId, setPopoverId] = useState<string | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });

  const headings = useMemo(() => extractBlockHeadings(lesson.blocks), [lesson.blocks]);

  const wordCount = note.trim() ? note.trim().split(/\s+/).length : 0;
  const activeAnnotation = popoverId
    ? annotations.find((annotation) => annotation.id === popoverId)
    : null;

  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;
    root.querySelectorAll("a").forEach((anchor) => {
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noreferrer");
    });
  }, []);

  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;
    root.querySelectorAll("h3").forEach((heading, index) => {
      heading.id = `section-${index + 1}`;
    });
    if (!searchQuery) applyTextAnnotations(root, annotations);
  }, [annotations, searchQuery]);

  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return undefined;

    const handleMouseUp = () => {
      if (searchQuery) return;
      window.setTimeout(() => {
        const selection = window.getSelection();
        const payload = serializeSelection(selection, root);
        if (!payload) {
          setToolbar(null);
          return;
        }

        const range = selection?.getRangeAt(0);
        if (!range) return;
        const overlaps = Array.from(
          root.querySelectorAll("mark.annotation-highlight"),
        ).some((mark) => range.intersectsNode(mark));
        if (overlaps) {
          setToolbar(null);
          return;
        }

        const rect = range.getBoundingClientRect();
        setToolbar({
          top: rect.top > 70 ? rect.top - 48 : rect.bottom + 10,
          left: Math.max(
            12,
            Math.min(rect.left + rect.width / 2 - 96, window.innerWidth - 210),
          ),
          payload,
        });
        setPopoverId(null);
      }, 0);
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const mark = target.closest?.("mark.annotation-highlight") as HTMLElement | null;
      if (!mark) {
        setPopoverId(null);
        return;
      }
      const rect = mark.getBoundingClientRect();
      setPopoverId(mark.dataset.annotationId ?? null);
      setPopoverPosition({
        top: Math.min(Math.max(12, rect.bottom + 8), Math.max(12, window.innerHeight - 380)),
        left: Math.max(12, Math.min(rect.left, window.innerWidth - 336)),
      });
      setToolbar(null);
    };

    const hideToolbar = () => setToolbar(null);
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest?.(".annotation-popover") ||
        target.closest?.("mark.annotation-highlight") ||
        target.closest?.(".selection-toolbar")
      ) {
        return;
      }
      setPopoverId(null);
      setToolbar(null);
    };

    root.addEventListener("mouseup", handleMouseUp);
    root.addEventListener("click", handleClick);
    document.addEventListener("click", handleDocumentClick);
    window.addEventListener("scroll", hideToolbar, true);
    window.addEventListener("resize", hideToolbar);

    return () => {
      root.removeEventListener("mouseup", handleMouseUp);
      root.removeEventListener("click", handleClick);
      document.removeEventListener("click", handleDocumentClick);
    window.removeEventListener("scroll", hideToolbar, true);
    window.removeEventListener("resize", hideToolbar);
    };
  }, [searchQuery]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (typing) return;
      if (event.key === "ArrowRight") onPrev();
      if (event.key === "ArrowLeft") onNext();
      if (event.key.toLowerCase() === "b") onToggleBookmark();
      if (event.key.toLowerCase() === "n") noteRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onPrev, onNext, onToggleBookmark]);

  const addHighlight = (color: TextAnnotationColor) => {
    if (!toolbar) return;
    onAddAnnotation({
      id: createTextAnnotationId(),
      lessonSlug: lesson.id,
      color,
      note: "",
      createdAt: annotationTimestamp(),
      ...toolbar.payload,
    });
    setToolbar(null);
    window.getSelection()?.removeAllRanges();
  };

  const fontClass = {
    sm: "text-[15px]",
    md: "text-[17px]",
    lg: "text-[19px]",
  }[prefs.fontSize];
  const widthClass = {
    narrow: "max-w-2xl",
    normal: "max-w-3xl",
    wide: "max-w-4xl",
  }[prefs.readingWidth];
  const lineClass = prefs.lineHeight === "relaxed" ? "leading-9" : "leading-8";

  return (
    <>
      <article className={cn("mx-auto w-full", widthClass)}>
        <header className="mb-5">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-teal-500/10 px-3 py-1 font-medium text-teal-600 dark:text-teal-400">
              بخش {toFa(lessonIndex + 1)} از {toFa(total)}
            </span>
            {lesson.mins && (
              <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                {lesson.mins}
              </span>
            )}
            {wordCount > 0 && (
              <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                {toFa(wordCount)} کلمه یادداشت
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-black leading-10 sm:text-3xl">{lesson.title}</h1>
            <button
              type="button"
              onClick={onToggleBookmark}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                isBookmarked
                  ? "border-amber-400/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {isBookmarked ? (
                <BookmarkCheck className="h-4 w-4" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
              {isBookmarked ? "نشان‌شده" : "نشان کردن"}
            </button>
          </div>
          {lesson.summary && (
            <p className="mt-3 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-sm leading-7 text-muted-foreground">
              {lesson.summary}
            </p>
          )}
          {lesson.source && (
            <p className="mt-2 text-xs text-muted-foreground">{lesson.source}</p>
          )}
        </header>

        {headings.length > 1 && (
          <details
            open
            className="mb-5 rounded-2xl border border-border/60 bg-card/60 px-4 py-3"
          >
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <ListTree className="h-4 w-4 text-teal-500" />
              فهرست این بخش
            </summary>
            <ol className="mt-3 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
              {headings.map((heading, index) => (
                <li key={heading.id} className="flex items-start gap-2">
                  <span className="mt-0.5 text-[10px] text-teal-500">{toFa(index + 1)}.</span>
                  <button
                    type="button"
                    className="text-right leading-6 hover:text-primary"
                    onClick={() =>
                      document
                        .getElementById(heading.id)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                  >
                    {heading.text}
                  </button>
                </li>
              ))}
            </ol>
          </details>
        )}

        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-dashed border-teal-500/30 bg-teal-500/5 px-4 py-3 text-xs leading-6 text-muted-foreground">
          <Highlighter className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />
          <span>
            متن درس را انتخاب کنید تا نوار رنگ‌ها باز شود. روی هر هایلایت کلیک کنید تا
            یادداشت بنویسید.
          </span>
        </div>

        <div ref={bodyRef} className={cn("lesson-body", fontClass, lineClass)}>
          {lesson.blocks && lesson.blocks.length > 0 ? (
            <BlockRenderer
              blocks={lesson.blocks}
              assets={lesson.assets ?? {}}
              imageAnnotations={lesson.imageAnnotations ?? {}}
              onImageAnnotationsChange={() => {}}
            />
          ) : (
            <div className="text-muted-foreground text-center py-12">
              محتوای این درس در قالب بلوک تعریف نشده است.
            </div>
          )}
        </div>

        <section className="mt-8 rounded-2xl border border-border/60 bg-card/70 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4 text-teal-500" />
                یادداشت من
              </h3>
              <span className="text-xs text-muted-foreground">
                خودکار ذخیره می‌شود • {toFa(wordCount)} کلمه
              </span>
            </div>
            {note.trim() && (
              <button
                type="button"
                onClick={() => onNoteChange("")}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                پاک کردن
              </button>
            )}
          </div>
          <textarea
            ref={noteRef}
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="نکته‌های کلیدی، دام‌های امتحانی، ارتباط با درس‌های قبل و هر چیزی که می‌خواهی یادت بماند…"
            rows={5}
            className="w-full resize-y rounded-xl border border-input bg-background px-3 py-3 text-sm leading-7 outline-none transition-colors focus:border-primary"
          />
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onPrev}
            disabled={lessonIndex === 0}
            className="inline-flex items-center gap-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
            بخش قبلی
          </button>
          <button
            type="button"
            onClick={onToggleDone}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium",
              isDone
                ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-primary text-primary-foreground",
            )}
          >
            <Check className="h-4 w-4" />
            {isDone ? "مطالعه‌شده (لغو علامت)" : "علامت‌گذاری به‌عنوان مطالعه‌شده"}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={lessonIndex === total - 1}
            className="inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            بخش بعدی
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </article>

      <div className="mx-auto mt-6 w-full max-w-3xl rounded-2xl border border-border/60 bg-gradient-to-l from-teal-500/10 to-transparent p-5">
        <h3 className="flex items-center gap-2 font-semibold">
          <ClipboardCheck className="h-4 w-4 text-teal-500" />
          بازیابی فعال در ۳۰ ثانیه
        </h3>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          بدون برگشتن به متن، در یک جمله مهم‌ترین تمایز این بخش را با صدای بلند توضیح
          بده. سپس خودت جواب را با تیترها و جدول همین بخش مقایسه کن.
        </p>
        <button
          type="button"
          onClick={onOpenQuiz}
          className="mt-3 rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-2 text-sm font-medium text-teal-700 dark:text-teal-300"
        >
          رفتن به آزمون
        </button>
      </div>

      {toolbar && (
        <div
          className="selection-toolbar fixed z-50 flex items-center gap-1.5 rounded-full border border-border bg-popover p-1.5 shadow-xl"
          style={{ top: toolbar.top, left: toolbar.left }}
          role="toolbar"
          aria-label="رنگ هایلایت"
        >
          {TEXT_ANNOTATION_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={cn(
                "h-7 w-7 rounded-full border-2 border-transparent transition-transform hover:scale-110",
                COLOR_CLASSES[color],
              )}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => addHighlight(color)}
              title={`هایلایت ${COLOR_LABELS[color]}`}
              aria-label={`هایلایت ${COLOR_LABELS[color]}`}
            />
          ))}
        </div>
      )}

      {activeAnnotation && (
        <AnnotationPopover
          key={activeAnnotation.id}
          annotation={activeAnnotation}
          position={popoverPosition}
          onSave={(nextNote, nextColor) => {
            onUpdateAnnotation(activeAnnotation.id, {
              note: nextNote,
              color: nextColor,
            });
            setPopoverId(null);
          }}
          onDelete={() => {
            onDeleteAnnotation(activeAnnotation.id);
            setPopoverId(null);
          }}
          onClose={() => setPopoverId(null)}
        />
      )}
    </>
  );
}
