import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, ok, readJson } from "@/lib/api";

const answerSchema = z.object({
  questionId: z.string(),
  selectedOption: z.string().nullable().optional(),
  timeSpentMs: z.number().int().nonnegative().optional().default(0),
});

const schema = z.object({
  mode: z.string().max(30).optional().default("STUDY"),
  answers: z.array(answerSchema).min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const { id } = await params;
  const body = await readJson<unknown>(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("داده نامعتبر", 422);

  const questions = await db.noteQuestion.findMany({
    where: { noteId: id },
    select: { id: true, correctOption: true, topic: true },
  });
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  let correct = 0;
  let incorrect = 0;
  let skipped = 0;
  const wrongQuestionIds: string[] = [];
  const topicStats: Record<string, { correct: number; total: number }> = {};
  const answerRows: {
    questionId: string;
    selectedOption: string | null;
    isCorrect: boolean | null;
    timeSpentMs: number;
  }[] = [];

  for (const answer of parsed.data.answers) {
    const question = questionMap.get(answer.questionId);
    if (!question) continue;

    const selectedOption = answer.selectedOption ?? null;
    const isCorrect =
      selectedOption === null ? null : selectedOption === question.correctOption;

    if (isCorrect === null) skipped += 1;
    else if (isCorrect) correct += 1;
    else {
      incorrect += 1;
      wrongQuestionIds.push(question.id);
    }

    const topic = question.topic ?? "mixed";
    if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0 };
    if (isCorrect !== null) {
      topicStats[topic].total += 1;
      if (isCorrect) topicStats[topic].correct += 1;
    }

    answerRows.push({
      questionId: question.id,
      selectedOption,
      isCorrect,
      timeSpentMs: answer.timeSpentMs,
    });
  }

  const total = correct + incorrect + skipped;

  const attempt = await db.$transaction(async (tx) => {
    for (const row of answerRows) {
      await tx.noteQuestionResponse.upsert({
        where: {
          userId_questionId: {
            userId: session.userId,
            questionId: row.questionId,
          },
        },
        create: {
          userId: session.userId,
          questionId: row.questionId,
          selectedOption: row.selectedOption,
          isCorrect: row.isCorrect,
          timeSpentMs: row.timeSpentMs,
        },
        update: {
          selectedOption: row.selectedOption,
          isCorrect: row.isCorrect,
          timeSpentMs: row.timeSpentMs,
          answeredAt: new Date(),
        },
      });
    }

    return tx.noteQuizAttempt.create({
      data: {
        userId: session.userId,
        noteId: id,
        mode: parsed.data.mode.toUpperCase(),
        score: correct,
        total,
        correct,
        incorrect,
        skipped,
        answers: answerRows,
        topicStats,
        wrongQuestionIds,
      },
    });
  });

  return ok({ attempt });
}
