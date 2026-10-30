import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, ok } from "@/lib/api";
import { blocksSchema } from "@/lib/content-blocks";
import {
  importModule,
  type LessonJsonInput,
  type ModuleAssetInput,
  type ModuleJsonInput,
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

const moduleSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().default(""),
    assets: z.array(assetSchema).optional(),
  })
  .passthrough();

const lessonSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    blocks: blocksSchema,
  })
  .passthrough();

const payloadSchema = z.object({
  module: moduleSchema,
  lessons: z.array(lessonSchema).min(1),
});

function assetIdForFile(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "-");
}

function findManifestAsset(assets: ModuleAssetInput[], file: File) {
  const lower = file.name.toLowerCase();
  return assets.find((asset) => {
    if (asset.fileName?.toLowerCase() === lower) return true;
    if (asset.storageKey && asset.storageKey.split("/").pop()?.toLowerCase() === lower) return true;
    return false;
  });
}

async function readPayload(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const raw = form.get("payload") ?? form.get("data");
    if (typeof raw !== "string") {
      throw new Error("دادهٔ ماژول ارسال نشده است.");
    }
    const parsed = payloadSchema.parse(JSON.parse(raw));
    const moduleData = parsed.module as ModuleJsonInput;
    const lessons = parsed.lessons as LessonJsonInput[];
    const manifest: ModuleAssetInput[] = (moduleData.assets ?? []).map((asset) => ({ ...asset }));
    const files = form.getAll("assets").filter((item): item is File => item instanceof File);

    const inputs: ModuleAssetInput[] = [];
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

    return { module: moduleData, lessons, assets: inputs };
  }

  const body = (await request.json()) as unknown;
  const parsed = payloadSchema.parse(body);
  return {
    ...parsed,
    assets: (parsed.module.assets ?? []) as ModuleAssetInput[],
  };
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);
  if (session.role !== "ADMIN") return err("فقط مدیر دسترسی دارد", 403);

  try {
    const payload = await readPayload(request);
    const result = await importModule(
      db,
      payload.module as ModuleJsonInput,
      payload.lessons as LessonJsonInput[],
      session.userId,
      payload.assets as ModuleAssetInput[] | undefined,
    );

    return ok({
      module: result.module,
      counts: {
        lessons: result.lessons,
        questions: result.questions,
        flashcards: result.flashcards,
        assets: result.assets,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return err(error.issues[0]?.message ?? "داده نامعتبر", 422);
    }
    return err(error instanceof Error ? error.message : "وارد کردن ماژول انجام نشد", 422);
  }
}
