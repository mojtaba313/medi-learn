"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { RotateCcw, CheckCircle2, XCircle, MinusCircle, Clock, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, toFa, formatDuration } from "@/lib/utils";

export function QuizResults({
  correctCount,
  incorrectCount,
  unansweredCount,
  percent,
  totalTime,
  onRetry,
  onReview,
}: {
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  percent: number;
  totalTime: number;
  onRetry: () => void;
  onReview: () => void;
}) {
  const message =
    percent >= 80
      ? "عالی! تسلط شما روی این مباحث بسیار خوب است 🎉"
      : percent >= 50
      ? "خوب است، اما جای پیشرفت دارد 💪"
      : "نیاز به مرور بیشتر این مباحث دارید 📚";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gradient-to-l from-teal-600 to-cyan-600 p-8 text-center text-white">
            <Trophy className="mx-auto mb-3 h-12 w-12" />
            <p className="mb-1 text-sm text-teal-50">نتیجه آزمون</p>
            <p className="mb-2 text-6xl font-black">{toFa(percent)}٪</p>
            <p className="text-teal-50">{message}</p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
            <ResultStat
              icon={CheckCircle2}
              label="پاسخ صحیح"
              value={toFa(correctCount)}
              color="text-emerald-500"
            />
            <ResultStat
              icon={XCircle}
              label="پاسخ اشتباه"
              value={toFa(incorrectCount)}
              color="text-red-500"
            />
            <ResultStat
              icon={MinusCircle}
              label="بدون پاسخ"
              value={toFa(unansweredCount)}
              color="text-amber-500"
            />
            <ResultStat
              icon={Clock}
              label="زمان آزمون"
              value={formatDuration(totalTime)}
              color="text-cyan-500"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <Button onClick={onRetry} className="rounded-xl">
          <RotateCcw className="ml-2" />
          آزمون مجدد
        </Button>
        <Button variant="outline" onClick={onReview} className="rounded-xl">
          مرور پاسخ‌ها
        </Button>
        <Button variant="ghost" asChild className="rounded-xl">
          <Link href="/dashboard">بازگشت به داشبورد</Link>
        </Button>
      </div>
    </motion.div>
  );
}

function ResultStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 bg-card p-5">
      <Icon className={cn("h-5 w-5", color)} />
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}