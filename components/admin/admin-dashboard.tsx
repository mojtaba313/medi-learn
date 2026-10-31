"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, Layers, Loader2, Plus, Sparkles, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
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
import { NOTE_CATEGORIES } from "@/lib/constants";

interface AdminNote {
  id: string;
  title: string;
  cardTitle: string;
  description: string;
  category?: string;
  kind: string;
  order: number;
  _count: { questions: number; flashcards: number; assets: number };
}

export function AdminDashboard({
  initialNotes,
}: {
  initialNotes: AdminNote[];
}) {
  const [notes, setNotes] = useState<AdminNote[]>(initialNotes);
  const [showCreate, setShowCreate] = useState(false);

  const totalAssets = notes.reduce(
    (s, n) => s + (n._count?.assets || 0),
    0,
  );
  const totalQuestions = notes.reduce(
    (s, n) => s + (n._count?.questions || 0),
    0,
  );
  const totalFlashcards = notes.reduce(
    (s, n) => s + (n._count?.flashcards || 0),
    0,
  );
  const totalBlocks = notes.reduce(
    (s, n) => s + (n._count?.assets || 0),
    0,
  );

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">پنل مدیریت</h1>
            <p className="mt-1 text-muted-foreground">
              مدیریت جزوه‌ها، سوالات و فلش‌کارت‌ها
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="rounded-xl">
            <Plus className="ml-2" />
            ایجاد جزوه جدید
          </Button>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatsCard
            icon={BookOpen}
            label="جزوه‌ها"
            value={toFa(notes.length)}
          />
          <StatsCard
            icon={Sparkles}
            label="دارایی‌ها"
            value={toFa(
              notes.reduce((s, n) => s + (n._count?.assets || 0), 0),
            )}
          />
          <StatsCard
            icon={TrendingUp}
            label="سوالات"
            value={toFa(
              notes.reduce((s, n) => s + (n._count?.questions || 0), 0),
            )}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {notes.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center"
            >
              <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 font-semibold">هنوز جزوه‌ای ندارید</h3>
              <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                اولین جزوه خود را بسازید و محتوای خود را آپلود کنید.
              </p>
              <Button
                onClick={() => setShowCreate(true)}
                className="rounded-xl"
              >
                <Plus className="ml-2" />
                ایجاد جزوه جدید
              </Button>
            </motion.div>
          )}
          <AnimatePresence>
            {notes.map((note, i) => (
              <div key={note.id} className="relative">
                <NoteCard
                  index={i}
                  note={{
                    id: note.id,
                    title: note.title,
                    description: note.description,
                    kind: note.kind,
                    order: note.order,
                    assetCount: note._count?.assets || 0,
                    questionCount: note._count?.questions || 0,
                    flashcardCount: note._count?.flashcards || 0,
                    href: `/admin/modules/${note.id}`,
                  }}
                />
              </div>
            ))}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showCreate && (
            <CreateNoteDialog
              onClose={() => setShowCreate(false)}
              onCreated={(note) => {
                setNotes((prev) => [note, ...prev]);
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
  sub?: string;
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
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function NoteCard({
  index,
  note,
}: {
  index: number;
  note: {
    id: string;
    title: string;
    description: string;
    kind: string;
    order: number;
    assetCount: number;
    questionCount: number;
    flashcardCount: number;
    href: string;
  };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.08 }}
    >
      <a
        href={note.href}
        className="group flex flex-col h-full rounded-2xl border border-border/60 bg-card/60 p-5 shadow-sm transition-all hover:border-teal-500/40 hover:shadow-lg"
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">جزوه {note.order}</Badge>
          <Badge variant="outline">{note.kind}</Badge>
        </div>
        <h3 className="mb-2 text-lg font-bold group-hover:text-teal-600">{note.title}</h3>
        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{note.description}</p>
        <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-4 w-4" />
            {note.assetCount} دارایی
          </span>
          <span className="flex items-center gap-1">
            <span className="h-4 w-4" />
            {note.questionCount} سوال
          </span>
          <span className="flex items-center gap-1">
            <span className="h-4 w-4" />
            {note.flashcardCount} فلش‌کارت
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 group-hover:underline">
          ویرایش جزوه
          <Layers className="h-4 w-4" />
        </span>
      </a>
    </motion.div>
  );
}

function Badge({
  children,
  variant = "secondary",
}: {
  children: React.ReactNode;
  variant?: "secondary" | "outline";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        variant === "secondary"
          ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
          : "border border-border text-muted-foreground"
      }`}
    >
      {children}
    </span>
  );
}

function CreateNoteDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (note: {
    id: string;
    title: string;
    cardTitle: string;
    description: string;
    kind: string;
    order: number;
    _count: { questions: number; flashcards: number; assets: number };
  }) => void;
}) {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState("STRUCTURED");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    if (!title.trim()) {
      toast.error("عنوان جزوه را وارد کنید");
      return;
    }
    if (!file) {
      toast.error("فایل ZIP جزوه را انتخاب کنید");
      return;
    }
    setBusy(true);
    setError(null);
    setStep(1);
    setProgress(5);

    try {
      setPhase("در حال پردازش فایل ZIP...");
      setProgress(10);

      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("kind", kind);
      formData.append("file", file);

      setProgress(30);
      setPhase("در حال آپلود و پردازش...");

      const createRes = await fetch("/api/modules/import", {
        method: "POST",
        body: formData,
      });
      const createData = await createRes.json();
      if (!createRes.ok)
        throw new Error(createData.error ?? "خطا در ایجاد جزوه");
      const note = createData.note;
      setProgress(100);
      onCreated(note);
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
            <h2 className="mb-1 text-lg font-bold">ایجاد جزوه جدید</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              اطلاعات جزوه و فایل ZIP (حاوی دروس، تصاویر و سوالات) را آپلود کنید
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>عنوان جزوه</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: ژنتیک پزشکی"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>توضیحات</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="توضیح کوتاهی درباره این جزوه..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>نوع جزوه</Label>
                <Select value={kind} onValueChange={setKind}>
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب نوع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STRUCTURED">ساختاریافته (متن + تصاویر)</SelectItem>
                    <SelectItem value="IMAGE_ONLY">فقط تصویری (PDF)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>فایل ZIP جزوه</Label>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 p-8 text-center transition-colors hover:border-teal-500/50 hover:bg-teal-500/5">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {file ? file.name : "برای انتخاب فایل کلیک کنید"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {file
                      ? `${toFa(Math.round(file.size / 1024))} کیلوبایت`
                      : "پشتیبانی از ZIP تا ۲۰۰ مگابایت"}
                  </span>
                  <input
                    type="file"
                    accept=".zip"
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
                  ایجاد جزوه
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
              {progress >= 100 ? "پردازش کامل شد!" : "در حال پردازش جزوه..."}
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