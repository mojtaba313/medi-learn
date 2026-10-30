"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  Brain,
  CheckCircle2,
  Circle,
  FileQuestion,
  FileText,
  Images,
  Keyboard,
  Maximize2,
  Menu,
  Minimize2,
  NotebookPen,
  Search,
  Settings,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { LessonReader } from "@/components/modules/lesson-reader";
import { ModuleQuiz } from "@/components/modules/module-quiz";
import { ModuleFlashcards } from "@/components/modules/module-flashcards";
import { ModuleNotes } from "@/components/modules/module-notes";
import { ModuleBookmarks } from "@/components/modules/module-bookmarks";
import { ModuleGallery, ImageLightbox } from "@/components/modules/module-gallery";
import { ModuleReferences } from "@/components/modules/module-references";
import { StudySettingsDialog } from "@/components/modules/study-settings-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import type {
  AttemptData,
  FlashcardData,
  LessonData,
  ModuleData,
  QuestionData,
  ResponseData,
  ReviewData,
} from "@/components/modules/types";
import type { TextAnnotation, TextAnnotationColor } from "@/lib/text-annotations";
import {
  gradeFlashcard,
  type SrsGrade,
  type SrsState,
} from "@/lib/srs";
import {
  loadStudyPrefs,
  normalizePrefs,
  saveStudyPrefs,
  type StudyPrefs,
} from "@/lib/study-prefs";
import { useStudyPrefs } from "@/lib/use-study-prefs";
import { cleanTitle } from "@/lib/module-utils";
import { cn, toFa } from "@/lib/utils";

type View =
  | "lesson"
  | "quiz"
  | "flashcards"
  | "notes"
  | "bookmarks"
  | "gallery"
  | "references";

const VIEWS: View[] = [
  "lesson",
  "quiz",
  "flashcards",
  "notes",
  "bookmarks",
  "gallery",
  "references",
];

function normalizeView(value?: string): View {
  if (value === "flash") return "flashcards";
  return VIEWS.includes(value as View) ? (value as View) : "lesson";
}

const isReviewDue = (review: ReviewData | undefined) =>
  !review || new Date(review.due).getTime() <= Date.now();

interface ModuleStudyProps {
  module: ModuleData;
  lessons: LessonData[];
  questions: QuestionData[];
  flashcards: FlashcardData[];
  initialLessonSlug?: string;
  initialView?: string;
  initialProgress: Record<string, boolean>;
  initialNotes: Record<string, string>;
  initialAnnotations: TextAnnotation[];
  initialBookmarks: string[];
  initialReviews: Record<string, ReviewData>;
  initialAttempts: AttemptData[];
  initialResponses: Record<string, ResponseData>;
}

export function ModuleStudy({
  module,
  lessons,
  questions,
  flashcards,
  initialLessonSlug,
  initialView,
  initialProgress,
  initialNotes,
  initialAnnotations,
  initialBookmarks,
  initialReviews,
  initialAttempts,
  initialResponses,
}: ModuleStudyProps) {
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const prefs = useStudyPrefs();

  const firstSlug = lessons[0]?.slug ?? "";
  const validInitialSlug =
    initialLessonSlug && lessons.some((lesson) => lesson.slug === initialLessonSlug)
      ? initialLessonSlug
      : firstSlug;

  const [view, setView] = useState<View>(() => normalizeView(initialView));
  const [activeLessonSlug, setActiveLessonSlug] = useState(validInitialSlug);
  const [done, setDone] = useState<Record<string, boolean>>(initialProgress);
  const [notes, setNotes] = useState<Record<string, string>>(initialNotes);
  const [annotations, setAnnotations] = useState<TextAnnotation[]>(initialAnnotations);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set(initialBookmarks));
  const [reviews, setReviews] = useState<Record<string, ReviewData>>(initialReviews);
  const [attempts, setAttempts] = useState<AttemptData[]>(initialAttempts);
  const [responses, setResponses] =
    useState<Record<string, ResponseData>>(initialResponses);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; title: string } | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const noteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const annotationTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const activeLesson =
    lessons.find((lesson) => lesson.slug === activeLessonSlug) ?? lessons[0] ?? null;
  const activeIndex = activeLesson
    ? lessons.findIndex((lesson) => lesson.slug === activeLesson.slug)
    : -1;

  const doneCount = lessons.filter((lesson) => done[lesson.slug]).length;
  const progressPercent = lessons.length
    ? Math.round((doneCount / lessons.length) * 100)
    : 0;
  const dueCount = flashcards.filter((card) => isReviewDue(reviews[card.id])).length;
  const noteCount = Object.values(notes).filter((text) => text.trim()).length;

  const filteredLessons = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return lessons;
    return lessons.filter((lesson) =>
      `${lesson.title} ${lesson.summary ?? ""}`.toLowerCase().includes(query),
    );
  }, [lessons, search]);

  const annotationsByLesson = useMemo(() => {
    const map: Record<string, TextAnnotation[]> = {};
    for (const annotation of annotations) {
      (map[annotation.lessonSlug] ??= []).push(annotation);
    }
    return map;
  }, [annotations]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (view === "lesson") {
      if (activeLessonSlug) params.set("lesson", activeLessonSlug);
    } else {
      params.set("view", view);
    }
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `${pathname}${query ? `?${query}` : ""}`,
    );
  }, [view, activeLessonSlug, pathname]);

  useEffect(() => {
    if (view !== "lesson" || !activeLessonSlug) return;
    void fetch(
      `/api/modules/${encodeURIComponent(module.id)}/lessons/${encodeURIComponent(activeLessonSlug)}/progress`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opened: true }),
      },
    ).catch(() => undefined);
  }, [activeLessonSlug, view, module.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (typing) return;

      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key.toLowerCase() === "f") {
        setFocusMode((current) => !current);
      } else if (event.key === "?") {
        setShortcutsOpen(true);
      } else if (event.key === "Escape") {
        setFocusMode(false);
        setSidebarOpen(false);
        setShortcutsOpen(false);
        setLightbox(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(
    () => () => {
      Object.values(noteTimers.current).forEach(clearTimeout);
      Object.values(annotationTimers.current).forEach(clearTimeout);
    },
    [],
  );

  const updatePrefs = (patch: Partial<StudyPrefs>) => {
    const next = normalizePrefs({ ...loadStudyPrefs(), ...patch });
    saveStudyPrefs(next);
    if (patch.theme) setTheme(next.theme);
    void fetch("/api/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => undefined);
  };

  const updateNote = (slug: string, text: string) => {
    setNotes((current) => ({ ...current, [slug]: text }));
    const timer = noteTimers.current[slug];
    if (timer) clearTimeout(timer);
    noteTimers.current[slug] = setTimeout(() => {
      void fetch(
        `/api/modules/${encodeURIComponent(module.id)}/lessons/${encodeURIComponent(slug)}/note`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        },
      ).catch(() => undefined);
    }, 600);
  };

  const persistAnnotations = (slug: string, list: TextAnnotation[]) => {
    setAnnotations((current) => [
      ...current.filter((annotation) => annotation.lessonSlug !== slug),
      ...list,
    ]);
    const timer = annotationTimers.current[slug];
    if (timer) clearTimeout(timer);
    annotationTimers.current[slug] = setTimeout(() => {
      void fetch(
        `/api/modules/${encodeURIComponent(module.id)}/lessons/${encodeURIComponent(slug)}/annotations`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            annotations: list.map((annotation) => ({
              color: annotation.color,
              note: annotation.note,
              quote: annotation.quote,
              startPath: annotation.startPath,
              startOffset: annotation.startOffset,
              endPath: annotation.endPath,
              endOffset: annotation.endOffset,
            })),
          }),
        },
      ).catch(() => undefined);
    }, 600);
  };

  const addAnnotation = (annotation: TextAnnotation) => {
    const list = [
      ...(annotationsByLesson[annotation.lessonSlug] ?? []),
      annotation,
    ];
    persistAnnotations(annotation.lessonSlug, list);
  };

  const updateAnnotation = (
    id: string,
    patch: { note?: string; color?: TextAnnotationColor },
  ) => {
    const target = annotations.find((annotation) => annotation.id === id);
    if (!target) return;
    const list = (annotationsByLesson[target.lessonSlug] ?? []).map((annotation) =>
      annotation.id === id ? { ...annotation, ...patch } : annotation,
    );
    persistAnnotations(target.lessonSlug, list);
  };

  const deleteAnnotation = (id: string) => {
    const target = annotations.find((annotation) => annotation.id === id);
    if (!target) return;
    const list = (annotationsByLesson[target.lessonSlug] ?? []).filter(
      (annotation) => annotation.id !== id,
    );
    persistAnnotations(target.lessonSlug, list);
  };

  const toggleDone = (slug: string) => {
    const next = !done[slug];
    setDone((current) => ({ ...current, [slug]: next }));
    void fetch(
      `/api/modules/${encodeURIComponent(module.id)}/lessons/${encodeURIComponent(slug)}/progress`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: next }),
      },
    ).catch(() => undefined);
  };

  const toggleBookmark = (slug: string) => {
    const next = new Set(bookmarks);
    const isBookmarked = next.has(slug);
    if (isBookmarked) next.delete(slug);
    else next.add(slug);
    setBookmarks(next);
    void fetch(
      `/api/modules/${encodeURIComponent(module.id)}/lessons/${encodeURIComponent(slug)}/bookmark`,
      { method: isBookmarked ? "DELETE" : "POST" },
    ).catch(() => undefined);
  };

  const gradeCard = (cardId: string, grade: SrsGrade) => {
    const current = reviews[cardId];
    const previous: SrsState | null = current
      ? {
          interval: current.interval,
          ease: current.ease,
          reps: current.reps,
          lapses: current.lapses,
          due: new Date(current.due),
          last: current.last ? new Date(current.last) : null,
        }
      : null;
    const next = gradeFlashcard(previous, grade);
    const optimistic: ReviewData = {
      interval: next.interval,
      ease: next.ease,
      reps: next.reps,
      lapses: next.lapses,
      due: next.due.toISOString(),
      last: next.last?.toISOString() ?? null,
    };
    setReviews((currentReviews) => ({ ...currentReviews, [cardId]: optimistic }));

    void fetch(
      `/api/modules/${encodeURIComponent(module.id)}/flashcards/${encodeURIComponent(cardId)}/review`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade }),
      },
    )
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as {
          review: {
            interval: number;
            ease: number;
            reps: number;
            lapses: number;
            due: string;
            last: string | null;
          };
        };
        setReviews((currentReviews) => ({
          ...currentReviews,
          [cardId]: {
            interval: data.review.interval,
            ease: data.review.ease,
            reps: data.review.reps,
            lapses: data.review.lapses,
            due: data.review.due,
            last: data.review.last,
          },
        }));
      })
      .catch(() => undefined);
  };

  const saveAttempt = (attempt: AttemptData) => {
    setAttempts((current) => [attempt, ...current]);
    setResponses((current) => {
      const next = { ...current };
      for (const answer of attempt.answers) {
        next[answer.questionId] = {
          selectedOption: answer.selectedOption,
          isCorrect: answer.isCorrect,
        };
      }
      return next;
    });
  };

  const openLesson = (slug: string) => {
    setActiveLessonSlug(slug);
    setView("lesson");
    setSidebarOpen(false);
    setSearch("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openView = (nextView: View) => {
    setView(nextView);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrev = () => {
    if (activeIndex > 0) openLesson(lessons[activeIndex - 1].slug);
  };

  const goNext = () => {
    if (activeIndex >= 0 && activeIndex < lessons.length - 1) {
      openLesson(lessons[activeIndex + 1].slug);
    }
  };

  const sidebarContent = (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-teal-500/10 via-card to-card p-4">
        <div className="mb-1 text-[11px] font-medium text-teal-600 dark:text-teal-400">
          {module.eyebrow ?? "ماژول مطالعه"}
        </div>
        <h2 className="text-lg font-bold leading-7">{module.cardTitle}</h2>
        <p className="mt-1 line-clamp-3 text-xs leading-6 text-muted-foreground">
          {module.cardDescription ?? module.description}
        </p>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{toFa(progressPercent)}٪ تکمیل</span>
            <span>
              {toFa(doneCount)} از {toFa(lessons.length)}
            </span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[10px]">
          <div className="rounded-lg bg-background/60 px-1 py-1.5">
            <div className="font-bold text-amber-600 dark:text-amber-400">{toFa(dueCount)}</div>
            <div className="text-muted-foreground">موعددار</div>
          </div>
          <div className="rounded-lg bg-background/60 px-1 py-1.5">
            <div className="font-bold text-teal-600 dark:text-teal-400">{toFa(noteCount)}</div>
            <div className="text-muted-foreground">یادداشت</div>
          </div>
          <div className="rounded-lg bg-background/60 px-1 py-1.5">
            <div className="font-bold text-sky-600 dark:text-sky-400">{toFa(annotations.length)}</div>
            <div className="text-muted-foreground">هایلایت</div>
          </div>
        </div>
      </div>

      <nav className="space-y-1">
        <SidebarButton
          icon={BookOpen}
          label="درس‌ها"
          active={view === "lesson"}
          onClick={() => openView("lesson")}
        />
        <SidebarButton
          icon={FileQuestion}
          label={module.quizNavLabel ?? "آزمون جامع"}
          badge={toFa(questions.length)}
          active={view === "quiz"}
          onClick={() => openView("quiz")}
        />
        <SidebarButton
          icon={Brain}
          label="فلش‌کارت‌ها"
          badge={toFa(dueCount)}
          active={view === "flashcards"}
          onClick={() => openView("flashcards")}
        />
        <SidebarButton
          icon={NotebookPen}
          label="یادداشت‌ها"
          badge={toFa(noteCount)}
          active={view === "notes"}
          onClick={() => openView("notes")}
        />
        <SidebarButton
          icon={Bookmark}
          label="نشان‌شده‌ها"
          badge={toFa(bookmarks.size)}
          active={view === "bookmarks"}
          onClick={() => openView("bookmarks")}
        />
        <SidebarButton
          icon={Images}
          label="گالری صفحات"
          active={view === "gallery"}
          onClick={() => openView("gallery")}
        />
        <SidebarButton
          icon={FileText}
          label="منابع"
          active={view === "references"}
          onClick={() => openView("references")}
        />
      </nav>

      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-muted-foreground">فهرست درس‌ها</span>
          <span className="text-[10px] text-muted-foreground">
            {toFa(filteredLessons.length)}
          </span>
        </div>
        <div className="max-h-[calc(100vh-430px)] space-y-1 overflow-y-auto pl-1">
          {filteredLessons.map((lesson) => {
            const isActive = view === "lesson" && lesson.slug === activeLesson?.slug;
            return (
              <button
                key={lesson.slug}
                type="button"
                onClick={() => openLesson(lesson.slug)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-right text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {done[lesson.slug] ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/30" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {cleanTitle(lesson.title)}
                  </span>
                  {lesson.mins && (
                    <span className="block text-[10px] text-muted-foreground">
                      {lesson.mins}
                    </span>
                  )}
                </span>
                {bookmarks.has(lesson.slug) && (
                  <Bookmark className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                )}
              </button>
            );
          })}
          {filteredLessons.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              درسی با این عبارت پیدا نشد.
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <AppShell>
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        {!focusMode && (
          <aside className="hidden w-72 shrink-0 lg:block">
            <div className="sticky top-24">{sidebarContent}</div>
          </aside>
        )}

        <main className="min-w-0 flex-1">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
                aria-label="فهرست ماژول"
              >
                <Menu className="h-4 w-4" />
              </button>
              <Link
                href="/modules"
                className="inline-flex shrink-0 items-center gap-1 text-muted-foreground hover:text-primary"
              >
                <ArrowRight className="h-4 w-4" />
                ماژول‌ها
              </Link>
              <span className="text-muted-foreground/40">/</span>
              <span className="truncate font-medium">{module.cardTitle}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && filteredLessons[0]) {
                      openLesson(filteredLessons[0].slug);
                    }
                  }}
                  placeholder="جستجو در درس‌ها…"
                  className="h-9 w-40 rounded-xl border border-input bg-background pr-8 pl-2 text-xs outline-none focus:border-primary sm:w-52"
                />
              </div>
              <button
                type="button"
                onClick={() => setFocusMode((current) => !current)}
                className={cn(
                  "rounded-xl border p-2 transition-colors",
                  focusMode
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
                title="حالت تمرکز (F)"
              >
                {focusMode ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-muted"
                title="تنظیمات مطالعه"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShortcutsOpen(true)}
                className="hidden rounded-xl border border-border p-2 text-muted-foreground hover:bg-muted sm:block"
                title="میان‌برهای صفحه‌کلید"
              >
                <Keyboard className="h-4 w-4" />
              </button>
            </div>
          </div>

          {view === "lesson" && activeLesson && (
            <LessonReader
              lesson={activeLesson}
              lessonIndex={activeIndex}
              total={lessons.length}
              isDone={Boolean(done[activeLesson.slug])}
              isBookmarked={bookmarks.has(activeLesson.slug)}
              note={notes[activeLesson.slug] ?? ""}
              annotations={annotationsByLesson[activeLesson.slug] ?? []}
              searchQuery={search.trim()}
              prefs={prefs}
              onPrev={goPrev}
              onNext={goNext}
              onToggleDone={() => toggleDone(activeLesson.slug)}
              onToggleBookmark={() => toggleBookmark(activeLesson.slug)}
              onNoteChange={(text) => updateNote(activeLesson.slug, text)}
              onAddAnnotation={addAnnotation}
              onUpdateAnnotation={updateAnnotation}
              onDeleteAnnotation={deleteAnnotation}
              onOpenQuiz={() => openView("quiz")}
            />
          )}

          {view === "quiz" && (
            <ModuleQuiz
              moduleId={module.id}
              title={module.quizTitle ?? "آزمون جامع"}
              description={
                module.quizDescription ??
                "سؤال‌ها را تک‌به‌تک یا همه را یکجا پاسخ بده. هر پاسخ، علت درست/نادرست بودن گزینه‌ها را نشان می‌دهد."
              }
              questions={questions}
              lessons={lessons}
              attempts={attempts}
              responses={responses}
              onAttemptSaved={saveAttempt}
            />
          )}

          {view === "flashcards" && (
            <ModuleFlashcards
              flashcards={flashcards}
              reviews={reviews}
              onGrade={gradeCard}
            />
          )}

          {view === "notes" && (
            <ModuleNotes
              moduleTitle={module.cardTitle}
              lessons={lessons}
              notes={notes}
              annotations={annotations}
              onOpenLesson={openLesson}
              onDeleteNote={(slug) => updateNote(slug, "")}
              onDeleteAnnotation={deleteAnnotation}
            />
          )}

          {view === "bookmarks" && (
            <ModuleBookmarks
              lessons={lessons}
              bookmarks={Array.from(bookmarks)}
              onOpenLesson={openLesson}
              onRemove={toggleBookmark}
            />
          )}

          {view === "gallery" && (
            <ModuleGallery
              gallery={module.gallery}
              onOpenImage={(src, title) => setLightbox({ src, title })}
            />
          )}

          {view === "references" && (
            <ModuleReferences
              title={module.referencesTitle}
              intro={module.referencesIntro}
              html={module.referencesHtml}
            />
          )}

          {module.footer && (
            <p className="mx-auto mt-8 max-w-3xl border-t border-border/60 pt-4 text-center text-[11px] leading-6 text-muted-foreground">
              {module.footer}
            </p>
          )}
        </main>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute right-0 top-0 h-full w-[min(330px,92vw)] overflow-y-auto border-l border-border bg-background p-4 shadow-2xl">
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="بستن"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      <StudySettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        prefs={prefs}
        onChange={updatePrefs}
      />

      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <ImageLightbox image={lightbox} onClose={() => setLightbox(null)} />
    </AppShell>
  );
}

function SidebarButton({
  icon: Icon,
  label,
  badge,
  active,
  onClick,
}: {
  icon: typeof BookOpen;
  label: string;
  badge?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1 text-right">{label}</span>
      {badge && (
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {badge}
        </span>
      )}
    </button>
  );
}

function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const shortcuts = [
    { keys: "→", label: "بخش قبلی" },
    { keys: "←", label: "بخش بعدی" },
    { keys: "B", label: "نشان کردن درس" },
    { keys: "N", label: "رفتن به یادداشت" },
    { keys: "F", label: "حالت تمرکز" },
    { keys: "/", label: "جستجو" },
    { keys: "?", label: "همین راهنما" },
    { keys: "Esc", label: "بستن پنجره‌ها" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>میان‌برهای صفحه‌کلید</DialogTitle>
          <DialogDescription>
            در صفحه درس از این کلیدها برای مطالعه سریع‌تر استفاده کنید.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.keys}
              className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground">{shortcut.label}</span>
              <kbd className="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-xs">
                {shortcut.keys}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
