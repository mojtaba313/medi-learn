import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, ok, readJson } from "@/lib/api";

const schema = z.object({
  done: z.boolean().optional(),
  opened: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> },
) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const { id, lessonId } = await params;
  const lesson = await db.lesson.findUnique({
    where: { moduleId_slug: { moduleId: id, slug: lessonId } },
    select: { id: true },
  });
  if (!lesson) return err("درس پیدا نشد", 404);

  const body = await readJson<unknown>(request);
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) return err("داده نامعتبر", 422);

  const progress = await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId: session.userId, lessonId: lesson.id } },
    create: {
      userId: session.userId,
      lessonId: lesson.id,
      done: parsed.data.done ?? false,
      lastOpenedAt: parsed.data.opened ? new Date() : null,
    },
    update: {
      ...(parsed.data.done !== undefined ? { done: parsed.data.done } : {}),
      ...(parsed.data.opened ? { lastOpenedAt: new Date() } : {}),
    },
  });

  return ok({ progress });
}
