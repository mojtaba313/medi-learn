"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  Eye,
  FilePlus2,
  FileQuestion,
  FileUp,
  HelpCircle,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toFa } from "@/lib/utils";
import { QUESTION_OPTIONS, OPTION_LABELS } from "@/lib/constants";

interface Question {
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
  createdAt: string;
  response?: { selectedOption: string | null; isCorrect: boolean | null } | null;
}

interface QuestionBuilderProps {
  course: {
    id: string;
    title: string;
    pages: number[];
    questions: Question[];
  };
}

export function QuestionBuilder({ course }: QuestionBuilderProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>(course.questions);
  const [editing, setEditing] = useState<Question | null>(null);
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState<Question | null>(null);
  const [search, setSearch] = useState("");
  const [pageFilter, setPageFilter] = useState<string>("all");
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      const matchesSearch =
        !search ||
        q.text.toLowerCase().includes(search.toLowerCase()) ||
        q.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      const matchesPage =
        pageFilter === "all" ||
        (pageFilter === "none" && q.pageNumber === null) ||
        (pageFilter !== "none" && q.pageNumber === Number(pageFilter));
      return matchesSearch && matchesPage;
    });
  }, [questions, search, pageFilter]);

  async function handleSave(form: QuestionForm) {
    setSaving(true);
    try {
      const isEdit = !!editing;
      const res = await fetch(
        isEdit
          ? `/api/courses/${course.id}/questions/${editing.id}`
          : `/api/courses/${course.id}/questions`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در ذخیره سوال");

      if (isEdit) {
        setQuestions((prev) => prev.map((q) => (q.id === editing.id ? { ...q, ...form } : q)));
        toast.success("سوال به‌روزرسانی شد");
      } else {
        setQuestions((prev) => [...prev, data.question]);
        toast.success("سوال جدید ایجاد شد");
      }
      setEditing(null);
      setCreating(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ذخیره سوال");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/courses/${course.id}/questions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("خطا در حذف");
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      toast.success("سوال حذف شد");
      router.refresh();
    } catch {
      toast.error("خطا در حذف سوال");
    }
  }

  const answered = questions.filter((q) => q.response?.selectedOption).length;
  const correctCount = questions.filter((q) => q.response?.isCorrect).length;

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link
            href={`/admin/course/${course.id}`}
            className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            بازگشت به درس
          </Link>
          <h1 className="text-2xl font-bold sm:text-3xl">مدیریت سوالات</h1>
          <p className="mt-1 text-muted-foreground">
            {course.title} • {toFa(questions.length)} سوال
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => setImportOpen(true)}>
            <FileUp className="ml-2" />
            ورود گروهی
          </Button>
          <Button className="rounded-xl" onClick={() => setCreating(true)}>
            <FilePlus2 className="ml-2" />
            سوال جدید
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="کل سوالات" value={toFa(questions.length)} color="text-teal-500" />
        <MiniStat label="پاسخ داده شده" value={toFa(answered)} color="text-cyan-500" />
        <MiniStat label="پاسخ صحیح" value={toFa(correctCount)} color="text-emerald-500" />
        <MiniStat
          label="بدون پاسخ"
          value={toFa(questions.length - answered)}
          color="text-amber-500"
        />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو در متن سوالات..."
            className="pr-10"
          />
        </div>
        <Select value={pageFilter} onValueChange={setPageFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="فیلتر صفحه" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه صفحات</SelectItem>
            <SelectItem value="none">بدون صفحه</SelectItem>
            {course.pages.map((p) => (
              <SelectItem key={p} value={String(p)}>
                صفحه {toFa(p)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {filtered.map((q, i) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="border-border/60 transition-colors hover:border-teal-500/40">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="gap-1">
                          <HelpCircle className="h-3 w-3" />
                          سوال {toFa(i + 1)}
                        </Badge>
                        {q.pageNumber !== null ? (
                          <Badge className="gap-1">
                            صفحه {toFa(q.pageNumber)}
                          </Badge>
                        ) : (
                          <Badge variant="outline">عمومی</Badge>
                        )}
                        {q.response?.isCorrect === true && (
                          <Badge variant="success">پاسخ صحیح داده شده</Badge>
                        )}
                        {q.response?.isCorrect === false && (
                          <Badge variant="destructive">پاسخ اشتباه داده شده</Badge>
                        )}
                        {q.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="bg-accent text-accent-foreground">
                            {tag}
                          </Badge>
                        ))}
                      </div>
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
                              <span className="font-semibold">{toFa(opt === "A" ? "۱" : opt === "B" ? "۲" : opt === "C" ? "۳" : "۴")}</span>
                              <span className="truncate">{q[`option${opt}` as keyof typeof q] as string}</span>
                              {isCorrect && <Check className="mr-auto h-4 w-4" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      <Button size="iconSm" variant="ghost" onClick={() => setPreview(q)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="iconSm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(q);
                          setCreating(false);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="iconSm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDelete(q.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <FileQuestion className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground">سوالی یافت نشد</p>
          </div>
        )}
      </div>

      {(creating || editing) && (
        <QuestionFormDialog
          key={editing?.id ?? "new"}
          pages={course.pages}
          initial={editing}
          saving={saving}
          onSave={handleSave}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}

      {preview && (
        <QuestionPreview question={preview} onClose={() => setPreview(null)} />
      )}

      <BulkImportDialog
        courseId={course.id}
        pages={course.pages}
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={(count) => {
          toast.success(`${toFa(count)} سوال با موفقیت وارد شد`);
          router.refresh();
        }}
      />
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
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
  pageNumber: number | null;
  tags: string[];
};

function QuestionFormDialog({
  pages,
  initial,
  saving,
  onSave,
  onClose,
}: {
  pages: number[];
  initial: Question | null;
  saving: boolean;
  onSave: (form: QuestionForm) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<QuestionForm>(() => ({
    text: initial?.text ?? "",
    optionA: initial?.optionA ?? "",
    optionB: initial?.optionB ?? "",
    optionC: initial?.optionC ?? "",
    optionD: initial?.optionD ?? "",
    correctOption: initial?.correctOption ?? "A",
    explanation: initial?.explanation ?? "",
    pageNumber: initial?.pageNumber ?? null,
    tags: initial?.tags ?? [],
  }));
  const [tagInput, setTagInput] = useState("");

  function update<K extends keyof QuestionForm>(key: K, value: QuestionForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addTag() {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      update("tags", [...form.tags, tag]);
    }
    setTagInput("");
  }

  const valid =
    form.text.trim() && form.optionA.trim() && form.optionB.trim() && form.optionC.trim() && form.optionD.trim();

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
        className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">{initial ? "ویرایش سوال" : "سوال جدید"}</h2>
            <p className="text-sm text-muted-foreground">
              {initial ? "تغییرات را ذخیره کنید" : "متن سوال و گزینه‌ها را وارد کنید"}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>متن سوال</Label>
            <Textarea
              value={form.text}
              onChange={(e) => update("text", e.target.value)}
              placeholder="متن کامل سوال را بنویسید..."
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
                    onChange={(e) => update(`option${opt}` as keyof QuestionForm, e.target.value)}
                    placeholder={`متن ${OPTION_LABELS[opt]}...`}
                  />
                  <button
                    onClick={() => update("correctOption", opt)}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors ${
                      form.correctOption === opt
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-500"
                        : "border-input text-muted-foreground hover:border-emerald-500/50"
                    }`}
                    title="انتخاب به‌عنوان پاسخ صحیح"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>صفحه مرتبط</Label>
              <Select
                value={form.pageNumber === null ? "none" : String(form.pageNumber)}
                onValueChange={(v) => update("pageNumber", v === "none" ? null : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">عمومی (بدون صفحه)</SelectItem>
                  {pages.map((p) => (
                    <SelectItem key={p} value={String(p)}>
                      صفحه {toFa(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>برچسب‌ها</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="مثال: آناتومی، قلب"
                />
                <Button type="button" variant="outline" size="icon" onClick={addTag}>
                  <FilePlus2 className="h-4 w-4" />
                </Button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button onClick={() => update("tags", form.tags.filter((t) => t !== tag))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>توضیح پاسخ</Label>
            <Textarea
              value={form.explanation}
              onChange={(e) => update("explanation", e.target.value)}
              placeholder="توضیح تشریحی برای پاسخ صحیح..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
              انصراف
            </Button>
            <Button
              className="flex-1 rounded-xl"
              disabled={!valid}
              loading={saving}
              onClick={() => onSave(form)}
            >
              {initial ? "ذخیره تغییرات" : "ایجاد سوال"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function QuestionPreview({
  question,
  onClose,
}: {
  question: Question;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

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
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-teal-500" />
            <h3 className="font-bold">پیش‌نمایش به‌عنوان دانشجو</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <Badge variant="secondary">
            {question.pageNumber ? `صفحه ${toFa(question.pageNumber)}` : "عمومی"}
          </Badge>
        </div>
        <p className="mb-5 text-base font-medium leading-7">{question.text}</p>
        <div className="space-y-2">
          {QUESTION_OPTIONS.map((opt) => {
            const text = question[`option${opt}` as keyof Question] as string;
            const isSelected = selected === opt;
            const showResult = selected !== null;
            const isCorrect = opt === question.correctOption;
            return (
              <button
                key={opt}
                onClick={() => !showResult && setSelected(opt)}
                disabled={showResult}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-right text-sm transition-all ${
                  showResult && isCorrect
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : showResult && isSelected && !isCorrect
                    ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400"
                    : isSelected
                    ? "border-teal-500 bg-teal-500/10"
                    : "border-border bg-card hover:border-teal-500/50 hover:bg-accent"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    showResult && isCorrect
                      ? "bg-emerald-500 text-white"
                      : showResult && isSelected && !isCorrect
                      ? "bg-red-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {showResult && isCorrect ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    toFa(opt === "A" ? "۱" : opt === "B" ? "۲" : opt === "C" ? "۳" : "۴")
                  )}
                </span>
                {text}
              </button>
            );
          })}
        </div>
        {selected !== null && question.explanation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-xl border border-teal-500/30 bg-teal-500/10 p-4"
          >
            <p className="mb-1 text-sm font-bold text-teal-600 dark:text-teal-400">
              توضیح پاسخ:
            </p>
            <p className="text-sm leading-6">{question.explanation}</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

function BulkImportDialog({
  courseId,
  pages,
  open,
  onOpenChange,
  onImported,
}: {
  courseId: string;
  pages: number[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (count: number) => void;
}) {
  const [tab, setTab] = useState<"csv" | "json">("csv");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const csvTemplate = `text,optionA,optionB,optionC,optionD,correctOption,explanation,pageNumber,tags
"اولین سوال آزمایشی","گزینه یک","گزینه دو","گزینه سه","گزینه چهار",B,"توضیح پاسخ",1,"آناتومی;قلب"`;

  async function handleImport() {
    if (!content.trim()) {
      toast.error("محتوا را وارد کنید");
      return;
    }
    setLoading(true);
    try {
      const questions = parseBulk(content, tab, pages);
      if (questions.length === 0) {
        toast.error("سوال معتبری یافت نشد");
        return;
      }
      const res = await fetch(`/api/courses/${courseId}/questions/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در ورود سوالات");
      onImported(data.count);
      onOpenChange(false);
      setContent("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ورود سوالات");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>ورود گروهی سوالات</DialogTitle>
          <DialogDescription>
            سوالات را به‌صورت CSV یا JSON وارد کنید
          </DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "csv" | "json")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="csv">CSV</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
          </TabsList>
          <TabsContent value="csv">
            <p className="mb-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              ستون‌ها: text, optionA, optionB, optionC, optionD, correctOption, explanation,
              pageNumber, tags (با ; جدا شوند)
            </p>
            <div className="mb-2">
              <Button variant="ghost" size="sm" onClick={() => setContent(csvTemplate)}>
                درج نمونه
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="json">
            <p className="mb-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              آرایه‌ای از اشیاء با کلیدهای: text, optionA-D, correctOption, explanation,
              pageNumber, tags
            </p>
          </TabsContent>
        </Tabs>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={tab === "csv" ? csvTemplate : `[{"text": "...", "optionA": "...", ...}]`}
          rows={10}
          dir="ltr"
          className="font-mono text-xs text-left"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button onClick={handleImport} loading={loading}>
            <FileUp className="ml-2" />
            ورود سوالات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function parseBulk(content: string, tab: "csv" | "json", pages: number[]): unknown[] {
  if (tab === "json") {
    try {
      const data = JSON.parse(content);
      return Array.isArray(data) ? data : [];
    } catch {
      toast.error("JSON نامعتبر است");
      return [];
    }
  }

  const validPages = new Set(pages);
  const rows = content
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length === 0) return [];

  const headers = rows[0]
    .split(",")
    .map((h) => h.replace(/["']/g, "").trim().toLowerCase());

  const headerIndex = new Map(headers.map((h, i) => [h, i]));

  const parseRow = (raw: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (ch === '"') {
        if (inQuotes && raw[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    values.push(current);
    return values.map((v) => v.replace(/^"|"$/g, "").trim());
  };

  const questions: unknown[] = [];

  for (let r = 1; r < rows.length; r++) {
    const values = parseRow(rows[r]);
    const get = (key: string) => {
      const idx = headerIndex.get(key);
      return idx !== undefined ? values[idx] ?? "" : "";
    };

    const text = get("text") || get("question");
    if (!text) continue;

    const optionA = get("optiona") || get("option1") || get("a");
    const optionB = get("optionb") || get("option2") || get("b");
    const optionC = get("optionc") || get("option3") || get("c");
    const optionD = get("optiond") || get("option4") || get("d");

    if (!optionA || !optionB || !optionC || !optionD) continue;

    let correct = (get("correctoption") || get("correct") || get("answer") || "").trim().toUpperCase();
    const correctMap: Record<string, string> = { A: "A", B: "B", C: "C", D: "D" };
    correct = correctMap[correct] ?? correctMap[String(optionA === get("answer") ? "A" : "")] ?? "A";

    const pageNumRaw = parseInt(get("pagenumber") || get("page") || "", 10);
    const pageNumber =
      Number.isInteger(pageNumRaw) && validPages.has(pageNumRaw) ? pageNumRaw : null;

    const tags = (get("tags") || "").split(";").map((t) => t.trim()).filter(Boolean);

    questions.push({
      text,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption: correct,
      explanation: get("explanation"),
      pageNumber,
      tags,
    });
  }

  return questions;
}