import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, readJson, ok } from "@/lib/api";

const updateSchema = z
  .object({
    text: z.string().trim().min(3).max(5000).optional(),
    optionA: z.string().trim().min(1).max(1000).optional(),
    optionB: z.string().trim().min(1).max(1000).optional(),
    optionC: z.string().trim().min(1).max(1000).optional(),
    optionD: z.string().trim().min(1).max(1000).optional(),
    correctOption: z.enum(["A", "B", "C", "D"]).optional(),
    explanation: z.string().trim().max(5000).optional(),
    pageNumber: z.number().int().positive().nullable().optional(),
    tags: z.array(z.string().trim().max(50)).max(10).optional(),
  })
  .strict();

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; qid: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return err("دسترسی غیرمجاز", 401);

  const { id, qid } = await params;
  const question = await db.question.findUnique({ where: { id: qid, courseId: id } });
  if (!question) return err("سوال پیدا نشد", 404);

  const body = await readJson<unknown>(request);
  if (!body) return err("درخواست نامعتبر است");

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "داده نامعتبر", 422);

  const { pageNumber, ...data } = parsed.data;

  if (pageNumber !== undefined) {
    if (pageNumber !== null) {
      const page = await db.page.findUnique({
        where: { courseId_pageNumber: { courseId: id, pageNumber } },
      });
      if (!page) return err(`صفحه ${pageNumber} در این درس وجود ندارد`, 422);
    }
  }

  const updated = await db.question.update({
    where: { id: qid },
    data: {
      ...(data.text !== undefined && { text: data.text }),
      ...(data.optionA !== undefined && { optionA: data.optionA }),
      ...(data.optionB !== undefined && { optionB: data.optionB }),
      ...(data.optionC !== undefined && { optionC: data.optionC }),
      ...(data.optionD !== undefined && { optionD: data.optionD }),
      ...(data.correctOption !== undefined && { correctOption: data.correctOption }),
      ...(data.explanation !== undefined && { explanation: data.explanation }),
      ...(data.tags !== undefined && { tags: data.tags }),
      ...(pageNumber !== undefined && { pageNumber }),
    },
  });

  return ok({ question: updated });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; qid: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return err("دسترسی غیرمجاز", 401);

  const { id, qid } = await params;
  const question = await db.question.findUnique({ where: { id: qid, courseId: id } });
  if (!question) return err("سوال پیدا نشد", 404);

  await db.question.delete({ where: { id: qid } });

  return ok({ success: true });
}