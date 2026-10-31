import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, ok } from "@/lib/api";
import { putObject } from "@/lib/s3";
import { noteAssetKey } from "@/lib/module-import";

const assetSchema = z.object({
  assetId: z.string().min(1),
  fileName: z.string().min(1).optional(),
  kind: z.string().default("IMAGE"),
  mimeType: z.string().optional(),
  storageKey: z.string().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const { id } = await params;

  const noteRecord = await db.note.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!noteRecord) return err("نوت پیدا نشد", 404);

  const assets = await db.noteAsset.findMany({
    where: { noteId: id },
    orderBy: { assetId: "asc" },
  });

  return ok({ assets });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);
  if (session.role !== "ADMIN") return err("فقط مدیر دسترسی دارد", 403);

  const { id } = await params;

  const noteRecord = await db.note.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!noteRecord) return err("نوت پیدا نشد", 404);

  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return err("فرمت درخواست نامعتبر است", 400);
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return err("فایل ارسال نشده است", 400);

  const assetId = form.get("assetId");
  const fileName = form.get("fileName") ?? file.name;
  const kind = (form.get("kind") ?? "IMAGE") as string;
  const mimeType = form.get("mimeType") ?? file.type ?? undefined;

  const parsed = assetSchema.safeParse({
    assetId: typeof assetId === "string" ? assetId : undefined,
    fileName: typeof fileName === "string" ? fileName : file.name,
    kind,
    mimeType,
  });

  if (!parsed.success) return err("داده نامعتبر", 422);

  const data = parsed.data;
  const finalAssetId = data.assetId;
  const finalFileName = data.fileName ?? file.name;
  const finalMimeType = data.mimeType ?? mimeFromName(finalFileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  const storageKey = noteAssetKey(id, finalAssetId, finalFileName);

  await putObject(storageKey, buffer, finalMimeType);

  const asset = await db.noteAsset.upsert({
    where: { noteId_assetId: { noteId: id, assetId: finalAssetId } },
    create: {
      noteId: id,
      assetId: finalAssetId,
      kind: data.kind,
      fileName: finalFileName,
      mimeType: finalMimeType,
      size: buffer.byteLength,
      width: data.width ?? null,
      height: data.height ?? null,
      storageKey,
    },
    update: {
      kind: data.kind,
      fileName: finalFileName,
      mimeType: finalMimeType,
      size: buffer.byteLength,
      width: data.width ?? null,
      height: data.height ?? null,
      storageKey,
    },
  });

  return ok({ asset });
}

function mimeFromName(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}
