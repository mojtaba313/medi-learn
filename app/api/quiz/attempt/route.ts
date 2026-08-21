import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, readJson, ok } from "@/lib/api";

const attemptSchema = z.object({
  courseId: z.string().min(1),
  mode: z.string().max(30),
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedOption: z.enum(["A", "B", "C", "D"]).nullable(),
      isCorrect: z.boolean().nullable(),
      timeSpentMs: z.number().int().min(0),
    })
  ).max(500),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const body = await readJson<unknown>(request);
  if (!body) return err("درخواست نامعتبر است");

  const parsed = attemptSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "داده نامعتبر", 422);

  const { courseId, mode, answers } = parsed.data;

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) return err("درس پیدا نشد", 404);

  const answered = answers.filter((a) => a.selectedOption !== null);
  const correct = answered.filter((a) => a.isCorrect).length;
  const incorrect = answered.length - correct;
  const skipped = answers.length - answered.length;

  const attempt = await db.quizAttempt.create({
    data: {
      userId: session.userId,
      courseId,
      mode,
      score: correct,
      total: answers.length,
      correct,
      incorrect,
      skipped,
      answers: answers as never,
    },
  });

  for (const answer of answered) {
    if (answer.selectedOption && answer.isCorrect !== null) {
      await db.questionResponse.upsert({
        where: {
          userId_questionId: {
            userId: session.userId,
            questionId: answer.questionId,
          },
        },
        create: {
          userId: session.userId,
          questionId: answer.questionId,
          selectedOption: answer.selectedOption,
          isCorrect: answer.isCorrect,
          timeSpentMs: answer.timeSpentMs,
        },
        update: {
          selectedOption: answer.selectedOption,
          isCorrect: answer.isCorrect,
          timeSpentMs: answer.timeSpentMs,
        },
      });
    }
  }

  return ok({
    attempt: {
      id: attempt.id,
      score: correct,
      total: answers.length,
      correct,
      incorrect,
      skipped,
      percent: answers.length > 0 ? Math.round((correct / answers.length) * 100) : 0,
    },
  }, { status: 201 });
}