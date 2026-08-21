"use client";

import { motion } from "motion/react";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, toFa } from "@/lib/utils";

export interface QuizQuestionView {
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
}

export function QuestionCard({
  question,
  selected,
  onSelect,
  revealed,
  mode,
  index,
}: {
  question: QuizQuestionView;
  selected: string | null;
  onSelect: (option: string) => void;
  revealed: boolean;
  mode: string;
  index: number;
}) {
  const options = [
    { key: "A", text: question.optionA },
    { key: "B", text: question.optionB },
    { key: "C", text: question.optionC },
    { key: "D", text: question.optionD },
  ];

  const showResult = revealed || mode === "study" || selected !== null;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">سوال {toFa(index + 1)}</Badge>
        {question.pageNumber !== null ? (
          <Badge>صفحه {toFa(question.pageNumber)}</Badge>
        ) : (
          <Badge variant="outline">عمومی</Badge>
        )}
        {question.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="bg-accent text-accent-foreground">
            {tag}
          </Badge>
        ))}
      </div>

      <p className="mb-6 text-base font-medium leading-8 sm:text-lg">{question.text}</p>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {options.map((opt) => {
          const isSelected = selected === opt.key;
          const isCorrect = opt.key === question.correctOption;
          const shouldReveal = showResult && (isCorrect || isSelected);
          return (
            <motion.button
              key={opt.key}
              whileTap={{ scale: 0.98 }}
              onClick={() => !showResult && onSelect(opt.key)}
              disabled={showResult}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 text-right text-sm transition-all",
                shouldReveal && isCorrect
                  ? "border-emerald-500 bg-emerald-500/10"
                  : shouldReveal && isSelected && !isCorrect
                  ? "border-red-500 bg-red-500/10"
                  : isSelected
                  ? "border-teal-500 bg-teal-500/10 shadow-md"
                  : "border-border bg-card hover:border-teal-500/50 hover:bg-accent"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                  shouldReveal && isCorrect
                    ? "bg-emerald-500 text-white"
                    : shouldReveal && isSelected && !isCorrect
                    ? "bg-red-500 text-white"
                    : isSelected
                    ? "bg-teal-500 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {shouldReveal && isCorrect ? (
                  <Check className="h-4 w-4" />
                ) : shouldReveal && isSelected && !isCorrect ? (
                  <X className="h-4 w-4" />
                ) : (
                  toFa(opt.key === "A" ? "۱" : opt.key === "B" ? "۲" : opt.key === "C" ? "۳" : "۴")
                )}
              </span>
              <span className="leading-6">{opt.text}</span>
            </motion.button>
          );
        })}
      </div>

      {showResult && question.explanation && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 overflow-hidden rounded-xl border border-teal-500/30 bg-teal-500/10 p-4"
        >
          <p className="mb-1 text-sm font-bold text-teal-600 dark:text-teal-400">
            توضیح پاسخ:
          </p>
          <p className="text-sm leading-6">{question.explanation}</p>
        </motion.div>
      )}

      {showResult && !question.explanation && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-sm font-medium text-teal-600 dark:text-teal-400"
        >
          پاسخ صحیح: {toFa(question.correctOption === "A" ? "۱" : question.correctOption === "B" ? "۲" : question.correctOption === "C" ? "۳" : "۴")}
        </motion.p>
      )}
    </div>
  );
}