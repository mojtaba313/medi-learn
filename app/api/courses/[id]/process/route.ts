import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, readJson } from "@/lib/api";
import { processCoursePdf } from "@/lib/pdf-process";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const processSchema = z.object({
  scale: z.number().min(1).max(3).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return err("دسترسی غیرمجاز", 401);

  const { id } = await params;

  const course = await db.course.findUnique({ where: { id } });
  if (!course) return err("درس پیدا نشد", 404);

  const body = await readJson<unknown>(request);
  const parsed = processSchema.safeParse(body ?? {});
  const scale = parsed.success ? (parsed.data.scale ?? 2) : 2;

  try {
    await db.course.update({
      where: { id },
      data: { status: "PROCESSING", error: null },
    });

    await processCoursePdf(id, scale);

    const updated = await db.course.findUnique({ where: { id } });
    return NextResponse.json({ course: updated }, { status: 200 });
  } catch (error) {
    await db.course.update({
      where: { id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "پردازش ناموفق بود",
      },
    });
    return err(
      error instanceof Error ? error.message : "خطا در پردازش PDF",
      500,
    );
  }
}
