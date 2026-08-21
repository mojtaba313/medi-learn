"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  Eraser,
  Eye,
  EyeOff,
  Hand,
  Highlighter,
  Keyboard,
  ListChecks,
  ListVideo,
  MousePointer2,
  Pen,
  RotateCcw,
  RotateCw,
  ScrollText,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { AnnotationCanvas } from "@/components/study/annotation-canvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStudyStore } from "@/lib/store";
import { cn, toFa } from "@/lib/utils";
import { safeFetch } from "@/lib/client/safe-fetch";
import { PEN_COLORS } from "@/lib/constants";
import type { AnnotationToolType } from "@/lib/annotations";

interface StudyCourse {
  id: string;
  title: string;
  category: string;
  pages: { pageNumber: number; imageUrl: string; width: number; height: number }[];
  questions: {
    id: string;
    pageNumber: number | null;
    text: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctOption: string;
    explanation: string | null;
    tags: string[];
    response: { selectedOption: string | null; isCorrect: boolean | null } | null;
  }[];
}

const highlightColors = [
  { id: "yellow", value: "#facc15", label: "زرد" },
  { id: "blue", value: "#38bdf8", label: "آبی" },
  { id: "green", value: "#4ade80", label: "سبز" },
  { id: "red", value: "#f87171", label: "قرمز" },
] as const;

export function StudyViewer({
  course,
  userName,
  isAdmin,
}: {
  course: StudyCourse;
  userName: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const tool = useStudyStore((s) => s.tool);
  const setTool = useStudyStore((s) => s.setTool);
  const color = useStudyStore((s) => s.color);
  const setColor = useStudyStore((s) => s.setColor);
  const penColor = useStudyStore((s) => s.penColor);
  const setPenColor = useStudyStore((s) => s.setPenColor);
  const penSize = useStudyStore((s) => s.penSize);
  const setPenSize = useStudyStore((s) => s.setPenSize);
  const highlightSize = useStudyStore((s) => s.highlightSize);
  const setHighlightSize = useStudyStore((s) => s.setHighlightSize);
  const showAnnotations = useStudyStore((s) => s.showAnnotations);
  const toggleAnnotations = useStudyStore((s) => s.toggleAnnotations);
  const currentPage = useStudyStore((s) => s.currentPage);
  const setCurrentPage = useStudyStore((s) => s.setCurrentPage);
  const zoom = useStudyStore((s) => s.zoom);
  const setZoom = useStudyStore((s) => s.setZoom);
  const undo = useStudyStore((s) => s.undo);
  const redo = useStudyStore((s) => s.redo);
  const canUndo = useStudyStore((s) => s.canUndo());
  const canRedo = useStudyStore((s) => s.canRedo());
  const savedPages = useStudyStore((s) => s.savedPages);

  const [quizPanelOpen, setQuizPanelOpen] = useState(true);
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<string, string>>({});

  const currentPageData = course.pages.find((p) => p.pageNumber === currentPage);

  useEffect(() => {
    setCurrentPage(course.pages[0]?.pageNumber ?? 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id]);

  const pageQuestions = useMemo(
    () => course.questions.filter((q) => q.pageNumber === currentPage),
    [course.questions, currentPage]
  );

  const goToPage = useCallback(
    (page: number) => {
      const max = course.pages.length;
      const next = Math.min(Math.max(page, 1), max);
      setCurrentPage(next);
    },
    [course.pages.length, setCurrentPage]
  );

  const goToPageNumber = useCallback(
    (pageNumber: number) => {
      if (course.pages.some((p) => p.pageNumber === pageNumber)) {
        setCurrentPage(pageNumber);
      }
    },
    [course.pages, setCurrentPage]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      if (e.key === "ArrowLeft") goToPage(currentPage - 1);
      if (e.key === "ArrowRight") goToPage(currentPage + 1);
      if (e.key === "Escape") router.push("/dashboard");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentPage, goToPage, router]);

  const annotatedRatio = course.pages.length > 0 ? (savedPages.size / course.pages.length) * 100 : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        course={course}
        userName={userName}
        isAdmin={isAdmin}
        onToggleQuiz={() => setQuizPanelOpen((o) => !o)}
      />

      <Toolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        penColor={penColor}
        setPenColor={setPenColor}
        penSize={penSize}
        setPenSize={setPenSize}
        highlightSize={highlightSize}
        setHighlightSize={setHighlightSize}
        showAnnotations={showAnnotations}
        toggleAnnotations={toggleAnnotations}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        zoom={zoom}
        setZoom={setZoom}
      />

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-56 shrink-0 flex-col border-l border-border/60 bg-card/50 md:flex">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <ScrollText className="h-4 w-4 text-teal-500" />
              صفحات جزوه
            </span>
            <Badge variant="secondary">{toFa(course.pages.length)}</Badge>
          </div>
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-3 gap-2 p-3">
              {course.pages.map((page) => {
                const isActive = page.pageNumber === currentPage;
                const isSaved = savedPages.has(page.pageNumber);
                return (
                  <button
                    key={page.pageNumber}
                    onClick={() => goToPageNumber(page.pageNumber)}
                    className={cn(
                      "group relative overflow-hidden rounded-md border transition-all",
                      isActive
                        ? "border-teal-500 ring-2 ring-teal-500/40"
                        : "border-border/60 hover:border-teal-500/50"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={page.imageUrl}
                      alt={`صفحه ${page.pageNumber}`}
                      className="aspect-[3/4] w-full object-cover"
                      loading="lazy"
                    />
                    <span className="absolute bottom-0.5 right-0.5 rounded bg-background/80 px-1 text-[10px] font-medium backdrop-blur">
                      {toFa(page.pageNumber)}
                    </span>
                    {isSaved && (
                      <span className="absolute left-0.5 top-0.5 h-2 w-2 rounded-full bg-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </aside>

        <main className="relative flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 items-stretch overflow-hidden">
            <div className="relative min-w-0 flex-1">
              {currentPageData ? (
                <AnnotationCanvas
                  key={currentPageData.pageNumber}
                  courseId={course.id}
                  pageNumber={currentPageData.pageNumber}
                  imageUrl={currentPageData.imageUrl}
                  naturalWidth={currentPageData.width}
                  naturalHeight={currentPageData.height}
                  className="bg-muted/40"
                />
              ) : null}
            </div>

            <AnimatePresence>
              {quizPanelOpen && (
                <motion.aside
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 380, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 30 }}
                  className="hidden shrink-0 overflow-hidden border-r border-border/60 bg-card/60 lg:block"
                >
                  <div className="flex h-full w-[380px] flex-col">
                    <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <ListVideo className="h-4 w-4 text-teal-500" />
                        سوالات این صفحه
                      </span>
                      <Badge variant="secondary">{toFa(pageQuestions.length)}</Badge>
                    </div>
                    <ScrollArea className="flex-1">
                      <PageQuestionsPanel
                        questions={pageQuestions}
                        answered={answeredQuestions}
                        setAnswered={setAnsweredQuestions}
                      />
                    </ScrollArea>
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>
          </div>

          <BottomBar
            currentPage={currentPage}
            totalPages={course.pages.length}
            onNavigate={goToPage}
            onSelectPage={goToPageNumber}
            pages={course.pages.map((p) => p.pageNumber)}
            progress={annotatedRatio}
          />
        </main>
      </div>

      <div className="fixed bottom-20 right-4 z-40 rounded-full bg-card/90 p-1 shadow-lg backdrop-blur lg:hidden">
        <Button
          size="iconSm"
          variant="ghost"
          onClick={() => setQuizPanelOpen((o) => !o)}
          title="سوالات صفحه"
        >
          <ListVideo className="h-4 w-4" />
        </Button>
      </div>

      <AnimatePresence>
        {quizPanelOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="fixed inset-x-0 bottom-0 z-40 max-h-[60vh] overflow-y-auto rounded-t-2xl border-t border-border bg-card/95 p-4 backdrop-blur lg:hidden"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <ListVideo className="h-4 w-4 text-teal-500" />
                سوالات این صفحه
              </span>
              <Button size="iconSm" variant="ghost" onClick={() => setQuizPanelOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <PageQuestionsPanel
              questions={pageQuestions}
              answered={answeredQuestions}
              setAnswered={setAnsweredQuestions}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TopBar({
  course,
  userName,
  isAdmin,
  onToggleQuiz,
}: {
  course: StudyCourse;
  userName: string;
  isAdmin: boolean;
  onToggleQuiz: () => void;
}) {
  return (
    <div className="flex h-14 items-center justify-between border-b border-border/60 bg-card/80 px-4 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <Link
          href={isAdmin ? "/admin" : "/dashboard"}
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="h-5 w-5 rotate-180" />
        </Link>
        <div className="flex flex-col">
          <span className="font-semibold leading-tight">{course.title}</span>
          <span className="text-xs text-muted-foreground">
            مطالعه {userName}
          </span>
        </div>
        <Badge variant="secondary">{course.category}</Badge>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm" className="rounded-full gap-2">
          <Link href={`/study/${course.id}/sample`}>
            <ListChecks className="h-4 w-4" />
            <span className="hidden sm:inline">نمونه سوالات</span>
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full gap-2"
          onClick={onToggleQuiz}
        >
          <ListVideo className="h-4 w-4" />
          <span className="hidden sm:inline">سوالات صفحه</span>
        </Button>
      </div>
    </div>
  );
}

function Toolbar({
  tool,
  setTool,
  color,
  setColor,
  penColor,
  setPenColor,
  penSize,
  setPenSize,
  highlightSize,
  setHighlightSize,
  showAnnotations,
  toggleAnnotations,
  undo,
  redo,
  canUndo,
  canRedo,
  zoom,
  setZoom,
}: {
  tool: AnnotationToolType;
  setTool: (t: AnnotationToolType) => void;
  color: string;
  setColor: (c: string) => void;
  penColor: string;
  setPenColor: (c: string) => void;
  penSize: number;
  setPenSize: (n: number) => void;
  highlightSize: number;
  setHighlightSize: (n: number) => void;
  showAnnotations: boolean;
  toggleAnnotations: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  setZoom: (n: number) => void;
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-card/60 px-3 py-2 backdrop-blur-xl">
        <div className="flex items-center gap-1.5">
          <ToolButton
            active={tool === "highlight"}
            onClick={() => setTool("highlight")}
            label="هایلایت"
            icon={<Highlighter className="h-4 w-4" />}
          />
          <ToolButton
            active={tool === "pen"}
            onClick={() => setTool("pen")}
            label="قلم"
            icon={<Pen className="h-4 w-4" />}
          />
          <ToolButton
            active={tool === "eraser"}
            onClick={() => setTool("eraser")}
            label="پاک‌کن"
            icon={<Eraser className="h-4 w-4" />}
          />
          <ToolButton
            active={tool === "select"}
            onClick={() => setTool("select")}
            label="انتخاب و جابه‌جایی"
            icon={<MousePointer2 className="h-4 w-4" />}
          />
          <ToolButton
            active={tool === "pan"}
            onClick={() => setTool("pan")}
            label="جابه‌جایی صفحه"
            icon={<Hand className="h-4 w-4" />}
          />

          <div className="mx-2 h-6 w-px bg-border" />

          {tool === "highlight" && (
            <div className="flex items-center gap-1.5">
              {highlightColors.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setColor(c.id)}
                  title={c.label}
                  className={cn(
                    "h-6 w-6 rounded-full transition-transform hover:scale-110",
                    color === c.id && "ring-2 ring-offset-2 ring-offset-card"
                  )}
                  style={{ backgroundColor: c.value, color: c.value }}
                />
              ))}
              <div className="mr-1 flex items-center gap-0.5">
                {[12, 24, 40].map((s) => (
                  <button
                    key={s}
                    onClick={() => setHighlightSize(s)}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium",
                      highlightSize === s ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    )}
                  >
                    {toFa(Math.round(s / 8))}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tool === "pen" && (
            <div className="flex items-center gap-1.5">
              {PEN_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setPenColor(c)}
                  className={cn(
                    "h-6 w-6 rounded-full transition-transform hover:scale-110",
                    penColor === c && "ring-2 ring-offset-2 ring-offset-card"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
              <div className="mr-1 flex items-center gap-0.5">
                {[2, 4, 6].map((s) => (
                  <button
                    key={s}
                    onClick={() => setPenSize(s)}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium",
                      penSize === s ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    )}
                  >
                    {toFa(s)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <ToolButton
            onClick={undo}
            disabled={!canUndo}
            label="بازگردانی (Ctrl+Z)"
            icon={<RotateCcw className="h-4 w-4" />}
          />
          <ToolButton
            onClick={redo}
            disabled={!canRedo}
            label="انجام مجدد (Ctrl+Y)"
            icon={<RotateCw className="h-4 w-4" />}
          />
          <ToolButton
            onClick={toggleAnnotations}
            active={showAnnotations}
            label={showAnnotations ? "نمایش حاشیه‌نویسی‌ها" : "پنهان‌کردن حاشیه‌نویسی‌ها"}
            icon={showAnnotations ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          />
          <div className="mx-2 h-6 w-px bg-border" />
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => setZoom(zoom - 0.25)}
            disabled={zoom <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="w-10 text-center text-xs font-medium text-muted-foreground">
            {toFa(Math.round(zoom * 100))}٪
          </span>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => setZoom(zoom + 0.25)}
            disabled={zoom >= 3}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="mx-1 hidden items-center gap-1 rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground sm:flex">
            <Keyboard className="h-3 w-3" />
            ← → برای جابه‌جایی
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function ToolButton({
  active,
  onClick,
  label,
  icon,
  disabled,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? "default" : "ghost"}
          size="iconSm"
          onClick={onClick}
          disabled={disabled}
          className={cn("rounded-lg", active && "shadow-md")}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function BottomBar({
  currentPage,
  totalPages,
  onNavigate,
  onSelectPage,
  pages,
  progress,
}: {
  currentPage: number;
  totalPages: number;
  onNavigate: (page: number) => void;
  onSelectPage: (page: number) => void;
  pages: number[];
  progress: number;
}) {
  const idx = pages.indexOf(currentPage) + 1;
  return (
    <div className="flex h-14 items-center justify-between gap-3 border-t border-border/60 bg-card/80 px-4 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="iconSm"
          onClick={() => onNavigate(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="hidden sm:flex">
          <Select
            value={String(currentPage)}
            onValueChange={(v) => onSelectPage(Number(v))}
          >
            <SelectTrigger className="h-8 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pages.map((p) => (
                <SelectItem key={p} value={String(p)}>
                  صفحه {toFa(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="iconSm"
          onClick={() => onNavigate(currentPage + 1)}
          disabled={idx >= totalPages}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground">
          {toFa(idx)} از {toFa(totalPages)}
        </span>
      </div>

      <div className="flex flex-1 items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full rounded-full bg-gradient-to-l from-teal-500 to-cyan-500"
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {toFa(Math.round(progress))}٪ مطالعه شده
        </span>
      </div>
    </div>
  );
}

function PageQuestionsPanel({
  questions,
  answered,
  setAnswered,
}: {
  questions: StudyCourse["questions"];
  answered: Record<string, string>;
  setAnswered: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const [results, setResults] = useState<Record<string, boolean>>({});

  async function answer(questionId: string, option: string) {
    setAnswered((prev) => ({ ...prev, [questionId]: option }));
    try {
      const res = await safeFetch(`/api/questions/${questionId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedOption: option, timeSpentMs: 0 }),
      });
      const data = await res.json();
      if (res.ok) {
        setResults((prev) => ({ ...prev, [questionId]: data.isCorrect }));
      }
    } catch {
      toast.error("خطا در ثبت پاسخ");
    }
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <ListVideo className="mb-3 h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm font-medium">سوالی برای این صفحه ثبت نشده است</p>
        <p className="mt-1 text-xs text-muted-foreground">
          برای این صفحه هنوز سوالی طراحی نشده است.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {questions.map((q, i) => {
        const selected = answered[q.id] ?? q.response?.selectedOption ?? null;
        const result = results[q.id];
        const options = [
          { key: "A", text: q.optionA },
          { key: "B", text: q.optionB },
          { key: "C", text: q.optionC },
          { key: "D", text: q.optionD },
        ];

        return (
          <div key={q.id} className="rounded-xl border border-border/60 bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <Badge variant="secondary">سوال {toFa(i + 1)}</Badge>
              {result === true && <Badge variant="success">صحیح</Badge>}
              {result === false && <Badge variant="destructive">اشتباه</Badge>}
              {result === undefined && selected !== null && (
                <Badge variant="secondary">پاسخ داده شد</Badge>
              )}
            </div>
            <p className="mb-3 text-sm leading-6">{q.text}</p>
            <div className="space-y-1.5">
              {options.map((opt) => {
                const isSelected = selected === opt.key;
                const showResult = result !== undefined;
                const isCorrect = opt.key === q.correctOption;
                return (
                  <button
                    key={opt.key}
                    onClick={() => answer(q.id, opt.key)}
                    disabled={result !== undefined}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-right text-sm transition-all",
                      showResult && isCorrect
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : showResult && isSelected && !isCorrect
                        ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400"
                        : isSelected
                        ? "border-teal-500 bg-teal-500/10"
                        : "border-border hover:border-teal-500/40 hover:bg-accent"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        showResult && isCorrect
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {toFa(opt.key === "A" ? "۱" : opt.key === "B" ? "۲" : opt.key === "C" ? "۳" : "۴")}
                    </span>
                    <span className="line-clamp-2">{opt.text}</span>
                  </button>
                );
              })}
            </div>
            {result !== undefined && q.explanation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 rounded-lg border border-teal-500/30 bg-teal-500/10 p-3 text-xs leading-5"
              >
                <span className="mb-1 block font-bold text-teal-600 dark:text-teal-400">
                  توضیح:
                </span>
                {q.explanation}
              </motion.div>
            )}
          </div>
        );
      })}
    </div>
  );
}