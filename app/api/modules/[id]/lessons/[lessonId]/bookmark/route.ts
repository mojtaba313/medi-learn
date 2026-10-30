import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, ok } from "@/lib/api";

async function getLesson(id: string, lessonId: string) {
  return db.lesson.findUnique({
    where: { moduleId_slug: { moduleId: id, slug: lessonId } },
    select: { id: true },
  });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> },
) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const { id, lessonId } = await params;
  const lesson = await getLesson(id, lessonId);
  if (!lesson) return err("درس پیدا نشد", 404);

  await db.bookmark.upsert({
    where: { userId_lessonId: { userId: session.userId, lessonId: lesson.id } },
    create: { userId: session.userId, lessonId: lesson.id },
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

  const { id, lessonId } = await params;
  const lesson = await getLesson(id, lessonId);
  if (!lesson) return err("درس پیدا نشد", 404);

  await db.bookmark.deleteMany({
    where: { userId: session.userId, lessonId: lesson.id },
  });

  return ok({ bookmarked: false });
}
