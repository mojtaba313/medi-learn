import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, readJson, ok } from "@/lib/api";
import { parseAnnotationData } from "@/lib/annotations";

const annotationSchema = z.object({
  pageNumber: z.number().int().positive(),
  data: z.array(
    z.object({
      id: z.string(),
      tool: z.enum(["highlight", "pen"]),
      color: z.string(),
      size: z.number(),
      opacity: z.number(),
      points: z.array(z.object({ x: z.number(), y: z.number() })).min(1),
    })
  ),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const pageNumber = Number(searchParams.get("pageNumber"));

  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    return err("شماره صفحه نامعتبر است", 422);
  }

  const annotation = await db.annotation.findUnique({
    where: {
      userId_courseId_pageNumber: {
        userId: session.userId,
        courseId: id,
        pageNumber,
      },
    },
  });

  return ok({ data: parseAnnotationData(annotation?.data) });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const { id } = await params;

  const body = await readJson<unknown>(request);
  if (!body) return err("درخواست نامعتبر است");

  const parsed = annotationSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "داده نامعتبر", 422);

  const { pageNumber, data } = parsed.data;

  const page = await db.page.findUnique({
    where: { courseId_pageNumber: { courseId: id, pageNumber } },
  });
  if (!page) return err("صفحه پیدا نشد", 404);

  const annotation = await db.annotation.upsert({
    where: {
      userId_courseId_pageNumber: {
        userId: session.userId,
        courseId: id,
        pageNumber,
      },
    },
    create: {
      userId: session.userId,
      courseId: id,
      pageNumber,
      data: data as never,
    },
    update: {
      data: data as never,
    },
  });

  return ok({ annotation: { id: annotation.id, updatedAt: annotation.updatedAt } });
}