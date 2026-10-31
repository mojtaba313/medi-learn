"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Activity,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  FileQuestion,
  Flame,
  Gauge,
  Layers,
  Lightbulb,
  Plus,
  Sparkles,
  Target,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, toFa, toFaWithSeparator, formatRelative, formatDuration } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";

interface DashboardStats {
  overall: {
    totalNotes: number;
    totalQuestions: number;
    totalFlashcards: number;
    totalAssets: number;
    totalAnnotations: number;
    studyStreak: number;
    totalStudyTimeSeconds: number;
    totalAttempts: number;
    overallAccuracy: number;
  };
  notes: {
    id: string;
    title: string;
    description: string;
    kind: string;
    order: number;
    assetCount: number;
    questionCount: number;
    flashcardCount: number;
    done: boolean;
    lastOpenedAt: string | null;
    progress: number;
  }[];
}

export function DashboardClient({
  initialStats,
}: {
  initialStats: DashboardStats;
}) {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function refresh() {
      setLoading(true);
      try {
        const res = await fetch("/api/dashboard/stats", { cache: "no-store" });
        const data = await res.json();
        if (mounted) setStats(data);
      } catch {
        /* ignore */
      } finally {
        if (mounted) setLoading(false);
      }
    }
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">داشبورد</h1>
            <p className="mt-1 text-muted-foreground">
              پیشرفت و آمار مطالعه جزوه‌ها
            </p>
          </div>
          <ButtonAsLink href="/modules" className="gap-1">
            <Plus className="h-4 w-4" />
            جزوه جدید
          </ButtonAsLink>
        </div>

        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <OverviewCard
            icon={BookOpen}
            label="جزوه‌ها"
            value={toFa(stats.overall.totalNotes)}
          />
          <OverviewCard
            icon={FileQuestion}
            label="سوالات"
            value={toFa(stats.overall.totalQuestions)}
            sub="سوال طراحی‌شده"
          />
          <OverviewCard
            icon={Flame}
            label="فلش‌کارت‌ها"
            value={toFa(stats.overall.totalFlashcards)}
          />
          <OverviewCard
            icon={Sparkles}
            label="دارایی‌ها"
            value={toFa(stats.overall.totalAssets)}
          />
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-4">
          <OverviewCard
            icon={Target}
            label="دقت کلی"
            value={`${toFa(stats.overall.overallAccuracy)}٪`}
            sub="پاسخ صحیح"
            color="text-teal-500"
            delay={0.05}
          />
          <OverviewCard
            icon={Clock}
            label="زمان مطالعه"
            value={formatDuration(Math.round(stats.overall.totalStudyTimeSeconds))}
            sub="در آزمون‌ها"
            color="text-cyan-500"
            delay={0.1}
          />
          <OverviewCard
            icon={FileQuestion}
            label="آزمون‌ها"
            value={toFa(stats.overall.totalAttempts)}
            sub="آزمون ثبت‌شده"
            color="text-violet-500"
            delay={0.15}
          />
          <OverviewCard
            icon={Flame}
            label="استریک مطالعه"
            value={toFa(stats.overall.studyStreak)}
            sub="روز متوالی"
            color="text-amber-500"
            delay={0.2}
          />
        </div>

        <div className="mb-8">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4 text-teal-500" />
                جزوه‌های مطالعه
              </CardTitle>
              <ButtonAsLink href="/modules" className="gap-1 text-xs">
                همه جزوه‌ها
                <ChevronLeftIcon />
              </ButtonAsLink>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.notes.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  هنوز جزوه‌ای برای مطالعه وارد نشده است.
                </p>
              ) : (
                stats.notes.map((note) => (
                  <Link
                    key={note.id}
                    href={`/modules/${note.id}`}
                    className="block rounded-xl border border-border/60 p-3 transition-colors hover:border-teal-500/40 hover:bg-muted/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{note.title}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {note.description}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] font-medium text-teal-600 dark:text-teal-400">
                        {toFa(note.progress)}٪
                      </span>
                    </div>
                    <div className="mt-2">
                      <Progress value={note.progress} className="h-1.5" />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                      <span>
                        {toFa(note.assetCount)} دارایی
                      </span>
                      <span>
                        {toFa(note.questionCount)} سوال
                      </span>
                      <span>
                        {toFa(note.flashcardCount)} فلش‌کارت
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Flame className="h-4 w-4 text-amber-500" />
                استریک مطالعه
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="text-3xl font-black text-amber-500">
                    {toFa(stats.overall.studyStreak)}
                  </p>
                  <p className="text-sm text-muted-foreground">روز متوالی</p>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    {toFa(stats.overall.totalAttempts)} آزمون
                  </span>
                  <span>
                    {formatDuration(Math.round(stats.overall.totalStudyTimeSeconds))} مطالعه
                  </span>
                </div>
              </div>
              <div className="relative h-24">
                <Skeleton className="h-full w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </AppShell>
  );
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-teal-500",
  delay = 0,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
  sub?: string;
  color?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Card className="border-border/60">
        <CardContent className="flex flex-col items-center gap-3 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/15 to-cyan-500/15 text-teal-500">
            <Icon className="h-6 w-6" />
          </div>
          <div className="text-center">
            <p className={cn("text-2xl font-bold", color)}>{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
            {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ButtonAsLink({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary", className)}>
      {children}
    </Link>
  );
}

function ChevronLeftIcon() {
  return <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>;
}