"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowRight,
  BookOpen,
  FileQuestion,
  Image as ImageIcon,
  Pencil,
  Save,
  Trash2,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { toFa } from "@/lib/utils";
import { COURSE_CATEGORIES } from "@/lib/constants";

interface CourseDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  coverUrl: string | null;
  status: string;
  totalPages: number;
  pages: { id: string; pageNumber: number; imageUrl: string; width: number; height: number }[];
  questionCount: number;
}

export function CourseDetailClient({ course }: { course: CourseDetail }) {
  const router = useRouter();
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description);
  const [category, setCategory] = useState(course.category);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      toast.success("اطلاعات درس به‌روزرسانی شد");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ذخیره");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/courses/${course.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("خطا در حذف");
      toast.success("درس حذف شد");
      router.push("/admin");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در حذف");
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Link
            href="/admin"
            className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            بازگشت به پنل مدیریت
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold sm:text-3xl">{course.title}</h1>
            <Badge variant="secondary">{course.category}</Badge>
          </div>
          <p className="mt-1 text-muted-foreground">{course.description || "بدون توضیحات"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild className="rounded-xl">
            <Link href={`/admin/course/${course.id}/questions`}>
              <FileQuestion className="ml-2" />
              مدیریت سوالات
            </Link>
          </Button>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="rounded-xl">
                <Trash2 className="ml-2" />
                حذف
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>حذف درس</DialogTitle>
                <DialogDescription>
                  آیا از حذف «{course.title}» مطمئن هستید؟ تمام صفحات، حاشیه‌نویسی‌ها و سوالات این
                  درس حذف خواهند شد.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                  انصراف
                </Button>
                <Button variant="destructive" onClick={handleDelete} loading={deleting}>
                  بله، حذف شود
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Pencil className="h-4 w-4 text-teal-500" />
                ویرایش اطلاعات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>عنوان</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>توضیحات</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
              </div>
              <div className="space-y-2">
                <Label>دسته‌بندی</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
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
              <Button onClick={handleSave} loading={saving} className="w-full rounded-xl">
                <Save className="ml-2" />
                ذخیره تغییرات
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <ImageIcon className="mx-auto mb-1 h-5 w-5 text-teal-500" />
                <p className="text-2xl font-bold">{toFa(course.totalPages)}</p>
                <p className="text-xs text-muted-foreground">صفحه</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <BookOpen className="mx-auto mb-1 h-5 w-5 text-cyan-500" />
                <p className="text-2xl font-bold">{toFa(course.questionCount)}</p>
                <p className="text-xs text-muted-foreground">سوال</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <ImageIcon className="h-4 w-4 text-teal-500" />
                صفحات جزوه
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {toFa(course.pages.length)} صفحه
              </span>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {course.pages.map((page, i) => (
                  <motion.div
                    key={page.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.02 }}
                    className="group relative overflow-hidden rounded-lg border border-border/60"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={page.imageUrl}
                      alt={`صفحه ${page.pageNumber}`}
                      className="aspect-[3/4] w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                    <span className="absolute bottom-1.5 left-1.5 rounded-md bg-background/85 px-1.5 py-0.5 text-xs font-medium backdrop-blur">
                      {toFa(page.pageNumber)}
                    </span>
                  </motion.div>
                ))}
                {course.pages.length === 0 && (
                  <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                    هنوز صفحه‌ای پردازش نشده است.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}