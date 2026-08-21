"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  BarChart3,
  BookOpenCheck,
  Filter,
  Flame,
  Loader2,
  Search,
  Shuffle,
  Target,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, toFa } from "@/lib/utils";
import { QuestionCard } from "@/components/quiz/question-card";
import { QuizResults } from "@/components/quiz/quiz-results";
import { Analytics } from "@/components/quiz/analytics";

interface QuizQuestion {
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
  response: {
    selectedOption: string | null;
    isCorrect: boolean | null;
    timeSpentMs: number;
    answeredAt: string;
  } | null;
}

type QuizMode = "study" | "exam" | "random" | "weak";
type AnswerStatus = "all" | "answered" | "unanswered" | "correct" | "incorrect";

interface QuizAttemptData {
  id: string;
  mode: string;
  score: number;
  total: number;
  correct: number;
  incorrect: number;
  skipped: number;
  createdAt: string;
}

export function QuizPage({
  courseId,
  courseTitle,
}: {
  courseId: string;
  courseTitle: string;
  userId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [pageNumbers, setPageNumbers] = useState<number[]>([]);
  const [attempts, setAttempts] = useState<QuizAttemptData[]>([]);
  const [, setCourseData] = useState({ id: courseId, title: courseTitle, totalPages: 0 });

  const [mode, setMode] = useState<QuizMode>("study");
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>({});
  const [questionStart, setQuestionStart] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [showResults, setShowResults] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AnswerStatus>("all");
  const [pageFrom, setPageFrom] = useState<string>("all");
  const [pageTo, setPageTo] = useState<string>("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/quiz?courseId=${courseId}`, { cache: "no-store" });
        if (!res.ok) throw new Error("خطا در دریافت سوالات");
        const data = await res.json();
        setQuestions(data.questions);
        setPageNumbers(data.pageNumbers);
        setAttempts(data.attempts);
        setCourseData(data.course);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "خطا");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId]);

  const allQuestions = useMemo(() => questions, [questions]);

  const filteredQuestions = useMemo(() => {
    return allQuestions.filter((q) => {
      if (search && !q.text.toLowerCase().includes(search.toLowerCase()) && !q.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))) {
        return false;
      }
      if (pageFrom !== "all" && (q.pageNumber === null || q.pageNumber < Number(pageFrom))) return false;
      if (pageTo !== "all" && (q.pageNumber === null || q.pageNumber > Number(pageTo))) return false;
      const isAnswered = !!q.response?.selectedOption;
      const isCorrect = !!q.response?.isCorrect;
      switch (statusFilter) {
        case "answered":
          return isAnswered;
        case "unanswered":
          return !isAnswered;
        case "correct":
          return isCorrect;
        case "incorrect":
          return isAnswered && !isCorrect;
        default:
          return true;
      }
    });
  }, [allQuestions, search, pageFrom, pageTo, statusFilter]);

  const weakQuestions = useMemo(
    () => allQuestions.filter((q) => q.response?.selectedOption && !q.response.isCorrect),
    [allQuestions]
  );

  const startQuiz = useCallback(() => {
    let pool: QuizQuestion[] = [];
    if (mode === "weak") pool = weakQuestions;
    else pool = [...filteredQuestions];

    if (pool.length === 0) {
      toast.error("سوالی برای این حالت یافت نشد");
      return;
    }
    if (mode === "random") {
      pool = [...pool].sort(() => Math.random() - 0.5);
    }

    const shuffled: QuizQuestion[] = mode === "random" ? [...pool].sort(() => Math.random() - 0.5) : pool;
    setQuestions(shuffled);
    setAnswers({});
    setTimeSpent({});
    setRevealed({});
    setStarted(true);
    setFinished(false);
    setShowResults(false);
    setQuestionStart({});
  }, [mode, filteredQuestions, weakQuestions]);

  const finishQuiz = useCallback(() => {
    setFinished(true);
    setShowResults(true);
  }, []);

  useEffect(() => {
    if (!started || finished) return;
    const interval = setInterval(() => {
      setQuestionStart((prev) => {
        const next = { ...prev };
        for (const q of questions) {
          if (!answers[q.id]) {
            next[q.id] = (next[q.id] ?? 0) + 1;
          }
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [started, finished, questions, answers]);

  useEffect(() => {
    if (!started) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !finished) {
        e.preventDefault();
        const unanswered = questions.some((q) => !answers[q.id]);
        if (!unanswered) finishQuiz();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [started, finished, questions, answers, finishQuiz]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const payload = questions.map((q) => ({
        questionId: q.id,
        selectedOption: answers[q.id] ?? null,
        isCorrect: answers[q.id] ? answers[q.id] === q.correctOption : null,
        timeSpentMs: (timeSpent[q.id] ?? 0) * 1000,
      }));

      const res = await fetch("/api/quiz/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          mode: mode.toUpperCase(),
          answers: payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در ثبت آزمون");

      setTimeSpent((prev) => {
        const next = { ...prev };
        for (const q of questions) {
          next[q.id] = (next[q.id] ?? 0) + (questionStart[q.id] ?? 0);
        }
        return next;
      });
      finishQuiz();
      toast.success("آزمون ثبت شد");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ثبت آزمون");
    } finally {
      setSubmitting(false);
    }
  }

  const totalCorrect = questions.filter((q) => answers[q.id] && answers[q.id] === q.correctOption).length;
  const totalIncorrect = questions.filter((q) => answers[q.id] && answers[q.id] !== q.correctOption).length;
  const unansweredCount = questions.filter((q) => !answers[q.id]).length;
  const totalTime = questions.reduce((s, q) => s + (timeSpent[q.id] ?? 0), 0);
  const percent = questions.length > 0 ? Math.round((totalCorrect / questions.length) * 100) : 0;

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">آزمون {courseTitle}</h1>
            <p className="mt-1 text-muted-foreground">
              {toFa(allQuestions.length)} سوال • {toFa(pageNumbers.length)} صفحه
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setShowAnalytics((a) => !a)}
            >
              <BarChart3 className="ml-2" />
              تحلیل عملکرد
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {showAnalytics && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Analytics
                questions={allQuestions}
                attempts={attempts}
                pageNumbers={pageNumbers}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {!started ? (
          <SetupScreen
            mode={mode}
            setMode={setMode}
            questions={allQuestions}
            filtered={filteredQuestions}
            weakCount={weakQuestions.length}
            pageNumbers={pageNumbers}
            search={search}
            setSearch={setSearch}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            pageFrom={pageFrom}
            setPageFrom={setPageFrom}
            pageTo={pageTo}
            setPageTo={setPageTo}
            onStart={startQuiz}
          />
        ) : showResults ? (
          <QuizResults
            correctCount={totalCorrect}
            incorrectCount={totalIncorrect}
            unansweredCount={unansweredCount}
            percent={percent}
            totalTime={totalTime}
            onRetry={() => {
              setStarted(false);
              setShowResults(false);
              setFinished(false);
            }}
            onReview={() => {
              setShowResults(false);
              setRevealed({});
            }}
          />
        ) : (
          <ActiveQuiz
            questions={questions}
            answers={answers}
            setAnswers={setAnswers}
            revealed={revealed}
            setRevealed={setRevealed}
            mode={mode}
            progress={totalCorrect + totalIncorrect + unansweredCount}
            total={questions.length}
            onFinish={handleSubmit}
            submitting={submitting}
            unanswered={unansweredCount}
            onExit={() => {
              setStarted(false);
              setFinished(false);
            }}
          />
        )}
      </main>
    </AppShell>
  );
}

function SetupScreen({
  mode,
  setMode,
  questions,
  filtered,
  weakCount,
  pageNumbers,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  pageFrom,
  setPageFrom,
  pageTo,
  setPageTo,
  onStart,
}: {
  mode: QuizMode;
  setMode: (m: QuizMode) => void;
  questions: QuizQuestion[];
  filtered: QuizQuestion[];
  weakCount: number;
  pageNumbers: number[];
  search: string;
  setSearch: (s: string) => void;
  statusFilter: AnswerStatus;
  setStatusFilter: (s: AnswerStatus) => void;
  pageFrom: string;
  setPageFrom: (s: string) => void;
  pageTo: string;
  setPageTo: (s: string) => void;
  onStart: () => void;
}) {
  const modes: { id: QuizMode; title: string; desc: string; icon: typeof Target }[] = [
    {
      id: "study",
      title: "حالت مطالعه",
      desc: "پاسخ و توضیح هر سوال بلافاصله نمایش داده می‌شود",
      icon: BookOpenCheck,
    },
    {
      id: "exam",
      title: "حالت آزمون",
      desc: "پاسخ‌ها در پایان آزمون نمایش داده می‌شود",
      icon: Target,
    },
    {
      id: "random",
      title: "حالت تصادفی",
      desc: "سوالات به‌صورت تصادفی مرتب می‌شوند",
      icon: Shuffle,
    },
    {
      id: "weak",
      title: "نقاط ضعف",
      desc: "فقط سوالاتی که قبلاً اشتباه پاسخ داده‌اید",
      icon: Flame,
    },
  ];

  const answeredCount = questions.filter((q) => q.response?.selectedOption).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {modes.map((m) => (
          <motion.button
            key={m.id}
            whileHover={{ y: -3 }}
            onClick={() => setMode(m.id)}
            className={cn(
              "rounded-2xl border p-4 text-right transition-all",
              mode === m.id
                ? "border-teal-500 bg-teal-500/10 shadow-lg shadow-teal-500/10"
                : "border-border bg-card hover:border-teal-500/40"
            )}
          >
            <m.icon
              className={cn(
                "mb-3 h-6 w-6",
                mode === m.id ? "text-teal-500" : "text-muted-foreground"
              )}
            />
            <p className="mb-1 font-semibold">{m.title}</p>
            <p className="text-xs leading-5 text-muted-foreground">{m.desc}</p>
            {m.id === "weak" && (
              <Badge className="mt-2" variant="warning">
                {toFa(weakCount)} سوال
              </Badge>
            )}
          </motion.button>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Filter className="h-4 w-4 text-teal-500" />
            <span className="font-semibold">فیلتر سوالات</span>
            <Badge variant="secondary" className="mr-auto">
              {toFa(filtered.length)} سوال قابل نمایش
            </Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو..."
                className="pr-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AnswerStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="وضعیت پاسخ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="answered">پاسخ داده شده ({toFa(answeredCount)})</SelectItem>
                <SelectItem value="unanswered">پاسخ نداده ({toFa(questions.length - answeredCount)})</SelectItem>
                <SelectItem value="correct">پاسخ صحیح</SelectItem>
                <SelectItem value="incorrect">پاسخ اشتباه</SelectItem>
              </SelectContent>
            </Select>
            <Select value={pageFrom} onValueChange={setPageFrom}>
              <SelectTrigger>
                <SelectValue placeholder="از صفحه" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه صفحات</SelectItem>
                {pageNumbers.map((p) => (
                  <SelectItem key={p} value={String(p)}>
                    از صفحه {toFa(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={pageTo} onValueChange={setPageTo}>
              <SelectTrigger>
                <SelectValue placeholder="تا صفحه" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه صفحات</SelectItem>
                {pageNumbers.map((p) => (
                  <SelectItem key={p} value={String(p)}>
                    تا صفحه {toFa(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 sm:flex-row"
      >
        <div>
          <p className="text-lg font-bold">{toFa(filtered.length)} سوال آماده آزمون</p>
          <p className="text-sm text-muted-foreground">
            {mode === "study" && "پاسخ هر سوال بلافاصله نمایش داده می‌شود"}
            {mode === "exam" && "نتایج در پایان آزمون نمایش داده می‌شود"}
            {mode === "random" && "سوالات به‌صورت تصادفی مرتب می‌شوند"}
            {mode === "weak" && `فقط ${toFa(weakCount)} سوال اشتباه‌پاسخ‌داده‌شده`}
          </p>
        </div>
        <Button size="lg" className="rounded-2xl px-8" onClick={onStart} disabled={filtered.length === 0}>
          <Target className="ml-2" />
          شروع آزمون
        </Button>
      </motion.div>
    </div>
  );
}

function ActiveQuiz({
  questions,
  answers,
  setAnswers,
  revealed,
  setRevealed,
  mode,
  progress,
  total,
  onFinish,
  submitting,
  unanswered,
  onExit,
}: {
  questions: QuizQuestion[];
  answers: Record<string, string>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  revealed: Record<string, boolean>;
  setRevealed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  mode: QuizMode;
  progress: number;
  total: number;
  onFinish: () => void;
  submitting: boolean;
  unanswered: number;
  onExit: () => void;
}) {
  const [current, setCurrent] = useState(0);
  const question = questions[current];
  const isAnswered = !!answers[question?.id];

  function handleAnswer(option: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: option }));
    if (mode === "study") {
      setRevealed((prev) => ({ ...prev, [question.id]: true }));
    }
    setTimeout(() => {
      if (current < questions.length - 1) {
        setCurrent((c) => c + 1);
      } else if (mode === "study") {
        onFinish();
      }
    }, 450);
  }

  function goNext() {
    if (current < questions.length - 1) setCurrent((c) => c + 1);
  }

  function goPrev() {
    if (current > 0) setCurrent((c) => c - 1);
  }

  const correctSoFar = questions.slice(0, current + 1).filter((q) => answers[q.id] === q.correctOption).length;

  return (
    <div className="space-y-4">
      <div className="sticky top-16 z-20 rounded-2xl border border-border bg-card/90 p-4 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {mode === "study" ? "حالت مطالعه" : mode === "exam" ? "حالت آزمون" : mode === "random" ? "تصادفی" : "نقاط ضعف"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {toFa(current + 1)} از {toFa(questions.length)}
            </span>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              • {toFa(correctSoFar)} پاسخ صحیح
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={onExit} className="text-destructive">
            خروج از آزمون
          </Button>
        </div>
        <Progress
          value={(progress / total) * 100}
          className="h-1.5"
          indicatorClassName="bg-gradient-to-l from-teal-500 to-cyan-500"
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <QuestionCard
            question={question}
            selected={answers[question.id] ?? null}
            onSelect={handleAnswer}
            revealed={!!revealed[question.id]}
            mode={mode}
            index={current}
          />
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={goPrev} disabled={current === 0}>
          سوال قبلی
        </Button>
        <div className="flex items-center gap-2">
          {mode === "exam" && unanswered > 0 && (
            <span className="text-xs text-muted-foreground">{toFa(unanswered)} بدون پاسخ</span>
          )}
          {mode === "exam" && (
            <Button onClick={onFinish} loading={submitting} variant="outline" disabled={!isAnswered}>
              پایان آزمون
            </Button>
          )}
          {mode === "study" && (
            <Button onClick={goNext} disabled={current === questions.length - 1}>
              سوال بعدی
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}