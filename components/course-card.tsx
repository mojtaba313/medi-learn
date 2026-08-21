"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { BookOpen, FileQuestion, Image as ImageIcon, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toFa } from "@/lib/utils";

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description: string;
    category: string;
    coverUrl: string | null;
    totalPages: number;
    questionCount?: number;
    status?: string;
    error?: string | null;
    pageProgress?: number;
    annotatedPages?: number;
    href?: string;
    footer?: React.ReactNode;
  };
  index?: number;
}

export function CourseCard({ course, index = 0 }: CourseCardProps) {
  const href = course.href ?? `/study/${course.id}`;
  const isProcessing = course.status === "PROCESSING";
  const isFailed = course.status === "FAILED";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="h-full"
    >
      <Link href={href} className="block h-full">
        <Card className="group h-full overflow-hidden border-border/60 transition-all hover:-translate-y-1 hover:border-teal-500/40 hover:shadow-xl hover:shadow-teal-500/10">
          <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-teal-500/20 to-cyan-500/20">
            {course.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.coverUrl}
                alt={course.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <BookOpen className="h-12 w-12 text-teal-500/40" />
              </div>
            )}
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
                  <span className="text-sm font-medium">در حال پردازش...</span>
                </div>
              </div>
            )}
            {isFailed && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                <span className="text-sm font-medium text-destructive">پردازش ناموفق بود</span>
              </div>
            )}
            <Badge className="absolute right-3 top-3 bg-background/80 text-foreground backdrop-blur-md">
              {course.category}
            </Badge>
          </div>
          <CardContent className="p-5">
            <h3 className="mb-1 line-clamp-1 font-bold">{course.title}</h3>
            <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
              {course.description || "بدون توضیحات"}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" />
                {toFa(course.totalPages)} صفحه
              </span>
              {course.questionCount !== undefined && (
                <span className="flex items-center gap-1.5">
                  <FileQuestion className="h-3.5 w-3.5" />
                  {toFa(course.questionCount)} سوال
                </span>
              )}
            </div>
            {course.pageProgress !== undefined && (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    پیشرفت مطالعه: {toFa(course.annotatedPages ?? 0)}/{toFa(course.totalPages)} صفحه
                  </span>
                  <span className="font-semibold text-teal-600 dark:text-teal-400">
                    {toFa(course.pageProgress)}٪
                  </span>
                </div>
                <Progress
                  value={course.pageProgress}
                  className="h-1.5"
                  indicatorClassName="bg-gradient-to-l from-teal-500 to-cyan-500"
                />
              </div>
            )}
            {course.footer}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}