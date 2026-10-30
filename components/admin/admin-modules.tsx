"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  FileJson,
  FileQuestion,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toFa, formatDate } from "@/lib/utils";

interface AdminModule {
  id: string;
  title: string;
  cardTitle: string;
  description: string;
  lessonCount: number;
  questionCount: number;
  flashcardCount: number;
  createdAt: string;
}

interface LessonJson {
  id: string;
  title: string;
  html: string;
  order?: number;
  mins?: string;
  source?: string;
  summary?: string;
}

interface ModuleJson {
  id: string;
  title: string;
  description: string;
  [key: string]: unknown;
}

const isLesson = (value: unknown): value is LessonJson => {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.html === "string"
  );
};

const isModule = (value: unknown): value is ModuleJson => {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.description === "string" &&
    !isLesson(value)
  );
};

export function AdminModules({
  initialModules,
}: {
  initialModules: AdminModule[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((current) => [...current, ...Array.from(list)]);
    setError("");
  };

  const importFiles = async () => {
    if (!files.length) {
      setError("ابتدا فایل‌های JSON را انتخاب کنید.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      let moduleData: ModuleJson | null = null;
      const lessons: LessonJson[] = [];

      for (const file of files) {
        const text = await file.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error(`فایل «${file.name}» JSON معتبر نیست.`);
        }

        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (isLesson(item)) lessons.push(item);
          }
          continue;
        }

        if (isLesson(parsed)) {
          lessons.push(parsed);
          continue;
        }

        if (isModule(parsed)) {
          moduleData = parsed;
          const bundled = (parsed as { lessons?: unknown }).lessons;
          if (Array.isArray(bundled)) {
            for (const item of bundled) {
              if (isLesson(item)) lessons.push(item);
            }
          }
        }
      }

      if (!moduleData) throw new Error("فایل ماژول (module.json) پیدا نشد.");
      if (!lessons.length) throw new Error("هیچ فایل درسی پیدا نشد.");

      const res = await fetch("/api/modules/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: moduleData, lessons }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error ?? "وارد کردن ماژول انجام نشد.");
      }

      toast.success(
        `ماژول «${moduleData.title}» وارد شد: ${toFa(data.counts.lessons)} درس، ${toFa(
          data.counts.questions,
        )} سوال، ${toFa(data.counts.flashcards)} فلش‌کارت`,
      );
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-medium text-teal-600 dark:text-teal-400">
              <BookOpen className="h-3.5 w-3.5" />
              مدیریت محتوا
            </div>
            <h1 className="text-2xl font-bold sm:text-3xl">ماژول‌های مطالعه</h1>
            <p className="mt-1 text-muted-foreground">
              ماژول‌های JSON و درس‌های آن‌ها را وارد یا به‌روزرسانی کنید.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/admin">
              <ArrowLeft className="ml-2 h-4 w-4" />
              بازگشت به پنل
            </Link>
          </Button>
        </div>

        <Card className="mb-8 border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4 text-teal-500" />
              وارد کردن ماژول
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-7 text-muted-foreground">
              فایل <code className="rounded bg-muted px-1">module.json</code> و همهٔ
              فایل‌های درس (مثل <code className="rounded bg-muted px-1">01-*.json</code>)
              را یکجا انتخاب کنید. اگر فایل ماژول شامل آرایهٔ{" "}
              <code className="rounded bg-muted px-1">lessons</code> باشد، فقط همان یک
              فایل کافی است.
            </p>

            <label
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                addFiles(event.dataTransfer.files);
              }}
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center transition-colors hover:border-teal-500/40 hover:bg-muted/40"
            >
              <FileJson className="mb-3 h-9 w-9 text-muted-foreground/60" />
              <span className="text-sm font-medium">
                فایل‌ها را اینجا رها کنید یا کلیک کنید
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                فقط فایل‌های JSON
              </span>
              <input
                ref={inputRef}
                type="file"
                accept="application/json,.json"
                multiple
                className="hidden"
                onChange={(event) => addFiles(event.target.files)}
              />
            </label>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs"
                  >
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFiles((current) => current.filter((_, i) => i !== index))
                      }
                      className="text-muted-foreground hover:text-destructive"
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button onClick={importFiles} disabled={uploading || files.length === 0}>
                {uploading ? (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="ml-2 h-4 w-4" />
                )}
                {uploading ? "در حال وارد کردن…" : "وارد کردن ماژول"}
              </Button>
              {files.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFiles([]);
                    setError("");
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                  disabled={uploading}
                >
                  پاک کردن
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">ماژول‌های موجود</h2>
          <span className="text-xs text-muted-foreground">
            {toFa(initialModules.length)} ماژول
          </span>
        </div>

        {initialModules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
            هنوز ماژولی وارد نشده است.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {initialModules.map((module) => (
              <Card key={module.id} className="border-border/60">
                <CardContent className="p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{module.id}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(module.createdAt)}
                    </span>
                  </div>
                  <h3 className="font-semibold leading-7">{module.cardTitle}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-6 text-muted-foreground">
                    {module.description}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5 text-teal-500" />
                      {toFa(module.lessonCount)} درس
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FileQuestion className="h-3.5 w-3.5 text-violet-500" />
                      {toFa(module.questionCount)} سوال
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Brain className="h-3.5 w-3.5 text-amber-500" />
                      {toFa(module.flashcardCount)} فلش‌کارت
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-end">
                    <Link
                      href={`/modules/${module.id}`}
                      className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
                    >
                      مشاهده ماژول
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
