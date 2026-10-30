import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, ok, readJson } from "@/lib/api";

const defaults = {
  theme: "dark",
  fontSize: "md",
  lineHeight: "normal",
  readingWidth: "normal",
  dailyGoalMinutes: 60,
  pomodoroFocus: 25,
  pomodoroBreak: 5,
};

const schema = z.object({
  theme: z.enum(["dark", "light"]).optional(),
  fontSize: z.enum(["sm", "md", "lg"]).optional(),
  lineHeight: z.enum(["normal", "relaxed"]).optional(),
  readingWidth: z.enum(["narrow", "normal", "wide"]).optional(),
  dailyGoalMinutes: z.number().int().min(5).max(600).optional(),
  pomodoroFocus: z.number().int().min(5).max(120).optional(),
  pomodoroBreak: z.number().int().min(1).max(60).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const prefs = await db.userPreference.findUnique({
    where: { userId: session.userId },
  });

  return ok({ preferences: prefs ?? { ...defaults, userId: session.userId } });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const body = await readJson<unknown>(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("داده نامعتبر", 422);

  const prefs = await db.userPreference.upsert({
    where: { userId: session.userId },
    create: { userId: session.userId, ...defaults, ...parsed.data },
    update: parsed.data,
  });

  return ok({ preferences: prefs });
}
