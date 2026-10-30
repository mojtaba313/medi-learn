import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, ok, readJson } from "@/lib/api";

const schema = z.object({
  minutes: z.number().int().min(1).max(1_440),
  moduleId: z.string().optional(),
  courseId: z.string().optional(),
  kind: z.string().max(30).optional().default("focus"),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const body = await readJson<unknown>(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("داده نامعتبر", 422);

  const sessionRow = await db.studySession.create({
    data: {
      userId: session.userId,
      minutes: parsed.data.minutes,
      moduleId: parsed.data.moduleId ?? null,
      courseId: parsed.data.courseId ?? null,
      kind: parsed.data.kind,
      endedAt: new Date(),
    },
  });

  return ok({ session: sessionRow });
}
