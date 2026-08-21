import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, readJson, ok, dbUnavailable, isDbConnectionError } from "@/lib/api";

const respondSchema = z.object({
  selectedOption: z.enum(["A", "B", "C", "D"]),
  timeSpentMs: z.number().int().min(0).max(30 * 60 * 1000).default(0),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const { id } = await params;
  try {
    const question = await db.question.findUnique({ where: { id } });
    if (!question) return err("سوال پیدا نشد", 404);

    const body = await readJson<unknown>(request);
    if (!body) return err("درخواست نامعتبر است");

    const parsed = respondSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "داده نامعتبر", 422);

    const isCorrect = parsed.data.selectedOption === question.correctOption;

    const response = await db.questionResponse.upsert({
      where: {
        userId_questionId: {
          userId: session.userId,
          questionId: id,
        },
      },
      create: {
        userId: session.userId,
        questionId: id,
        selectedOption: parsed.data.selectedOption,
        isCorrect,
        timeSpentMs: parsed.data.timeSpentMs,
      },
      update: {
        selectedOption: parsed.data.selectedOption,
        isCorrect,
        timeSpentMs: parsed.data.timeSpentMs,
      },
    });

    return ok({
      isCorrect,
      correctOption: question.correctOption,
      response,
    });
  } catch (e) {
    if (isDbConnectionError(e)) return dbUnavailable(e);
    throw e;
  }
}