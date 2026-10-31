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

  const { lessonId: noteId } = await params;
  const note = await db.note.findUnique({
    where: { id: noteId },
    select: { id: true },
  });
  if (!note) return err("نوت پیدا نشد", 404);

  const body = await readJson<unknown>(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("داده نامعتبر", 422);

  const text = parsed.data.text;
  if (!text.trim()) {
    await db.noteNote.deleteMany({
      where: { userId: session.userId, noteId: note.id },
    });
    return ok({ text: "" });
  }

  const noteRow = await db.noteNote.upsert({
    where: { userId_noteId: { userId: session.userId, noteId: note.id } },
    create: { userId: session.userId, noteId: note.id, text },
    update: { text },
  });

  return ok({ text: noteRow.text, updatedAt: noteRow.updatedAt });
}
