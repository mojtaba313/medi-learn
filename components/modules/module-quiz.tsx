"use client";

import { useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  RotateCcw,
  Shuffle,
  Target,
  XCircle,
} from "lucide-react";
import type {
  AttemptData,
  LessonData,
  QuestionData,
  ResponseData,
} from "@/components/modules/types";
import { cleanTitle } from "@/lib/module-utils";
import { cn, toFa } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D"];

const resultMessage = (percent: number) => {
  if (percent < 70) {
    return "تمرکز بعدی: بخش‌هایی را که در آن‌ها اشتباه داشتی دوباره بخوان و پس از فاصله زمانی تست را تکرار کن.";
  }
  if (percent < 90) {
    return "خوب است؛ برای امتحان سخت، دام‌های جدول جمع‌بندی و علت مولکولی مثال‌ها را هم از حفظ توضیح بده.";
  }
  return "عملکرد قوی در این بانک سؤال؛ برای اطمینان، سؤالات را با ترتیب جدید دوباره حل کن و صفحات اصلی جزوه را هم ببین.";
};

const formatAttemptDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
};

interface ModuleQuizProps {
  moduleId: string;
  title: string;
  description: string;
  questions: QuestionData[];
  lessons: LessonData[];
  attempts: AttemptData[];
  responses: Record<string, ResponseData>;
  onAttemptSaved: (attempt: AttemptData) => void;
}

export function ModuleQuiz({
  moduleId,
  title,
  description,
  questions,
  lessons,
  attempts,
  responses,
  onAttemptSaved,
}: ModuleQuizProps) {
  const allIndices = useMemo(() => questions.map((_, index) => index), [questions]);
  const [indices, setIndices] = useState<number[]>(allIndices);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState<
    Record<number, { selected: number; isCorrect: boolean }>
  >({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const startedAt = useRef<Record<number, number>>({});

  const submittedEntries = Object.entries(submitted);
  const score = submittedEntries.filter(([, value]) => value.isCorrect).length;
  const percent = submittedEntries.length
    ? Math.round((score / submittedEntries.length) * 100)
    : 0;

  const lastWrongIds = attempts[0]?.wrongQuestionIds ?? [];
  const lastWrongCount = lastWrongIds.length;

  const analytics = useMemo(() => {
    const topics: Record<string, { correct: number; total: number }> = {};
    for (const attempt of attempts) {
      for (const [topic, stats] of Object.entries(attempt.topicStats ?? {})) {
        if (!topics[topic]) topics[topic] = { correct: 0, total: 0 };
        topics[topic].correct += Number(stats.correct) || 0;
        topics[topic].total += Number(stats.total) || 0;
      }
    }
    return Object.entries(topics)
      .map(([topic, stats]) => {
        const lesson = lessons.find(
          (item) => item.slug === topic || item.id === topic,
        );
        return {
          topic,
          label: lesson ? cleanTitle(lesson.title) : "ترکیبی",
          correct: stats.correct,
          total: stats.total,
          percent: stats.total ? Math.round((stats.correct / stats.total) * 100) : 0,
        };
      })
      .sort((a, b) => a.percent - b.percent);
  }, [attempts, lessons]);

  const reset = (nextIndices: number[] = allIndices) => {
    setIndices(nextIndices);
    setAnswers({});
    setSubmitted({});
    startedAt.current = {};
    setError("");
  };

  const check = (questionIndex: number) => {
    const question = questions[questionIndex];
    const answer = answers[questionIndex];
    if (answer === undefined) return;
    const correctIndex = question.correctOption.charCodeAt(0) - 65;
    setSubmitted((current) => ({
      ...current,
      [questionIndex]: { selected: answer, isCorrect: answer === correctIndex },
    }));
  };

  const submitAll = async () => {
    if (saving) return;
    const now = Date.now();
    const payload = indices.map((questionIndex) => {
      const question = questions[questionIndex];
      const answer = answers[questionIndex];
      const selectedOption =
        answer === undefined ? null : (LETTERS[answer] ?? null);
      const start = startedAt.current[questionIndex] ?? now;
      return {
        questionId: question.id,
        selectedOption,
        timeSpentMs: Math.max(0, now - start),
      };
    });

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/modules/${encodeURIComponent(moduleId)}/quiz/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "STUDY", answers: payload }),
      });
      if (!res.ok) {
        setError("ثبت آزمون انجام نشد. دوباره تلاش کنید.");
        return;
      }
      const data = (await res.json()) as { attempt: AttemptData };
      onAttemptSaved(data.attempt);

      const nextSubmitted: Record<number, { selected: number; isCorrect: boolean }> = {};
      for (const questionIndex of indices) {
        const question = questions[questionIndex];
        const answer = answers[questionIndex];
        if (answer === undefined) continue;
        const correctIndex = question.correctOption.charCodeAt(0) - 65;
        nextSubmitted[questionIndex] = {
          selected: answer,
          isCorrect: answer === correctIndex,
        };
      }
      setSubmitted(nextSubmitted);
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setSaving(false);
    }
  };

  const retryWrong = () => {
    if (!lastWrongIds.length) return;
    const nextIndices = lastWrongIds
      .map((id) => questions.findIndex((question) => question.id === id))
      .filter((index) => index >= 0);
    if (nextIndices.length) reset(nextIndices);
  };

  if (!questions.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
        سؤالی برای این ماژول ثبت نشده است.
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-4xl">
      <header className="mb-5">
        <div className="mb-1 text-xs font-medium text-teal-600 dark:text-teal-400">
          آزمون فعال
        </div>
        <h1 className="text-2xl font-black sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
          {toFa(questions.length)} سؤال مفهومی و بالینی
        </span>
        <button
          type="button"
          onClick={() => reset([...allIndices].sort(() => Math.random() - 0.5))}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          <Shuffle className="h-3.5 w-3.5" />
          ترتیب تصادفی
        </button>
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          شروع دوباره
        </button>
        <button
          type="button"
          onClick={retryWrong}
          disabled={lastWrongCount === 0}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-40"
        >
          <Target className="h-3.5 w-3.5" />
          مرور اشتباهات ({toFa(lastWrongCount)})
        </button>
        <button
          type="button"
          onClick={submitAll}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
        >
          {saving ? "در حال ثبت…" : "تصحیح همه پاسخ‌ها"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {submittedEntries.length > 0 && (
        <div className="mb-5 rounded-2xl border border-border/60 bg-card/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <b className="text-sm">
              نتیجه فعلی: {toFa(score)} از {toFa(submittedEntries.length)} ({toFa(percent)}٪)
            </b>
            <span className="text-xs text-muted-foreground">
              فقط سؤال‌های تصحیح‌شده محاسبه شده‌اند.
            </span>
          </div>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            {resultMessage(percent)}
          </p>
        </div>
      )}

      {analytics.length > 0 && (
        <div className="mb-5 rounded-2xl border border-border/60 bg-card/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">تحلیل موضوعی آزمون‌ها</h3>
            <span className="text-xs text-muted-foreground">بر اساس همهٔ تلاش‌ها</span>
          </div>
          <div className="space-y-2">
            {analytics.map((row) => (
              <div key={row.topic} className="grid grid-cols-[1fr_120px_auto] items-center gap-2 text-xs">
                <span className="truncate">{row.label}</span>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      row.percent >= 80
                        ? "bg-emerald-500"
                        : row.percent < 50
                          ? "bg-destructive"
                          : "bg-amber-500",
                    )}
                    style={{ width: `${row.percent}%` }}
                  />
                </div>
                <b className="text-muted-foreground">
                  {toFa(row.correct)}/{toFa(row.total)} • {toFa(row.percent)}٪
                </b>
              </div>
            ))}
          </div>

          {attempts.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
              {attempts.slice(0, 4).map((attempt, index) => {
                const attemptPercent = attempt.total
                  ? Math.round((attempt.score / attempt.total) * 100)
                  : 0;
                return (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <b>تلاش {toFa(index + 1)}</b>
                      <span className="mr-2 text-muted-foreground">
                        {formatAttemptDate(attempt.createdAt)} • {toFa(attempt.score)} از{" "}
                        {toFa(attempt.total)}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-semibold",
                        attemptPercent >= 80
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : attemptPercent < 50
                            ? "bg-destructive/15 text-destructive"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                      )}
                    >
                      {toFa(attemptPercent)}٪
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {indices.map((questionIndex, position) => {
          const question = questions[questionIndex];
          const answer = answers[questionIndex];
          const result = submitted[questionIndex];
          const correctIndex = question.correctOption.charCodeAt(0) - 65;
          const lesson = lessons.find(
            (item) => item.slug === question.topic || item.id === question.topic,
          );
          const previous = responses[question.id];
          const choices = [
            question.optionA,
            question.optionB,
            question.optionC,
            question.optionD,
          ];

          return (
            <article
              key={question.id}
              className="rounded-2xl border border-border/60 bg-card/70 p-4 sm:p-5"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>
                  سؤال {toFa(position + 1)} •{" "}
                  {lesson ? cleanTitle(lesson.title) : "ترکیبی"}
                </span>
                {previous && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5",
                      previous.isCorrect
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-destructive/10 text-destructive",
                    )}
                  >
                    قبلاً {previous.isCorrect ? "درست" : "نادرست"}
                  </span>
                )}
              </div>
              <div className="mb-4 text-sm font-semibold leading-7">{question.text}</div>
              <div className="space-y-2">
                {choices.map((choice, optionIndex) => {
                  const selected = answer === optionIndex;
                  const isCorrectOption = result && optionIndex === correctIndex;
                  const isWrongSelected =
                    result && selected && optionIndex !== correctIndex;

                  return (
                    <label
                      key={optionIndex}
                      className={cn(
                        "flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-sm leading-6 transition-colors",
                        isCorrectOption
                          ? "border-emerald-500/50 bg-emerald-500/10"
                          : isWrongSelected
                            ? "border-destructive/50 bg-destructive/10"
                            : selected
                              ? "border-primary/50 bg-primary/10"
                              : "border-border/60 hover:bg-muted/50",
                        result ? "cursor-default" : "",
                      )}
                    >
                      <input
                        type="radio"
                        name={`q-${question.id}`}
                        value={optionIndex}
                        checked={selected}
                        disabled={Boolean(result)}
                        onChange={() => {
                          if (startedAt.current[questionIndex] === undefined) {
                            startedAt.current[questionIndex] = Date.now();
                          }
                          setAnswers((current) => ({
                            ...current,
                            [questionIndex]: optionIndex,
                          }));
                        }}
                        className="mt-1.5 accent-teal-600"
                      />
                      <span>
                        <b className="ml-1 text-muted-foreground">{LETTERS[optionIndex]}.</b>
                        {choice}
                      </span>
                    </label>
                  );
                })}
              </div>

              {result && (
                <div
                  className={cn(
                    "mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-xs leading-6",
                    result.isCorrect
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "bg-destructive/10 text-destructive",
                  )}
                >
                  {result.isCorrect ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <span>
                    <b>{result.isCorrect ? "پاسخ درست" : "پاسخ نادرست"}</b>
                    {" — "}
                    {question.explanation}
                  </span>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => check(questionIndex)}
                  disabled={Boolean(result) || answer === undefined}
                  className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-40"
                >
                  بررسی پاسخ
                </button>
                <span className="text-xs text-muted-foreground">
                  {result ? "پاسخ ثبت شد" : "پاسخ را انتخاب کن"}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
