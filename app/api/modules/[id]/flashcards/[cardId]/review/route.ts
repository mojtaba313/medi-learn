import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, ok, readJson } from "@/lib/api";
import { gradeFlashcard, type SrsGrade } from "@/lib/srs";

const schema = z.object({ grade: z.enum(["again", "good", "easy"]) });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cardId: string }> },
) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const { id, cardId } = await params;
  const card = await db.flashcard.findFirst({
    where: { id: cardId, moduleId: id },
    select: { id: true },
  });
  if (!card) return err("فلش‌کارت پیدا نشد", 404);

  const body = await readJson<unknown>(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("داده نامعتبر", 422);

  const existing = await db.flashcardReview.findUnique({
    where: { userId_cardId: { userId: session.userId, cardId: card.id } },
  });

  const next = gradeFlashcard(
    existing
      ? {
          interval: existing.interval,
          ease: existing.ease,
          reps: existing.reps,
          lapses: existing.lapses,
          due: existing.due,
          last: existing.last,
        }
      : null,
    parsed.data.grade as SrsGrade,
  );

  const review = await db.flashcardReview.upsert({
    where: { userId_cardId: { userId: session.userId, cardId: card.id } },
    create: {
      userId: session.userId,
      cardId: card.id,
      interval: next.interval,
      ease: next.ease,
      reps: next.reps,
      lapses: next.lapses,
      due: next.due,
      last: next.last,
    },
    update: {
      interval: next.interval,
      ease: next.ease,
      reps: next.reps,
      lapses: next.lapses,
      due: next.due,
      last: next.last,
    },
  });

  return ok({ review });
}
