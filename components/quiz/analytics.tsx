"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toFa } from "@/lib/utils";
import type { QuizQuestionView } from "@/components/quiz/question-card";

interface AttemptView {
  id: string;
  mode: string;
  score: number;
  total: number;
  correct: number;
  incorrect: number;
  skipped: number;
  createdAt: string;
}

export function Analytics({
  questions,
  attempts,
  pageNumbers,
}: {
  questions: (QuizQuestionView & { response?: { selectedOption: string | null; isCorrect: boolean | null } | null })[];
  attempts: AttemptView[];
  pageNumbers: number[];
}) {
  const byPage = useMemo(() => {
    const map = new Map<number, { correct: number; total: number }>();
    for (const q of questions) {
      if (q.pageNumber === null) continue;
      const res = q.response;
      if (!res?.selectedOption) continue;
      if (!map.has(q.pageNumber)) map.set(q.pageNumber, { correct: 0, total: 0 });
      const entry = map.get(q.pageNumber)!;
      entry.total += 1;
      if (res.isCorrect) entry.correct += 1;
    }
    return Array.from(map.entries())
      .map(([page, v]) => ({
        name: `صفحه ${toFa(page)}`,
        pageNumber: page,
        percent: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
        total: v.total,
      }))
      .sort((a, b) => a.pageNumber - b.pageNumber);
  }, [questions]);

  const tagsStats = useMemo(() => {
    const map = new Map<string, { correct: number; total: number }>();
    for (const q of questions) {
      if (q.tags.length === 0) continue;
      const res = q.response;
      if (!res?.selectedOption) continue;
      for (const tag of q.tags) {
        if (!map.has(tag)) map.set(tag, { correct: 0, total: 0 });
        const entry = map.get(tag)!;
        entry.total += 1;
        if (res.isCorrect) entry.correct += 1;
      }
    }
    return Array.from(map.entries())
      .map(([tag, v]) => ({
        name: tag,
        percent: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
        total: v.total,
      }))
      .sort((a, b) => a.percent - b.percent);
  }, [questions]);

  const timeline = useMemo(() => {
    return [...attempts]
      .reverse()
      .map((a) => ({
        name: toFa(new Date(a.createdAt).toLocaleDateString("fa-IR", { month: "numeric", day: "numeric" })),
        percent: a.total > 0 ? Math.round((a.score / a.total) * 100) : 0,
      }));
  }, [attempts]);

  const weakPages = byPage.filter((p) => p.percent < 60);

  return (
    <Card className="mb-6 border-border/60">
      <CardHeader>
        <CardTitle className="text-base">تحلیل عملکرد</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border/60 p-4">
            <p className="mb-1 text-sm font-semibold">عملکرد بر اساس صفحه</p>
            <p className="mb-4 text-xs text-muted-foreground">درصد پاسخ‌های صحیح به تفکیک صفحه</p>
            <div className="h-56">
              {byPage.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byPage}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      interval={0}
                      angle={-30}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                    <Tooltip
                      cursor={{ fill: "var(--muted)" }}
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                      formatter={(v) => [`${v}٪`, "درصد صحیح"]}
                    />
                    <Bar dataKey="percent" radius={[4, 4, 0, 0]}>
                      {byPage.map((entry) => (
                        <Cell key={entry.pageNumber} fill={entry.percent >= 60 ? "#14b8a6" : "#f87171"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  هنوز به سوالات این درس پاسخ نداده‌اید
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 p-4">
              <p className="mb-4 text-sm font-semibold">نقاط ضعف</p>
              {weakPages.length > 0 ? (
                <div className="space-y-2">
                  {weakPages.slice(0, 5).map((p) => (
                    <div key={p.pageNumber} className="flex items-center justify-between gap-3 text-sm">
                      <span>صفحه {toFa(p.pageNumber)}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-red-400"
                          style={{ width: `${Math.max(10, 100 - p.percent)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{toFa(p.percent)}٪ صحیح</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {pageNumbers.length > 0 ? "نقطه ضعف مشخصی ندارید، ادامه دهید! 💪" : "هنوز داده‌ای برای تحلیل وجود ندارد"}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border/60 p-4">
              <p className="mb-4 text-sm font-semibold">مباحث ضعیف (برچسب‌ها)</p>
              {tagsStats.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tagsStats.slice(0, 8).map((t) => (
                    <Badge
                      key={t.name}
                      variant={t.percent >= 60 ? "success" : "destructive"}
                      className="gap-1"
                    >
                      {t.name} • {toFa(t.percent)}٪
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">برچسبی برای تحلیل وجود ندارد</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 p-4">
          <p className="mb-1 text-sm font-semibold">پیشرفت در طول زمان</p>
          <p className="mb-4 text-xs text-muted-foreground">روند درصد نمرات آزمون‌های شما</p>
          <div className="h-48">
            {timeline.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [`${v}٪`, "درصد"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="percent"
                    stroke="#14b8a6"
                    strokeWidth={2.5}
                    dot={{ fill: "#14b8a6", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                برای مشاهده نمودار پیشرفت، چند آزمون ثبت کنید
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}