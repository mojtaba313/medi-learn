import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, ok, readJson } from "@/lib/api";

const annotationSchema = z.object({
  color: z.enum(["yellow", "green", "blue", "pink"]),
  note: z.string().max(20_000).optional().default(""),
  quote: z.string().min(1).max(20_000),
  startPath: z.array(z.number().int().nonnegative()).min(1),
  startOffset: z.number().int().nonnegative(),
  endPath: z.array(z.number().int().nonnegative()).min(1),
  endOffset: z.number().int().nonnegative(),
});

const schema = z.object({
  annotations: z.array(annotationSchema).max(2_000),
});

async function getNote(noteId: string) {
  return db.note.findUnique({
    where: { id: noteId },
    select: { id: true },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> },
) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const { lessonId: noteId } = await params;
  const note = await getNote(noteId);
  if (!note) return err("نوت پیدا نشد", 404);

  const annotations = await db.textAnnotation.findMany({
    where: { userId: session.userId, noteId: note.id },
    orderBy: { createdAt: "asc" },
  });

  return ok({ annotations });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> },
) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const { lessonId: noteId } = await params;
  const note = await getNote(noteId);
  if (!note) return err("نوت پیدا نشد", 404);

  const body = await readJson<unknown>(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("داده نامعتبر", 422);

  await db.$transaction(async (tx) => {
    await tx.textAnnotation.deleteMany({
      where: { userId: session.userId, noteId: note.id },
    });
    if (parsed.data.annotations.length > 0) {
      await tx.textAnnotation.createMany({
        data: parsed.data.annotations.map((annotation) => ({
          userId: session.userId,
          noteId: note.id,
          blockId: annotation.startPath.join("-"),
          color: annotation.color,
          content: annotation.note,
          quote: annotation.quote,
          startPath: annotation.startPath,
          startOffset: annotation.startOffset,
          endPath: annotation.endPath,
          endOffset: annotation.endOffset,
        })),
      });
    }
  });

  const annotations = await db.textAnnotation.findMany({
    where: { userId: session.userId, noteId: note.id },
    orderBy: { createdAt: "asc" },
  });

  return ok({ annotations });
}
