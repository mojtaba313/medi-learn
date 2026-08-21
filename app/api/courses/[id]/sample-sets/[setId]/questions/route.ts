import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { err, ok, dbUnavailable, isDbConnectionError } from "@/lib/api";

const questionSchema = z.object({
  text: z.string().min(1, "متن سوال الزامی است").max(2000),
  optionA: z.string().min(1).max(500),
  optionB: z.string().min(1).max(500),
  optionC: z.string().min(1).max(500),
  optionD: z.string().min(1).max(500),
  correctOption: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().max(2000).nullable().optional(),
  order: z.number().int().min(0).max(10000).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; setId: string }> },
) {
  await requireAdmin();
  const { setId } = await params;
  try {
    const questions = await db.sampleQuestion.findMany({
      where: { sampleSetId: setId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return ok({ questions });
  } catch (e) {
    if (isDbConnectionError(e)) return dbUnavailable(e);
    throw e;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; setId: string }> },
) {
  await requireAdmin();
  const { setId } = await params;

  const body = await request.json().catch(() => null);
  if (!body) return err("درخواست نامعتبر است", 422);

  const single = questionSchema.safeParse(body);
  const many = z.array(questionSchema).safeParse(body.questions ?? body);
  const parsed = single.success
    ? [single.data]
    : many.success
      ? many.data
      : null;
  if (!parsed || parsed.length === 0) {
    return err(parsed === null ? many.error?.issues[0]?.message ?? "داده نامعتبر" : "داده نامعتبر", 422);
  }

  try {
    const set = await db.sampleSet.findUnique({ where: { id: setId }, select: { id: true } });
    if (!set) return err("مجموعه پیدا نشد", 404);

    const last = await db.sampleQuestion.findFirst({
      where: { sampleSetId: setId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    let nextOrder = (last?.order ?? -1) + 1;

    const created = await db.sampleQuestion.createMany({
      data: parsed.map((q) => ({
        sampleSetId: setId,
        text: q.text,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: q.correctOption,
        explanation: q.explanation ?? null,
        order: q.order ?? nextOrder++,
      })),
    });

    const questions = await db.sampleQuestion.findMany({
      where: { sampleSetId: setId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return ok({ count: created.count, questions });
  } catch (e) {
    if (isDbConnectionError(e)) return dbUnavailable(e);
    throw e;
  }
}
