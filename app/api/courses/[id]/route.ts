import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, ok, readJson } from "@/lib/api";
import { deleteCourseObjects } from "@/lib/s3";

async function getAuthorizedCourse(id: string) {
  const session = await getSession();
  if (!session) return { error: err("دسترسی غیرمجاز", 401) as NextResponse };
  const course = await db.course.findUnique({
    where: { id },
    include: { pages: { orderBy: { pageNumber: "asc" } }, _count: { select: { questions: true } } },
  });
  if (!course) return { error: err("درس پیدا نشد", 404) as NextResponse };
  if (session.role !== "ADMIN" && course.createdById !== session.userId) {
    return { error: err("دسترسی غیرمجاز", 403) as NextResponse };
  }
  return { course, session };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getAuthorizedCourse(id);
  if (result.error) return result.error;
  return ok({ course: result.course });
}

const updateSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().max(100).optional(),
  coverUrl: z.string().url().optional().or(z.literal("")).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return err("دسترسی غیرمجاز", 401);

  const course = await db.course.findUnique({ where: { id } });
  if (!course) return err("درس پیدا نشد", 404);

  const body = await readJson<unknown>(request);
  if (!body) return err("درخواست نامعتبر است");

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "داده نامعتبر", 422);

  const updated = await db.course.update({
    where: { id },
    data: {
      ...(parsed.data.title !== undefined && { title: parsed.data.title }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      ...(parsed.data.category !== undefined && { category: parsed.data.category }),
      ...(parsed.data.coverUrl !== undefined && {
        coverUrl: parsed.data.coverUrl || null,
      }),
    },
  });

  return ok({ course: updated });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return err("دسترسی غیرمجاز", 401);

  const course = await db.course.findUnique({ where: { id } });
  if (!course) return err("درس پیدا نشد", 404);

  try {
    await deleteCourseObjects(id);
  } catch {
    // حذف فایل‌های ذخیره‌سازی غیر بحرانی است
  }

  await db.course.delete({ where: { id } });

  return ok({ success: true });
}