import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, ok } from "@/lib/api";

async function getNote(noteId: string) {
  return db.note.findUnique({
    where: { id: noteId },
    select: { id: true },
  });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> },
) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const { lessonId: noteId } = await params;
  const note = await getNote(noteId);
  if (!note) return err("نوت پیدا نشد", 404);

  await db.bookmark.upsert({
    where: { userId_noteId: { userId: session.userId, noteId: note.id } },
    create: { userId: session.userId, noteId: note.id },
    update: {},
  });

  return ok({ bookmarked: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> },
) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const { lessonId: noteId } = await params;
  const note = await getNote(noteId);
  if (!note) return err("نوت پیدا نشد", 404);

  await db.bookmark.deleteMany({
    where: { userId: session.userId, noteId: note.id },
  });

  return ok({ bookmarked: false });
}
