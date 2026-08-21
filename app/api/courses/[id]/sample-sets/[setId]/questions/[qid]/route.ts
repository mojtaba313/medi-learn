import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { err, ok, dbUnavailable, isDbConnectionError } from "@/lib/api";

const updateQuestionSchema = z.object({
  text: z.string().min(1).max(2000).optional(),
  optionA: z.string().min(1).max(500).optional(),
  optionB: z.string().min(1).max(500).optional(),
  optionC: z.string().min(1).max(500).optional(),
  optionD: z.string().min(1).max(500).optional(),
  correctOption: z.enum(["A", "B", "C", "D"]).optional(),
  explanation: z.string().max(2000).nullable().optional(),
  order: z.number().int().min(0).max(10000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; setId: string; qid: string }> },
) {
  await requireAdmin();
  const { qid } = await params;

  const body = await request.json().catch(() => null);
  const parsed = updateQuestionSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "داده نامعتبر", 422);

  try {
    const question = await db.sampleQuestion.update({
      where: { id: qid },
      data: parsed.data,
    });
    return ok({ question });
  } catch (e) {
    if (isDbConnectionError(e)) return dbUnavailable(e);
    throw e;
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; setId: string; qid: string }> },
) {
  await requireAdmin();
  const { qid } = await params;

  try {
    await db.sampleQuestion.delete({ where: { id: qid } });
    return ok({ success: true });
  } catch (e) {
    if (isDbConnectionError(e)) return dbUnavailable(e);
    throw e;
  }
}
