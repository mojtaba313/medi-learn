import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, ok } from "@/lib/api";
import { blocksSchema } from "@/lib/content-blocks";
import {
  importNote,
  type NoteAssetInput,
  type NoteJsonInput,
} from "@/lib/module-import";

const assetSchema = z
  .object({
    assetId: z.string().min(1),
    fileName: z.string().min(1).optional(),
    kind: z.string().optional(),
    mimeType: z.string().optional(),
    storageKey: z.string().optional(),
    width: z.number().int().positive().nullable().optional(),
    height: z.number().int().positive().nullable().optional(),
  })
  .passthrough();

const noteSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().default(""),
    blocks: blocksSchema.optional(),
    assets: z.array(assetSchema).optional(),
  })
  .passthrough();

const payloadSchema = z.object({
  note: noteSchema,
});

function assetIdForFile(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "-");
}

function findManifestAsset(assets: NoteAssetInput[], file: File) {
  const lower = file.name.toLowerCase();
  return assets.find((asset) => {
    if (asset.fileName?.toLowerCase() === lower) return true;
    if (asset.storageKey && asset.storageKey.split("/").pop()?.toLowerCase() === lower) return true;
    return false;
  });
}

function getMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  switch (ext) {
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "webp": return "image/webp";
    case "gif": return "image/gif";
    case "pdf": return "application/pdf";
    default: return "application/octet-stream";
  }
}

async function readPayload(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    
    // Check for ZIP file
    const zipFile = form.get("zip") as File | null;
    if (zipFile && (zipFile.type === "application/zip" || zipFile.name.endsWith(".zip"))) {
      // For now, throw an error - ZIP support requires unzipper package
      throw new Error("پشتیبانی از فایل ZIP در حال حاضر غیرفعال است. لطفاً فایل JSON و تصاویر را جداگانه آپلود کنید.");
    }

    const raw = form.get("payload") ?? form.get("data");
    if (typeof raw !== "string") {
      throw new Error("دادهٔ جزوه ارسال نشده است.");
    }
    const parsed = payloadSchema.parse(JSON.parse(raw));
    const noteData = parsed.note as NoteJsonInput;
    const manifest: NoteAssetInput[] = (noteData.assets ?? []).map((asset) => ({ ...asset }));
    const files = form.getAll("assets").filter((item): item is File => item instanceof File);

    const inputs: NoteAssetInput[] = [];
    for (const file of files) {
      const existing = findManifestAsset(manifest, file);
      const assetId = existing?.assetId ?? assetIdForFile(file.name);
      inputs.push({
        assetId,
        fileName: file.name,
        mimeType: file.type || undefined,
        buffer: Buffer.from(await file.arrayBuffer()),
        ...(existing ?? {}),
      });
    }

    for (const asset of manifest) {
      if (!inputs.some((input) => input.assetId === asset.assetId)) {
        inputs.push(asset);
      }
    }

    return { note: noteData, assets: inputs };
  }

  const body = (await request.json()) as unknown;
  const parsed = payloadSchema.parse(body);
  return {
    ...parsed,
    assets: (parsed.note.assets ?? []) as NoteAssetInput[],
  };
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);
  if (session.role !== "ADMIN") return err("فقط مدیر دسترسی دارد", 403);

  try {
    const payload = await readPayload(request);
    const result = await importNote(db, payload.note as NoteJsonInput, session.userId, payload.assets as NoteAssetInput[] | undefined);

    return ok({
      note: result.note,
      counts: {
        blocks: result.blocks,
        questions: result.questions,
        flashcards: result.flashcards,
        assets: result.assets,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return err(error.issues[0]?.message ?? "داده نامعتبر", 422);
    }
    return err(error instanceof Error ? error.message : "وارد کردن جزوه انجام نشد", 422);
  }
}