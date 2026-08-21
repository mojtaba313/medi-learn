"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock,
  FilePlus2,
  FileQuestion,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toFa } from "@/lib/utils";
import { QUESTION_OPTIONS, OPTION_LABELS } from "@/lib/constants";

interface SampleSet {
  id: string;
  title: string;
  description: string | null;
  timeLimitMinutes: number | null;
  questionCount: number;
  attemptCount: number;
}

interface SampleQuestion {
  id: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation: string | null;
}

interface CourseProps {
  id: string;
  title: string;
  sets: SampleSet[];
}

export function SampleSetsAdmin({ course }: { course: CourseProps }) {
  const router = useRouter();
  const [sets, setSets] = useState<SampleSet[]>(course.sets);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);

  const selectedSet = sets.find((s) => s.id === selectedSetId) ?? null;

  async function reloadSets() {
    try {
      const res = await fetch(`/api/courses/${course.id}/sample-sets`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setSets(data.sets);
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Link
            href={`/admin/course/${course.id}`}
            className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            بازگشت به درس
          </Link>
          <h1 className="text-2xl font-bold sm:text-3xl">مجموعه‌های نمونه سوالات</h1>
          <p className="mt-1 text-muted-foreground">{course.title}</p>
        </div>
        <Button
          className="rounded-xl"
          onClick={() => setSelectedSetId("_new")}
        >
          <FilePlus2 className="ml-2" />
          مجموعه جدید
        </Button>
      </div>

      {selectedSetId && selectedSetId !== "_new" && selectedSet ? (
        <SetQuestionsPanel
          courseId={course.id}
          set={selectedSet}
          onBack={() => setSelectedSetId(null)}
          onChanged={reloadSets}
        />
      ) : selectedSetId === "_new" ? (
        <SetFormDialog
          courseId={course.id}
          onClose={() => setSelectedSetId(null)}
          onCreated={async () => {
            await reloadSets();
            setSelectedSetId(null);
            router.refresh();
          }}
        />
      ) : (
        <SetsGrid
          sets={sets}
          onManage={(id) => setSelectedSetId(id)}
          onChanged={reloadSets}
          courseId={course.id}
        />
      )}
    </div>
  );
}

function SetsGrid({
  sets,
  onManage,
  onChanged,
  courseId,
}: {
  sets: SampleSet[];
  onManage: (id: string) => void;
  onChanged: () => void;
  courseId: string;
}) {
  const [editing, setEditing] = useState<SampleSet | null>(null);
  const [deleting, setDeleting] = useState<SampleSet | null>(null);

  return (
    <div className="space-y-4">
      {sets.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <FileQuestion className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">هنوز مجموعه‌ای ایجاد نشده است.</p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sets.map((set) => (
          <Card key={set.id} className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-start justify-between gap-2 text-base">
                <span className="line-clamp-2">{set.title}</span>
                <div className="flex shrink-0 gap-1">
                  <Button size="iconSm" variant="ghost" onClick={() => setEditing(set)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="iconSm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setDeleting(set)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {set.description && (
                <p className="line-clamp-2 text-sm text-muted-foreground">{set.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{toFa(set.questionCount)} سوال</Badge>
                <Badge variant="outline">{toFa(set.attemptCount)} تلاش</Badge>
                {set.timeLimitMinutes ? (
                  <Badge className="gap-1">
                    <Clock className="h-3 w-3" />
                    {toFa(set.timeLimitMinutes)} دقیقه
                  </Badge>
                ) : (
                  <Badge variant="outline">بدون محدودیت زمان</Badge>
                )}
              </div>
              <Button className="w-full rounded-xl" onClick={() => onManage(set.id)}>
                مدیریت سوالات
                <ChevronRight className="mr-1 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {editing && (
        <SetFormDialog
          courseId={courseId}
          initial={editing}
          onClose={() => setEditing(null)}
          onCreated={async () => {
            await onChanged();
            setEditing(null);
          }}
        />
      )}

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف مجموعه</DialogTitle>
            <DialogDescription>
              آیا از حذف «{deleting?.title}» مطمئن هستید؟ تمام سوالات و تلاش‌های ثبت‌شده حذف
              خواهند شد.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              انصراف
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleting) return;
                const res = await fetch(
                  `/api/courses/${courseId}/sample-sets/${deleting.id}`,
                  { method: "DELETE" },
                );
                if (res.ok) {
                  toast.success("مجموعه حذف شد");
                  await onChanged();
                } else {
                  toast.error("خطا در حذف مجموعه");
                }
                setDeleting(null);
              }}
            >
              بله، حذف شود
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SetFormDialog({
  courseId,
  initial,
  onClose,
  onCreated,
}: {
  courseId: string;
  initial?: SampleSet | null;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [timeLimit, setTimeLimit] = useState<string>(
    initial?.timeLimitMinutes ? String(initial.timeLimitMinutes) : "",
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) {
      toast.error("عنوان مجموعه الزامی است");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        timeLimitMinutes: timeLimit ? Number(timeLimit) : null,
      };
      const isEdit = !!initial?.id;
      const res = await fetch(
        isEdit
          ? `/api/courses/${courseId}/sample-sets/${initial.id}`
          : `/api/courses/${courseId}/sample-sets`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error("خطا در ذخیره مجموعه");
      toast.success(isEdit ? "مجموعه به‌روزرسانی شد" : "مجموعه ایجاد شد");
      await onCreated();
      onClose();
    } catch {
      toast.error("خطا در ذخیره مجموعه");
    } finally {
      setSaving(false);
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-bold">مجموعه جدید</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>عنوان مجموعه</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: نمونه سوالات امتحان میان‌ترم" />
          </div>
          <div className="space-y-2">
            <Label>توضیحات (اختیاری)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>محدودیت زمان (دقیقه)</Label>
            <Input
              type="number"
              min={1}
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              placeholder="خالی = بدون محدودیت"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
              انصراف
            </Button>
            <Button className="flex-1 rounded-xl" loading={saving} onClick={save}>
              ایجاد مجموعه
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SetQuestionsPanel({
  courseId,
  set,
  onBack,
  onChanged,
}: {
  courseId: string;
  set: SampleSet;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [questions, setQuestions] = useState<SampleQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SampleQuestion | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<SampleQuestion | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/sample-sets/${set.id}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) setQuestions(data.set.questions ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [courseId, set.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(q: SampleQuestion) {
    const res = await fetch(`/api/courses/${courseId}/sample-sets/${set.id}/questions/${q.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("سوال حذف شد");
      setQuestions((prev) => prev.filter((x) => x.id !== q.id));
      await onChanged();
    } else {
      toast.error("خطا در حذف سوال");
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
            <ArrowRight className="ml-1 h-4 w-4 rotate-180" />
            بازگشت به مجموعه‌ها
          </Button>
          <h2 className="text-xl font-bold">{set.title}</h2>
          <p className="text-sm text-muted-foreground">{toFa(questions.length)} سوال</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => setBulkOpen(true)}>
            <FilePlus2 className="ml-2" />
            ورود گروهی
          </Button>
          <Button className="rounded-xl" onClick={() => setCreating(true)}>
            <FilePlus2 className="ml-2" />
            سوال جدید
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="py-10 text-center text-muted-foreground">در حال بارگذاری…</p>
      ) : questions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <FileQuestion className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">سوالی برای این مجموعه ثبت نشده است.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <Card key={q.id} className="border-border/60">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Badge variant="secondary" className="mb-2 gap-1">
                      سوال {toFa(i + 1)}
                    </Badge>
                    <p className="mb-3 font-medium leading-7">{q.text}</p>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {QUESTION_OPTIONS.map((opt) => {
                        const isCorrect = opt === q.correctOption;
                        return (
                          <div
                            key={opt}
                            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
                              isCorrect
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-muted/50 text-muted-foreground"
                            }`}
                          >
                            <span className="font-semibold">
                              {toFa(opt === "A" ? "۱" : opt === "B" ? "۲" : opt === "C" ? "۳" : "۴")}
                            </span>
                            <span className="truncate">{q[`option${opt}` as keyof SampleQuestion] as string}</span>
                            {isCorrect && <Check className="mr-auto h-4 w-4" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <Button size="iconSm" variant="ghost" onClick={() => setEditing(q)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="iconSm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setDeleting(q)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <QuestionFormDialog
          courseId={courseId}
          setId={set.id}
          initial={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={async () => {
            setEditing(null);
            setCreating(false);
            await load();
            await onChanged();
          }}
        />
      )}

      {bulkOpen && (
        <BulkImportDialog
          courseId={courseId}
          setId={set.id}
          onOpenChange={setBulkOpen}
          onImported={async () => {
            await load();
            await onChanged();
          }}
        />
      )}

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف سوال</DialogTitle>
            <DialogDescription>آیا از حذف این سوال مطمئن هستید؟</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              انصراف
            </Button>
            <Button variant="destructive" onClick={() => deleting && handleDelete(deleting)}>
              بله، حذف شود
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type QuestionForm = {
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation: string;
};

function QuestionFormDialog({
  courseId,
  setId,
  initial,
  onClose,
  onSaved,
}: {
  courseId: string;
  setId: string;
  initial: SampleQuestion | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [form, setForm] = useState<QuestionForm>(() => ({
    text: initial?.text ?? "",
    optionA: initial?.optionA ?? "",
    optionB: initial?.optionB ?? "",
    optionC: initial?.optionC ?? "",
    optionD: initial?.optionD ?? "",
    correctOption: initial?.correctOption ?? "A",
    explanation: initial?.explanation ?? "",
  }));
  const [saving, setSaving] = useState(false);

  const valid =
    form.text.trim() &&
    form.optionA.trim() &&
    form.optionB.trim() &&
    form.optionC.trim() &&
    form.optionD.trim();

  async function save() {
    setSaving(true);
    try {
      const isEdit = !!initial;
      const res = await fetch(
        `/api/courses/${courseId}/sample-sets/${setId}/questions${isEdit ? `/${initial!.id}` : ""}`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      if (!res.ok) throw new Error("خطا در ذخیره سوال");
      toast.success(isEdit ? "سوال به‌روزرسانی شد" : "سوال ایجاد شد");
      await onSaved();
      onClose();
    } catch {
      toast.error("خطا در ذخیره سوال");
    } finally {
      setSaving(false);
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
        className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between">
          <h2 className="text-lg font-bold">{initial ? "ویرایش سوال" : "سوال جدید"}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>متن سوال</Label>
            <Textarea
              value={form.text}
              onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))}
              rows={3}
              autoFocus
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {QUESTION_OPTIONS.map((opt) => (
              <div key={opt} className="space-y-1.5">
                <Label>{OPTION_LABELS[opt]}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={form[`option${opt}` as keyof QuestionForm] as string}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, [`option${opt}`]: e.target.value } as QuestionForm))
                    }
                  />
                  <button
                    onClick={() => setForm((p) => ({ ...p, correctOption: opt }))}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors ${
                      form.correctOption === opt
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-500"
                        : "border-input text-muted-foreground hover:border-emerald-500/50"
                    }`}
                    title="پاسخ صحیح"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label>توضیح پاسخ (اختیاری)</Label>
            <Textarea
              value={form.explanation}
              onChange={(e) => setForm((p) => ({ ...p, explanation: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
              انصراف
            </Button>
            <Button className="flex-1 rounded-xl" disabled={!valid} loading={saving} onClick={save}>
              {initial ? "ذخیره تغییرات" : "ایجاد سوال"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function BulkImportDialog({
  courseId,
  setId,
  onOpenChange,
  onImported,
}: {
  courseId: string;
  setId: string;
  onOpenChange: (open: boolean) => void;
  onImported: () => void | Promise<void>;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleImport() {
    let parsed: unknown[];
    try {
      parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) throw new Error();
    } catch {
      toast.error("فرمت JSON نامعتبر است");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/sample-sets/${setId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: parsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در ورود سوالات");
      toast.success(`${toFa(data.count)} سوال وارد شد`);
      onOpenChange(false);
      setContent("");
      await onImported();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ورود سوالات");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>ورود گروهی سوالات (JSON)</DialogTitle>
          <DialogDescription>
            آرایه‌ای از اشیاء با کلیدهای: text, optionA, optionB, optionC, optionD,
            correctOption (A/B/C/D), explanation
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          dir="ltr"
          className="font-mono text-xs text-left"
          placeholder='[{"text":"...","optionA":"...","optionB":"...","optionC":"...","optionD":"...","correctOption":"B","explanation":"..."}]'
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button onClick={handleImport} loading={loading}>
            ورود سوالات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
