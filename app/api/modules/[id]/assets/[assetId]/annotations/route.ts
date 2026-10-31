import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, ok, readJson } from "@/lib/api";

const annotationSchema = z.object({
  blockId: z.string().min(1),
  data: z.any(),
});

const listSchema = z.object({
  annotations: z.array(annotationSchema).max(2_000).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> },
) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const { id, assetId } = await params;

  const asset = await db.noteAsset.findUnique({
    where: { noteId_assetId: { noteId: id, assetId } },
    select: { id: true, noteId: true },
  });
  if (!asset) return err("دارایی پیدا نشد", 404);

  const annotations = await db.noteAssetAnnotation.findMany({
    where: { userId: session.userId, noteId: id, assetId },
    orderBy: { createdAt: "asc" },
  });

  return ok({ annotations });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> },
) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const { id, assetId } = await params;

  const asset = await db.noteAsset.findUnique({
    where: { noteId_assetId: { noteId: id, assetId } },
    select: { id: true, noteId: true },
  });
  if (!asset) return err("دارایی پیدا نشد", 404);

  const body = await readJson<unknown>(request);
  const parsed = listSchema.safeParse(body);
  if (!parsed.success) return err("داده نامعتبر", 422);

  await db.$transaction(async (tx) => {
    await tx.noteAssetAnnotation.deleteMany({
      where: { userId: session.userId, noteId: id, assetId },
    });
    if (parsed.data.annotations?.length) {
      await tx.noteAssetAnnotation.createMany({
        data: parsed.data.annotations.map((annotation) => ({
          userId: session.userId,
          noteId: id,
          assetId,
          blockId: annotation.blockId,
          data: annotation.data,
        })),
      });
    }
  });

  const annotations = await db.noteAssetAnnotation.findMany({
    where: { userId: session.userId, noteId: id, assetId },
    orderBy: { createdAt: "asc" },
  });

  return ok({ annotations });
}
