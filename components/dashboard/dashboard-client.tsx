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
import { CourseCard } from "@/components/course-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, toFa, toFaWithSeparator, formatRelative, formatDuration } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";

interface DashboardStats {
  enrolled: {
    id: string;
    title: string;
    category: string;
    description: string;
    coverUrl: string | null;
    totalPages: number;
    questionCount: number;
    annotatedPages: number;
    pageProgress: number;
    answered: number;
    correct: number;
    incorrect: number;
    accuracy: number;
    lastStudy: string | null;
    recommendations: { pageNumber: number; wrong: number; total: number }[];
  }[];
  modules: {
    id: string;
    title: string;
    description: string;
    lessonCount: number;
    done: number;
    percent: number;
    notes: number;
    highlights: number;
    bookmarks: number;
    dueCards: number;
    questionCount: number;
    flashcardCount: number;
    quizPercent: number;
    quizAttempts: number;
    lastActivity: string | null;
  }[];
  studyHeatmap: { date: string; minutes: number }[];
  overall: {
    totalAnswered: number;
    totalCorrect: number;
    overallAccuracy: number;
    totalStudyTimeSeconds: number;
    totalAttempts: number;
    totalCourses: number;
    totalModules: number;
    totalLessons: number;
    completedLessons: number;
    notes: number;
    highlights: number;
    bookmarks: number;
    dueCards: number;
    moduleQuizAttempts: number;
    moduleQuizAccuracy: number;
    totalStudyMinutes: number;
    todayMinutes: number;
    studyStreak: number;
  };
  recentActivity: {
    type: "quiz" | "study" | "question" | "module-quiz";
    courseId: string;
    courseTitle: string;
    moduleId?: string;
    detail: string;
    score: number | null;
    total: number | null;
    at: string;
  }[];
}

export function DashboardClient({
  user,
}: {
  user: { id: string; name: string; role: string };
}) {
  const { user: sessionUser } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard/stats", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold sm:text-3xl"
          >
            سلام {sessionUser?.name ?? user.name} 👋
          </motion.h1>
          <p className="mt-1 text-muted-foreground">
            {stats
              ? `تاکنون ${toFaWithSeparator(stats.overall.totalAnswered)} سوال پاسخ داده‌اید.`
              : "در حال بارگذاری آمار شما..."}
          </p>
        </div>

        {loading ? (
          <DashboardSkeleton />
        ) : stats ? (
          <>
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <OverviewCard
                icon={CheckCircle2}
                label="سوالات پاسخ‌داده‌شده"
                value={toFaWithSeparator(stats.overall.totalAnswered)}
                sub="در مجموع"
                color="text-emerald-500"
                delay={0}
              />
              <OverviewCard
                icon={Gauge}
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
            </div>

            <div className="mb-8 grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Layers className="h-4 w-4 text-teal-500" />
                    ماژول‌های مطالعه
                  </CardTitle>
                  <ButtonAsLink href="/modules" className="gap-1 text-xs">
                    همه ماژول‌ها
                    <ChevronLeftIcon />
                  </ButtonAsLink>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stats.modules.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      هنوز ماژولی برای مطالعه وارد نشده است.
                    </p>
                  ) : (
                    stats.modules.map((module) => (
                      <Link
                        key={module.id}
                        href={`/modules/${module.id}`}
                        className="block rounded-xl border border-border/60 p-3 transition-colors hover:border-teal-500/40 hover:bg-muted/30"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{module.title}</p>
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                              {module.description}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] font-medium text-teal-600 dark:text-teal-400">
                            {toFa(module.percent)}٪
                          </span>
                        </div>
                        <div className="mt-2">
                          <Progress value={module.percent} className="h-1.5" />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                          <span>
                            {toFa(module.done)} از {toFa(module.lessonCount)} درس
                          </span>
                          {module.dueCards > 0 && (
                            <span className="text-amber-600 dark:text-amber-400">
                              {toFa(module.dueCards)} کارت سررسید
                            </span>
                          )}
                          {module.quizAttempts > 0 && (
                            <span>دقت آزمون {toFa(module.quizPercent)}٪</span>
                          )}
                          {module.highlights > 0 && (
                            <span>{toFa(module.highlights)} هایلایت</span>
                          )}
                        </div>
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>

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
                      <p className="text-xs text-muted-foreground">روز پیوسته</p>
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-bold">{toFa(stats.overall.todayMinutes)}</p>
                      <p className="text-[10px] text-muted-foreground">دقیقه امروز</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1">
                    {stats.studyHeatmap.map((day) => (
                      <span
                        key={day.date}
                        title={`${day.date}: ${toFa(day.minutes)} دقیقه`}
                        className={cn(
                          "aspect-square rounded-[3px]",
                          day.minutes === 0
                            ? "bg-muted"
                            : day.minutes < 15
                              ? "bg-teal-500/20"
                              : day.minutes < 30
                                ? "bg-teal-500/40"
                                : day.minutes < 60
                                  ? "bg-teal-500/60"
                                  : "bg-teal-500/90",
                        )}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>۹۱ روز اخیر</span>
                    <span>مجموع {toFa(stats.overall.totalStudyMinutes)} دقیقه</span>
                  </div>
                  {stats.overall.dueCards > 0 && (
                    <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                      {toFa(stats.overall.dueCards)} فلش‌کارت برای مرور امروز آماده است.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <BookOpen className="h-5 w-5 text-teal-500" />
                    دروس من
                  </h2>
                  {user.role === "ADMIN" && (
                    <ButtonAsLink href="/admin" className="gap-1">
                      <Plus className="h-4 w-4" />
                      مدیریت دروس
                    </ButtonAsLink>
                  )}
                </div>
                {stats.enrolled.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
                    <Sparkles className="mb-4 h-10 w-10 text-muted-foreground/50" />
                    <p className="mb-2 font-semibold">هنوز درسی ندارید</p>
                    <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                      {user.role === "ADMIN"
                        ? "برای شروع، اولین درس خود را ایجاد کنید."
                        : "زمانی که مدیر دروسی اضافه کند، اینجا نمایش داده می‌شوند."}
                    </p>
                    {user.role === "ADMIN" && (
                      <Link
                        href="/admin"
                        className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                      >
                        ایجاد درس جدید
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2">
                    {stats.enrolled.map((course, i) => (
                      <CourseCard
                        key={course.id}
                        index={i}
                        course={{
                          id: course.id,
                          title: course.title,
                          description: course.description,
                          category: course.category,
                          coverUrl: course.coverUrl,
                          totalPages: course.totalPages,
                          questionCount: course.questionCount,
                          pageProgress: course.pageProgress,
                          annotatedPages: course.annotatedPages,
                          footer: (
                            <div className="mt-3 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                دقت: {toFa(course.accuracy)}٪
                              </span>
                              <span className="flex gap-2">
                                <Link
                                  href={`/study/${course.id}`}
                                  className="rounded-md bg-primary/10 px-2 py-1 font-medium text-primary hover:bg-primary/20"
                                >
                                  مطالعه
                                </Link>
                                <Link
                                  href={`/quiz/${course.id}`}
                                  className="rounded-md bg-accent px-2 py-1 font-medium text-accent-foreground hover:bg-accent/70"
                                >
                                  آزمون
                                </Link>
                              </span>
                            </div>
                          ),
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      پیشنهادات بعدی
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stats.enrolled.some((c) => c.recommendations.length > 0) ? (
                      stats.enrolled.map((course) =>
                        course.recommendations.map((rec) => (
                          <motion.div
                            key={`${course.id}-${rec.pageNumber}`}
                            initial={{ opacity: 0, x: 10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"
                          >
                            <Flame className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                            <div className="text-sm">
                              <p className="font-medium">
                                مرور صفحه {toFa(rec.pageNumber)} از «{course.title}»
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {toFa(rec.wrong)} از {toFa(rec.total)} سوال این صفحه را اشتباه پاسخ داده‌اید
                              </p>
                              <Link
                                href={`/study/${course.id}?page=${rec.pageNumber}`}
                                className="mt-1.5 inline-block text-xs font-medium text-amber-600 hover:underline dark:text-amber-400"
                              >
                                مطالعه این صفحه ←
                              </Link>
                            </div>
                          </motion.div>
                        ))
                      )
                    ) : (
                      <div className="flex flex-col items-center py-6 text-center">
                        <Target className="mb-3 h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">
                          هیچ پیشنهادی وجود ندارد. به مطالعه و آزمون ادامه دهید!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Activity className="h-4 w-4 text-teal-500" />
                      فعالیت‌های اخیر
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative space-y-0">
                      {stats.recentActivity.map((item, i) => (
                        <motion.div
                          key={`${item.at}-${i}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="relative flex gap-3 pb-5 last:pb-0"
                        >
                          <div className="flex flex-col items-center">
                            <span
                              className={cn(
                                "z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                                item.type === "quiz" || item.type === "module-quiz"
                                  ? "bg-violet-500/15 text-violet-500"
                                  : item.type === "study"
                                  ? "bg-teal-500/15 text-teal-500"
                                  : item.score
                                  ? "bg-emerald-500/15 text-emerald-500"
                                  : "bg-red-500/15 text-red-500"
                              )}
                            >
                              {item.type === "module-quiz" ? (
                                <Brain className="h-3.5 w-3.5" />
                              ) : item.type === "quiz" ? (
                                <Target className="h-3.5 w-3.5" />
                              ) : item.type === "study" ? (
                                <BookOpen className="h-3.5 w-3.5" />
                              ) : item.score ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <FileQuestion className="h-3.5 w-3.5" />
                              )}
                            </span>
                            {i < stats.recentActivity.length - 1 && (
                              <span className="w-px flex-1 bg-border" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium">{item.detail}</p>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {formatRelative(item.at)}
                              </span>
                            </div>
                            {item.courseTitle && (
                              <p className="text-xs text-muted-foreground">{item.courseTitle}</p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        ) : (
          <p className="text-center text-muted-foreground">خطا در دریافت آمار</p>
        )}
      </main>
    </AppShell>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ButtonAsLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
        className
      )}
    >
      {children}
    </Link>
  );
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  delay,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  sub: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="border-border/60">
        <CardContent className="flex items-center gap-4 p-5">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/15 to-cyan-500/15",
              color
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold leading-8">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-[10px] text-muted-foreground">{sub}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}