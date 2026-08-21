import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, ok, dbUnavailable, isDbConnectionError } from "@/lib/api";

const startSchema = z.object({
  mode: z.enum(["EXAM", "PRACTICE"]),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ setId: string }> },
) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const { setId } = await params;
  try {
    const attempts = await db.sampleAttempt.findMany({
      where: { userId: session.userId, sampleSetId: setId },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        mode: true,
        score: true,
        total: true,
        correct: true,
        incorrect: true,
        unanswered: true,
        durationMs: true,
        startedAt: true,
        submittedAt: true,
      },
    });
    return ok({ attempts });
  } catch (e) {
    if (isDbConnectionError(e)) return dbUnavailable(e);
    throw e;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ setId: string }> },
) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const { setId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) return err("حالت آزمون نامعتبر است", 422);

  try {
    const set = await db.sampleSet.findUnique({
      where: { id: setId },
      select: { id: true, timeLimitMinutes: true },
    });
    if (!set) return err("مجموعه پیدا نشد", 404);

    const attempt = await db.sampleAttempt.create({
      data: {
        userId: session.userId,
        sampleSetId: setId,
        mode: parsed.data.mode,
      },
      select: {
        id: true,
        mode: true,
        startedAt: true,
        sampleSet: { select: { timeLimitMinutes: true } },
      },
    });
    return ok({ attempt });
  } catch (e) {
    if (isDbConnectionError(e)) return dbUnavailable(e);
    throw e;
  }
}
