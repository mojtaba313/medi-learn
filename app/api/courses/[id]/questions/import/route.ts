import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, readJson, ok } from "@/lib/api";
import { questionSchema } from "@/lib/question-schema";

const bulkSchema = z.object({
  questions: z.array(questionSchema).min(1).max(500),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return err("دسترسی غیرمجاز", 401);

  const { id } = await params;
  const course = await db.course.findUnique({ where: { id } });
  if (!course) return err("درس پیدا نشد", 404);

  const body = await readJson<unknown>(request);
  if (!body) return err("درخواست نامعتبر است");

  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return err(
      parsed.error.issues[0]?.message ?? "داده‌های سوالات نامعتبر است",
      422
    );
  }

  const validPageNumbers = new Set(
    (await db.page.findMany({ where: { courseId: id } })).map((p) => p.pageNumber)
  );

  const data = parsed.data.questions
    .filter((q) => (q.pageNumber == null ? true : validPageNumbers.has(q.pageNumber)))
    .map((q) => ({
      courseId: id,
      pageNumber: q.pageNumber ?? null,
      text: q.text,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctOption: q.correctOption,
      explanation: q.explanation ?? null,
      tags: q.tags ?? [],
    }));

  if (data.length === 0) {
    return err("هیچ سوال معتبری برای وارد کردن وجود ندارد", 422);
  }

  const result = await db.question.createMany({ data });

  return ok({ count: result.count });
}