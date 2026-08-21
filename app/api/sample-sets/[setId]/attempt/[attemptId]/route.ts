import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, ok, dbUnavailable, isDbConnectionError } from "@/lib/api";

const answerSchema = z.object({
  questionId: z.string(),
  selectedOption: z.enum(["A", "B", "C", "D"]).nullable(),
  timeSpentMs: z.number().int().min(0).max(30 * 60 * 1000).default(0),
});

const submitSchema = z.object({
  answers: z.array(answerSchema).max(1000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ setId: string; attemptId: string }> },
) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const { setId, attemptId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) return err("داده‌های پاسخ نامعتبر است", 422);

  try {
    const attempt = await db.sampleAttempt.findUnique({
      where: { id: attemptId },
      include: { sampleSet: { include: { questions: true } } },
    });
    if (!attempt || attempt.sampleSetId !== setId) return err("تلاش پیدا نشد", 404);
    if (attempt.userId !== session.userId) return err("دسترسی غیرمجاز", 403);

    const questions = attempt.sampleSet.questions;
    const byId = new Map(questions.map((q) => [q.id, q]));

    const responses = parsed.data.answers
      .filter((a) => byId.has(a.questionId))
      .map((a) => {
        const q = byId.get(a.questionId)!;
        const isCorrect = a.selectedOption != null && a.selectedOption === q.correctOption;
        return {
          attemptId,
          sampleQuestionId: a.questionId,
          selectedOption: a.selectedOption,
          isCorrect,
          timeSpentMs: a.timeSpentMs,
        };
      });

    const total = questions.length;
    const answeredSet = new Set(parsed.data.answers.map((a) => a.questionId));
    const answered = responses.filter((r) => r.selectedOption != null).length;
    const correct = responses.filter((r) => r.isCorrect === true).length;
    const incorrect = responses.filter((r) => r.isCorrect === false).length;
    const unanswered = total - answered;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
    const durationMs =
      parsed.data.answers.reduce((sum, a) => sum + (a.timeSpentMs ?? 0), 0) ?? 0;

    await db.$transaction([
      db.sampleResponse.deleteMany({ where: { attemptId } }),
      db.sampleResponse.createMany({ data: responses }),
      db.sampleAttempt.update({
        where: { id: attemptId },
        data: {
          score,
          total,
          correct,
          incorrect,
          unanswered,
          durationMs,
          submittedAt: new Date(),
        },
      }),
    ]);

    const result = {
      score,
      total,
      correct,
      incorrect,
      unanswered,
      submittedAt: new Date().toISOString(),
      questions: questions.map((q) => {
        const ans = parsed.data.answers.find((a) => a.questionId === q.id);
        return {
          id: q.id,
          text: q.text,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctOption: q.correctOption,
          explanation: q.explanation,
          selectedOption: ans?.selectedOption ?? null,
          isCorrect: ans ? ans.selectedOption === q.correctOption : null,
        };
      }),
    };

    return ok({ result });
  } catch (e) {
    if (isDbConnectionError(e)) return dbUnavailable(e);
    throw e;
  }
}
