"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  RotateCcw,
  Timer,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toFa } from "@/lib/utils";
import { QUESTION_OPTIONS, OPTION_LABELS } from "@/lib/constants";

const currentTime = () => Date.now();

interface Q {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation: string | null;
}

interface ResultQuestion {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation: string | null;
  selectedOption: string | null;
  isCorrect: boolean | null;
}

interface Result {
  score: number;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  questions: ResultQuestion[];
}

export function SampleSetTaker({
  courseId,
  setId,
  setTitle,
  mode,
  onClose,
}: {
  courseId: string;
  setId: string;
  setTitle: string;
  mode: "EXAM" | "PRACTICE";
  onClose: () => void;
}) {
  const [questions, setQuestions] = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>({});
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const enteredAt = useRef<number>(0);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/sample-sets/${setId}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در بارگذاری");
      setQuestions(data.set.questions ?? []);
      if (data.set.timeLimitMinutes && mode === "EXAM") {
        setDeadline(Date.now() + data.set.timeLimitMinutes * 60 * 1000);
      }
    } catch {
      toast.error("خطا در بارگذاری سوالات");
      onClose();
    } finally {
      setLoading(false);
      enteredAt.current = Date.now();
    }
  }, [courseId, setId, mode, onClose]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadQuestions();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadQuestions]);

  const recordTime = useCallback(
    (qid: string) => {
      const elapsed = Date.now() - enteredAt.current;
      setTimeSpent((prev) => ({ ...prev, [qid]: (prev[qid] ?? 0) + elapsed }));
    },
    [],
  );

  const goTo = useCallback(
    (index: number) => {
      recordTime(questions[current]?.id ?? "");
      setCurrent(index);
      enteredAt.current = Date.now();
    },
    [current, questions, recordTime],
  );

  const select = (qid: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: option }));
  };

  const submit = useCallback(async () => {
    recordTime(questions[current]?.id ?? "");
    if (questions.length === 0) return;
    setSubmitting(true);
    try {
      const body = questions.map((q) => ({
        questionId: q.id,
        selectedOption: answers[q.id] ?? null,
        timeSpentMs: timeSpent[q.id] ?? 0,
      }));
      const startRes = await fetch(`/api/sample-sets/${setId}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error ?? "خطا در شروع آزمون");
      const submitRes = await fetch(
        `/api/sample-sets/${setId}/attempt/${startData.attempt.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: body }),
        },
      );
      const submitData = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitData.error ?? "خطا در ثبت پاسخ‌ها");
      setResult(submitData.result);
    } catch {
      toast.error("خطا در ثبت پاسخ‌ها");
    } finally {
      setSubmitting(false);
    }
  }, [answers, current, mode, questions, setId, timeSpent, recordTime]);

  useEffect(() => {
    if (deadline === null) return;
    const t = setInterval(() => {
      if (Date.now() >= deadline) {
        clearInterval(t);
        toast.warning("زمان آزمون به پایان رسید");
        submit();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [deadline, submit]);

  const remaining = deadline ? Math.max(0, Math.floor((deadline - currentTime()) / 1000)) : 0;
  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return toFa(`${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`);
  };

  const q = questions[current];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
            <div>
              <p className="text-sm font-bold">{setTitle}</p>
              <p className="text-xs text-muted-foreground">
                {mode === "EXAM" ? "آزمون زمان‌دار" : "تمرین بدون زمان"}
              </p>
            </div>
          </div>
          {deadline !== null && (
            <Badge className="gap-1 font-mono" variant={remaining < 30 ? "destructive" : "secondary"}>
              <Timer className="h-3 w-3" />
              {fmtTime(remaining)}
            </Badge>
          )}
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-20 text-muted-foreground">
            در حال بارگذاری سوالات…
          </div>
        ) : result ? (
          <ResultView result={result} onClose={onClose} />
        ) : questions.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-20 text-muted-foreground">
            سوالی برای این مجموعه ثبت نشده است.
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-y-auto px-5 py-4">
            <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                سوال {toFa(current + 1)} از {toFa(questions.length)}
              </span>
              <span>{answers[q.id] ? "پاسخ داده شده" : "بدون پاسخ"}</span>
            </div>
            <p className="mb-5 text-base font-medium leading-8">{q.text}</p>
            <div className="space-y-2">
              {QUESTION_OPTIONS.map((opt) => {
                const selected = answers[q.id] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => select(q.id, opt)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-right text-sm transition-all ${
                      selected
                        ? "border-teal-500 bg-teal-500/10"
                        : "border-border bg-card hover:border-teal-500/50 hover:bg-accent"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        selected ? "bg-teal-500 text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {toFa(opt === "A" ? "۱" : opt === "B" ? "۲" : opt === "C" ? "۳" : "۴")}
                    </span>
                    {q[`option${opt}` as keyof Q] as string}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!loading && !result && questions.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => goTo(Math.max(0, current - 1))}
              disabled={current === 0}
            >
              <ArrowRight className="ml-1 h-4 w-4 rotate-180" />
              قبلی
            </Button>
            {current < questions.length - 1 ? (
              <Button className="rounded-xl" onClick={() => goTo(current + 1)}>
                بعدی
                <ArrowRight className="mr-1 h-4 w-4" />
              </Button>
            ) : (
              <Button className="rounded-xl" onClick={submit} loading={submitting}>
                پایان و مشاهده نتیجه
              </Button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function ResultView({ result, onClose }: { result: Result; onClose: () => void }) {
  const [reviewOpen, setReviewOpen] = useState(false);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-5 py-5">
      <div className="mb-4 rounded-2xl border border-border bg-muted/40 p-5 text-center">
        <p className="text-sm text-muted-foreground">نمره کل</p>
        <p className="text-4xl font-bold text-teal-500">{toFa(result.score)}٪</p>
        <div className="mt-3 flex justify-center gap-4 text-xs">
          <span className="flex items-center gap-1 text-emerald-500">
            <CheckCircle2 className="h-4 w-4" />
            {toFa(result.correct)} صحیح
          </span>
          <span className="flex items-center gap-1 text-red-500">
            <XCircle className="h-4 w-4" />
            {toFa(result.incorrect)} غلط
          </span>
          <span className="flex items-center gap-1 text-amber-500">
            <Clock className="h-4 w-4" />
            {toFa(result.unanswered)} بدون پاسخ
          </span>
        </div>
      </div>

      <Button variant="outline" className="mb-4 rounded-xl" onClick={() => setReviewOpen((v) => !v)}>
        <RotateCcw className="ml-2 h-4 w-4" />
        {reviewOpen ? "بستن بررسی پاسخ‌ها" : "بررسی پاسخ‌ها"}
      </Button>

      {reviewOpen && (
        <div className="space-y-3">
          {result.questions.map((q, i) => (
            <div key={q.id} className="rounded-xl border border-border p-4">
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="secondary">سوال {toFa(i + 1)}</Badge>
                {q.isCorrect === true && (
                  <Badge variant="success">
                    <Check className="ml-1 h-3 w-3" /> صحیح
                  </Badge>
                )}
                {q.isCorrect === false && (
                  <Badge variant="destructive">
                    <X className="ml-1 h-3 w-3" /> غلط
                  </Badge>
                )}
                {q.isCorrect === null && <Badge variant="outline">بدون پاسخ</Badge>}
              </div>
              <p className="mb-3 font-medium leading-7">{q.text}</p>
              <div className="space-y-1.5">
                {QUESTION_OPTIONS.map((opt) => {
                  const isCorrect = opt === q.correctOption;
                  const isSelected = opt === q.selectedOption;
                  const show = q.isCorrect !== null;
                  const cls = !show
                    ? "border-border bg-card"
                    : isCorrect
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : isSelected
                        ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400"
                        : "border-border bg-muted/40 text-muted-foreground";
                  return (
                    <div key={opt} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${cls}`}>
                      <span className="font-semibold">
                        {toFa(opt === "A" ? "۱" : opt === "B" ? "۲" : opt === "C" ? "۳" : "۴")}
                      </span>
                      {q[`option${opt}` as keyof ResultQuestion] as string}
                      {show && isCorrect && <Check className="mr-auto h-4 w-4" />}
                      {show && isSelected && !isCorrect && <X className="mr-auto h-4 w-4" />}
                    </div>
                  );
                })}
              </div>
              {q.explanation && (
                <p className="mt-3 rounded-lg bg-teal-500/10 p-3 text-sm leading-6">{q.explanation}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Button className="mt-4 rounded-xl" onClick={onClose}>
        بازگشت به لیست مجموعه‌ها
      </Button>
    </div>
  );
}
