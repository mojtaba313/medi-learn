import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, ok, readJson } from "@/lib/api";

const schema = z.object({ text: z.string().max(200_000) });

export async function PUT(
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("داده نامعتبر", 422);

  const text = parsed.data.text;
  if (!text.trim()) {
    await db.lessonNote.deleteMany({
      where: { userId: session.userId, lessonId: lesson.id },
    });
    return ok({ text: "" });
  }

  const note = await db.lessonNote.upsert({
    where: { userId_lessonId: { userId: session.userId, lessonId: lesson.id } },
    create: { userId: session.userId, lessonId: lesson.id, text },
    update: { text },
  });

  return ok({ text: note.text, updatedAt: note.updatedAt });
}
