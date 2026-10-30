"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, Layers, Loader2, Plus, Sparkles, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { CourseCard } from "@/components/course-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toFa } from "@/lib/utils";
import { COURSE_CATEGORIES } from "@/lib/constants";

interface AdminCourse {
  id: string;
  title: string;
  description: string;
  category: string;
  coverUrl: string | null;
  status: string;
  error: string | null;
  totalPages: number;
  _count: { pages: number; questions: number };
}

export function AdminDashboard({
  initialCourses,
}: {
  initialCourses: AdminCourse[];
}) {
  const [courses, setCourses] = useState<AdminCourse[]>(initialCourses);
  const [showCreate, setShowCreate] = useState(false);
  const [pollingId, setPollingId] = useState<string | null>(null);

  useEffect(() => {
    if (!pollingId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/courses", { cache: "no-store" });
        const data = await res.json();
        const course = data.courses.find(
          (c: AdminCourse) => c.id === pollingId,
        );
        if (course && course.status !== "PROCESSING") {
          setCourses(data.courses);
          setPollingId(null);
          if (course.status === "READY") {
            toast.success(
              `درس «${course.title}» با ${toFa(course.totalPages)} صفحه آماده شد ✨`,
            );
          } else {
            toast.error(course.error ?? "پردازش درس ناموفق بود");
          }
        }
      } catch {
        /* keep polling */
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [pollingId]);

  const totalPages = courses.reduce(
    (s, c) => s + (c.totalPages || c._count?.pages || 0),
    0,
  );
  const totalQuestions = courses.reduce(
    (s, c) => s + (c._count?.questions || 0),
    0,
  );
  const readyCourses = courses.filter((c) => c.status === "READY").length;

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">پنل مدیریت</h1>
            <p className="mt-1 text-muted-foreground">
              مدیریت دروس، جزوه‌ها و سوالات
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="rounded-xl">
              <a href="/admin/modules">
                <Layers className="ml-2 h-4 w-4" />
                مدیریت ماژول‌ها
              </a>
            </Button>
            <Button onClick={() => setShowCreate(true)} className="rounded-xl">
              <Plus className="ml-2" />
              ایجاد درس جدید
            </Button>
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatsCard
            icon={BookOpen}
            label="دروس"
            value={toFa(readyCourses)}
            sub={`از ${toFa(courses.length)} درس`}
          />
          <StatsCard
            icon={Sparkles}
            label="صفحات جزوه"
            value={toFa(totalPages)}
            sub="صفحه پردازش‌شده"
          />
          <StatsCard
            icon={TrendingUp}
            label="سوالات"
            value={toFa(totalQuestions)}
            sub="سوال طراحی‌شده"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center"
            >
              <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 font-semibold">هنوز درسی ندارید</h3>
              <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                اولین درس خود را بسازید و جزوه PDF خود را بارگذاری کنید.
              </p>
              <Button
                onClick={() => setShowCreate(true)}
                className="rounded-xl"
              >
                <Plus className="ml-2" />
                ایجاد درس جدید
              </Button>
            </motion.div>
          )}
          <AnimatePresence>
            {courses.map((course, i) => (
              <div key={course.id} className="relative">
                <CourseCard
                  index={i}
                  course={{
                    id: course.id,
                    title: course.title,
                    description: course.description,
                    category: course.category,
                    coverUrl: course.coverUrl,
                    totalPages: course.totalPages || course._count?.pages || 0,
                    questionCount: course._count?.questions || 0,
                    status: course.status,
                    error: course.error,
                    href: `/admin/course/${course.id}`,
                  }}
                />
              </div>
            ))}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showCreate && (
            <CreateCourseDialog
              onClose={() => setShowCreate(false)}
              onCreated={(course) => {
                setCourses((prev) => [course, ...prev]);
                setPollingId(course.id);
                setShowCreate(false);
              }}
            />
          )}
        </AnimatePresence>
      </main>
    </AppShell>
  );
}

function StatsCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/15 to-cyan-500/15 text-teal-500">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateCourseDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (course: AdminCourse) => void;
}) {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("عمومی");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    if (!title.trim()) {
      toast.error("عنوان درس را وارد کنید");
      return;
    }
    if (!file) {
      toast.error("فایل PDF جزوه را انتخاب کنید");
      return;
    }
    setBusy(true);
    setError(null);
    setStep(1);
    setProgress(5);

    try {
      setPhase("در حال تبدیل صفحات PDF به تصویر...");
      const { renderPdfToImages } = await import("@/lib/pdf-client");
      const pages = await renderPdfToImages(file, {
        scale: 2,
        onProgress: ({ page, total }) => {
          setProgress(5 + Math.round((page / total) * 75));
          setPhase(`تبدیل صفحه ${toFa(page)} از ${toFa(total)}`);
        },
      });
      if (pages.length === 0) {
        throw new Error("هیچ صفحه‌ای در فایل PDF یافت نشد");
      }

      setPhase("در حال آپلود تصاویر و ایجاد درس...");
      setProgress(85);

      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("file", file);
      pages.forEach((p, i) => {
        formData.append(
          "images",
          p.blob,
          `page-${String(i + 1).padStart(3, "0")}.jpg`,
        );
      });
      formData.append(
        "meta",
        JSON.stringify(
          pages.map((p) => ({ width: p.width, height: p.height })),
        ),
      );

      const createRes = await fetch("/api/courses", {
        method: "POST",
        body: formData,
      });
      const createData = await createRes.json();
      if (!createRes.ok)
        throw new Error(createData.error ?? "خطا در ایجاد درس");
      const course = createData.course;
      setProgress(100);
      onCreated(course);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
      setStep(2);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute left-4 top-4 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        {step === 0 && (
          <>
            <h2 className="mb-1 text-lg font-bold">ایجاد درس جدید</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              اطلاعات درس و فایل PDF جزوه را وارد کنید
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>عنوان درس</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: آناتومی اندام فوقانی"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>توضیحات</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="توضیح کوتاهی درباره این درس..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>دسته‌بندی</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب دسته‌بندی" />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>فایل PDF جزوه</Label>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 p-8 text-center transition-colors hover:border-teal-500/50 hover:bg-teal-500/5">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {file ? file.name : "برای انتخاب فایل کلیک کنید"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {file
                      ? `${toFa(Math.round(file.size / 1024))} کیلوبایت`
                      : "پشتیبانی از PDF تا ۲۰۰ مگابایت"}
                  </span>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              {error && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={onClose}
                >
                  انصراف
                </Button>
                <Button
                  className="flex-1 rounded-xl"
                  onClick={handleCreate}
                  loading={busy}
                >
                  ایجاد درس
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <div className="py-6 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/15 to-cyan-500/15">
              {progress >= 100 ? (
                <Sparkles className="h-8 w-8 text-teal-500" />
              ) : (
                <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
              )}
            </div>
            <h3 className="mb-2 font-bold">
              {progress >= 100 ? "پردازش کامل شد!" : "در حال پردازش درس..."}
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">{phase}</p>
            <Progress
              value={progress}
              className="mx-auto max-w-xs"
              indicatorClassName="bg-gradient-to-l from-teal-500 to-cyan-500"
            />
            <p className="mt-3 text-xs text-muted-foreground">
              {toFa(progress)}٪
            </p>
            {error && (
              <div className="mt-4">
                <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(0);
                    setError(null);
                  }}
                >
                  بازگشت
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="py-6 text-center">
            <p className="mb-4 text-sm text-destructive">
              {error ?? "خطای ناشناخته"}
            </p>
            <Button variant="outline" onClick={() => setStep(0)}>
              تلاش مجدد
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
