"use client";

import { useMemo, useState } from "react";
import { Brain, CalendarClock, RotateCw, Shuffle } from "lucide-react";
import type { FlashcardData, ReviewData } from "@/components/modules/types";
import { cn, toFa } from "@/lib/utils";

const isDue = (review: ReviewData | undefined) =>
  !review || new Date(review.due).getTime() <= Date.now();

const formatDue = (review?: ReviewData) => {
  if (!review) return "کارت جدید";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      month: "short",
      day: "numeric",
    }).format(new Date(review.due));
  } catch {
    return "نامشخص";
  }
};

interface ModuleFlashcardsProps {
  flashcards: FlashcardData[];
  reviews: Record<string, ReviewData>;
  onGrade: (cardId: string, grade: "again" | "good" | "easy") => void;
}

export function ModuleFlashcards({
  flashcards,
  reviews,
  onGrade,
}: ModuleFlashcardsProps) {
  const [index, setIndex] = useState(0);
  const [back, setBack] = useState(false);
  const [dueOnly, setDueOnly] = useState(false);
  const [dueDeck, setDueDeck] = useState<number[]>([]);
  const [duePos, setDuePos] = useState(0);
  const [dueBack, setDueBack] = useState(false);

  const dueCount = useMemo(
    () => flashcards.filter((card) => isDue(reviews[card.id])).length,
    [flashcards, reviews],
  );

  if (!flashcards.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
        فلش‌کارتی برای این ماژول ثبت نشده است.
      </div>
    );
  }

  const safeIndex = ((index % flashcards.length) + flashcards.length) % flashcards.length;
  const originalIndex = dueOnly ? dueDeck[duePos] : safeIndex;
  const card = flashcards[originalIndex];
  const isBack = dueOnly ? dueBack : back;
  const position = dueOnly ? duePos : safeIndex;
  const deckLength = dueOnly ? dueDeck.length : flashcards.length;
  const review = reviews[card?.id ?? ""];

  if (!card) return null;

  const startDue = () => {
    const list = flashcards
      .map((_, cardIndex) => cardIndex)
      .filter((cardIndex) => isDue(reviews[flashcards[cardIndex].id]));
    if (!list.length) return;
    setDueDeck(list);
    setDuePos(0);
    setDueBack(false);
    setDueOnly(true);
  };

  const stopDue = () => {
    setDueOnly(false);
    setDueBack(false);
    setDueDeck([]);
    setDuePos(0);
  };

  const goPrev = () => {
    if (!dueOnly) {
      setBack(false);
      setIndex((current) => (current + flashcards.length - 1) % flashcards.length);
      return;
    }
    setDueBack(false);
    setDuePos((current) => (current + dueDeck.length - 1) % dueDeck.length);
  };

  const goNext = () => {
    if (!dueOnly) {
      setBack(false);
      setIndex((current) => (current + 1) % flashcards.length);
      return;
    }
    setDueBack(false);
    setDuePos((current) => (current + 1) % dueDeck.length);
  };

  const flip = () => {
    if (dueOnly) setDueBack((current) => !current);
    else setBack((current) => !current);
  };

  const random = () => {
    if (!dueOnly) {
      setBack(false);
      setIndex(Math.floor(Math.random() * flashcards.length));
      return;
    }
    setDueBack(false);
    setDuePos(Math.floor(Math.random() * dueDeck.length));
  };

  const grade = (value: "again" | "good" | "easy") => {
    onGrade(card.id, value);

    if (!dueOnly) {
      goNext();
      return;
    }

    const remaining = dueDeck.filter((_, deckIndex) => deckIndex !== duePos);
    setDueBack(false);
    if (remaining.length === 0) {
      stopDue();
      return;
    }
    setDueDeck(remaining);
    setDuePos((current) => Math.min(current, remaining.length - 1));
  };

  return (
    <section className="mx-auto w-full max-w-3xl">
      <header className="mb-5">
        <div className="mb-1 flex items-center gap-2 text-xs font-medium text-teal-600 dark:text-teal-400">
          <Brain className="h-3.5 w-3.5" />
          مرور فعال با تکرار فاصله‌دار
        </div>
        <h1 className="text-2xl font-black sm:text-3xl">فلش‌کارت‌ها</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          روی کارت کلیک کن تا پاسخ نشان داده شود. بعد از دیدن پاسخ، کیفیت یادآوری را
          مشخص کن تا زمان مرور بعدی هوشمندانه تنظیم شود.
        </p>
      </header>

      <div className="mb-5 inline-flex rounded-xl border border-border bg-card p-1 text-sm">
        <button
          type="button"
          className={cn(
            "rounded-lg px-4 py-1.5 font-medium transition-colors",
            !dueOnly ? "bg-primary text-primary-foreground" : "text-muted-foreground",
          )}
          onClick={stopDue}
        >
          همهٔ کارت‌ها ({toFa(flashcards.length)})
        </button>
        <button
          type="button"
          className={cn(
            "rounded-lg px-4 py-1.5 font-medium transition-colors",
            dueOnly ? "bg-primary text-primary-foreground" : "text-muted-foreground",
          )}
          onClick={startDue}
          disabled={dueCount === 0}
        >
          موعددار ({toFa(dueCount)})
        </button>
      </div>

      <button
        type="button"
        onClick={flip}
        className={cn(
          "flex min-h-[260px] w-full flex-col items-center justify-center rounded-3xl border p-8 text-center transition-all",
          isBack
            ? "border-teal-500/40 bg-gradient-to-br from-teal-500/10 to-cyan-500/5"
            : "border-border/60 bg-card hover:border-teal-500/30",
        )}
      >
        <span className="mb-4 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          کارت {toFa(position + 1)} از {toFa(deckLength)}
        </span>
        {isBack ? (
          <>
            <span className="mb-2 text-xs font-medium text-teal-600 dark:text-teal-400">
              پاسخ
            </span>
            <p className="text-lg font-semibold leading-9">{card.definition}</p>
            <span className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              {review
                ? `مرور بعدی: ${formatDue(review)} • تکرار: ${toFa(review.reps)}`
                : "کارت جدید • اولین مرور"}
            </span>
          </>
        ) : (
          <>
            <span className="mb-2 text-xs font-medium text-muted-foreground">سؤال</span>
            <h2 className="text-2xl font-black leading-10">{card.term}</h2>
            <span className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <RotateCw className="h-3.5 w-3.5" />
              برای دیدن توضیح کلیک کن
            </span>
          </>
        )}
      </button>

      {isBack && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => grade("again")}
            className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/15"
          >
            دوباره
          </button>
          <button
            type="button"
            onClick={() => grade("good")}
            className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium hover:bg-muted"
          >
            خوب
          </button>
          <button
            type="button"
            onClick={() => grade("easy")}
            className="rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground"
          >
            آسان
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={goPrev}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          قبلی
        </button>
        <button
          type="button"
          onClick={flip}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {isBack ? "دیدن سؤال" : "برگرداندن کارت"}
        </button>
        <button
          type="button"
          onClick={goNext}
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          بعدی
        </button>
        <button
          type="button"
          onClick={random}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <Shuffle className="h-3.5 w-3.5" />
          تصادفی
        </button>
      </div>

      <p className="mt-4 text-center text-xs leading-6 text-muted-foreground">
        «دوباره» کارت را چند دقیقهٔ دیگر برمی‌گرداند؛ «خوب» و «آسان» فاصلهٔ مرور را
        بیشتر می‌کنند.
      </p>
    </section>
  );
}
