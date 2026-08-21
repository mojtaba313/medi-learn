"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { ArrowRight, Clock, FileQuestion, ListChecks, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toFa } from "@/lib/utils";
import { SampleSetTaker } from "@/components/study/sample-set-taker";

interface SetInfo {
  id: string;
  title: string;
  description: string | null;
  timeLimitMinutes: number | null;
  questionCount: number;
}

export function SampleSetList({
  courseId,
  courseTitle,
  sets,
}: {
  courseId: string;
  courseTitle: string;
  sets: SetInfo[];
}) {
  const [active, setActive] = useState<{ setId: string; mode: "EXAM" | "PRACTICE" } | null>(null);

  const activeSet = sets.find((s) => s.id === active?.setId) ?? null;

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/study/${courseId}`}
          className="mb-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          بازگشت به مطالعه درس
        </Link>
        <h1 className="text-2xl font-bold sm:text-3xl">نمونه سوالات</h1>
        <p className="mt-1 text-muted-foreground">{courseTitle}</p>
      </div>

      {sets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <FileQuestion className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">هنوز مجموعه نمونه سوالی برای این درس ایجاد نشده است.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sets.map((set) => (
            <Card key={set.id} className="border-border/60">
              <CardContent className="space-y-4 p-5">
                <div>
                  <h2 className="text-lg font-bold">{set.title}</h2>
                  {set.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{set.description}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    <ListChecks className="ml-1 h-3 w-3" />
                    {toFa(set.questionCount)} سوال
                  </Badge>
                  {set.timeLimitMinutes ? (
                    <Badge className="gap-1">
                      <Clock className="h-3 w-3" />
                      {toFa(set.timeLimitMinutes)} دقیقه
                    </Badge>
                  ) : (
                    <Badge variant="outline">بدون محدودیت زمان</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 rounded-xl"
                    onClick={() => setActive({ setId: set.id, mode: "EXAM" })}
                    disabled={set.questionCount === 0}
                  >
                    <Timer className="ml-2 h-4 w-4" />
                    آزمون (زمان‌دار)
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl"
                    onClick={() => setActive({ setId: set.id, mode: "PRACTICE" })}
                    disabled={set.questionCount === 0}
                  >
                    تمرین (بدون زمان)
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AnimatePresence>
        {active && activeSet && (
          <SampleSetTaker
            courseId={courseId}
            setId={active.setId}
            setTitle={activeSet.title}
            mode={active.mode}
            onClose={() => setActive(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
