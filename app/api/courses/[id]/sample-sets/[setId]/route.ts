import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, requireAdmin } from "@/lib/auth";
import { err, ok, dbUnavailable, isDbConnectionError } from "@/lib/api";

const updateSetSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  timeLimitMinutes: z.number().int().min(1).max(600).nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; setId: string }> },
) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const { setId } = await params;
  try {
    const set = await db.sampleSet.findUnique({
      where: { id: setId },
      include: {
        questions: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
        _count: { select: { questions: true } },
      },
    });
    if (!set) return err("مجموعه پیدا نشد", 404);
    return ok({ set });
  } catch (e) {
    if (isDbConnectionError(e)) return dbUnavailable(e);
    throw e;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; setId: string }> },
) {
  await requireAdmin();
  const { setId } = await params;

  const body = await request.json().catch(() => null);
  const parsed = updateSetSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "داده نامعتبر", 422);

  try {
    const set = await db.sampleSet.update({
      where: { id: setId },
      data: parsed.data,
    });
    return ok({ set });
  } catch (e) {
    if (isDbConnectionError(e)) return dbUnavailable(e);
    throw e;
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; setId: string }> },
) {
  await requireAdmin();
  const { setId } = await params;

  try {
    await db.sampleSet.delete({ where: { id: setId } });
    return ok({ success: true });
  } catch (e) {
    if (isDbConnectionError(e)) return dbUnavailable(e);
    throw e;
  }
}
