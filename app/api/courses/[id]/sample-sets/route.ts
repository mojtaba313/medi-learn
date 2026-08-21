import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, requireAdmin } from "@/lib/auth";
import { err, ok, dbUnavailable, isDbConnectionError } from "@/lib/api";

const createSetSchema = z.object({
  title: z.string().min(1, "عنوان مجموعه الزامی است").max(200),
  description: z.string().max(1000).optional(),
  timeLimitMinutes: z.number().int().min(1).max(600).nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const { id } = await params;
  try {
    const sets = await db.sampleSet.findMany({
      where: { courseId: id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { questions: true, attempts: true } },
      },
    });
    return ok({ sets });
  } catch (e) {
    if (isDbConnectionError(e)) return dbUnavailable(e);
    throw e;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAdmin();
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = createSetSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "داده نامعتبر", 422);

  try {
    const course = await db.course.findUnique({ where: { id }, select: { id: true } });
    if (!course) return err("درس پیدا نشد", 404);

    const set = await db.sampleSet.create({
      data: {
        courseId: id,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        timeLimitMinutes: parsed.data.timeLimitMinutes ?? null,
        createdById: user.id,
      },
    });
    return ok({ set });
  } catch (e) {
    if (isDbConnectionError(e)) return dbUnavailable(e);
    throw e;
  }
}
