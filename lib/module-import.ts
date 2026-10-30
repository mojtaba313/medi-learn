import type { PrismaClient } from "@prisma/client";
import {
  blocksToPlainText,
  collectAssetRefs,
  isImageOnly,
  type ContentBlock,
} from "@/lib/content-blocks";
import { putObject } from "@/lib/s3";

export interface ModuleQuestionInput {
  topic?: string;
  question: string;
  choices: string[];
  correct: number;
  why: string;
  blockId?: string;
}

export interface ModuleAssetJson {
  assetId: string;
  fileName?: string;
  kind?: string;
  mimeType?: string;
  storageKey?: string;
  width?: number | null;
  height?: number | null;
}

export interface ModuleJsonInput {
  id: string;
  order?: number;
  number?: number;
  title: string;
  kind?: string;
  cardTitle?: string;
  eyebrow?: string;
  cardDescription?: string;
  description: string;
  pills?: string[];
  footer?: string;
  quiz?: { navLabel?: string; title?: string; description?: string };
  questions?: ModuleQuestionInput[];
  flashcards?: { term: string; definition: string }[];
  references?: { title?: string; intro?: string; html?: string };
  gallery?: unknown;
  assets?: ModuleAssetJson[];
}

export interface LessonJsonInput {
  id: string;
  order?: number;
  title: string;
  mins?: string;
  source?: string;
  summary?: string;
  blocks: ContentBlock[];
  html?: string;
}

export interface ModuleAssetInput extends ModuleAssetJson {
  buffer?: Buffer | Uint8Array;
}

function safeFileName(value: string) {
  return value.replace(/[^\w.\-]+/g, "-").replace(/^-+|-+$/g, "") || "asset";
}

export function moduleAssetKey(moduleId: string, assetId: string, fileName: string) {
  return `modules/${moduleId}/assets/${safeFileName(assetId)}-${safeFileName(fileName)}`;
}

function mimeFromName(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function assertBlocks(lesson: LessonJsonInput, assetIds: Set<string>) {
  const seen = new Set<string>();
  for (const block of lesson.blocks) {
    if (seen.has(block.id)) {
      throw new Error(`شناسهٔ بلوک تکراری در درس «${lesson.title}»: ${block.id}`);
    }
    seen.add(block.id);
    if (block.type === "image" && !assetIds.has(block.assetId)) {
      throw new Error(
        `تصویر «${block.assetId}» در دارایی‌های ماژول پیدا نشد (درس «${lesson.title}»).`,
      );
    }
  }
}

export async function importModule(
  prisma: PrismaClient,
  moduleData: ModuleJsonInput,
  lessons: LessonJsonInput[],
  createdById?: string,
  assetInputs: ModuleAssetInput[] = [],
) {
  const moduleId = moduleData.id;
  const sortedLessons = [...lessons].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id),
  );

  const allBlocks = sortedLessons.flatMap((lesson) => lesson.blocks ?? []);
  const kind =
    moduleData.kind ??
    (allBlocks.length > 0 && isImageOnly(allBlocks) ? "IMAGE_ONLY" : "STRUCTURED");

  const moduleRecord = await prisma.module.upsert({
    where: { id: moduleId },
    create: {
      id: moduleId,
      slug: moduleId,
      kind,
      order: moduleData.order ?? moduleData.number ?? 0,
      number: moduleData.number ?? moduleData.order ?? 0,
      title: moduleData.title,
      cardTitle: moduleData.cardTitle ?? moduleData.title,
      eyebrow: moduleData.eyebrow ?? null,
      cardDescription: moduleData.cardDescription ?? null,
      description: moduleData.description,
      pills: moduleData.pills ?? [],
      footer: moduleData.footer ?? null,
      gallery: (moduleData.gallery as object | undefined) ?? undefined,
      referencesTitle: moduleData.references?.title ?? null,
      referencesIntro: moduleData.references?.intro ?? null,
      referencesHtml: moduleData.references?.html ?? null,
      quizTitle: moduleData.quiz?.title ?? null,
      quizDescription: moduleData.quiz?.description ?? null,
      quizNavLabel: moduleData.quiz?.navLabel ?? null,
      createdById: createdById ?? null,
    },
    update: {
      slug: moduleId,
      kind,
      order: moduleData.order ?? moduleData.number ?? 0,
      number: moduleData.number ?? moduleData.order ?? 0,
      title: moduleData.title,
      cardTitle: moduleData.cardTitle ?? moduleData.title,
      eyebrow: moduleData.eyebrow ?? null,
      cardDescription: moduleData.cardDescription ?? null,
      description: moduleData.description,
      pills: moduleData.pills ?? [],
      footer: moduleData.footer ?? null,
      gallery: (moduleData.gallery as object | undefined) ?? undefined,
      referencesTitle: moduleData.references?.title ?? null,
      referencesIntro: moduleData.references?.intro ?? null,
      referencesHtml: moduleData.references?.html ?? null,
      quizTitle: moduleData.quiz?.title ?? null,
      quizDescription: moduleData.quiz?.description ?? null,
      quizNavLabel: moduleData.quiz?.navLabel ?? null,
      ...(createdById ? { createdById } : {}),
    },
  });

  const manifest = moduleData.assets ?? [];
  const manifestById = new Map(manifest.map((asset) => [asset.assetId, asset]));
  const inputById = new Map(assetInputs.map((asset) => [asset.assetId, asset]));
  const assetIds = new Set<string>([
    ...manifest.map((asset) => asset.assetId),
    ...assetInputs.map((asset) => asset.assetId),
  ]);

  for (const assetId of assetIds) {
    const manifestAsset = manifestById.get(assetId);
    const input = inputById.get(assetId) ?? (manifestAsset as ModuleAssetInput | undefined);
    if (!input) continue;

    const fileName = input.fileName ?? manifestAsset?.fileName ?? assetId;
    const mimeType = input.mimeType ?? manifestAsset?.mimeType ?? mimeFromName(fileName);
    let storageKey = input.storageKey ?? manifestAsset?.storageKey;
    if (!storageKey) {
      if (!input.buffer) {
        throw new Error(`فایل دارایی «${assetId}» ارسال نشده است.`);
      }
      storageKey = moduleAssetKey(moduleId, assetId, fileName);
      await putObject(storageKey, input.buffer, mimeType);
    }

    const data = {
      moduleId,
      assetId,
      kind: input.kind ?? manifestAsset?.kind ?? "IMAGE",
      fileName,
      mimeType,
      size: input.buffer?.byteLength ?? 0,
      width: input.width ?? manifestAsset?.width ?? null,
      height: input.height ?? manifestAsset?.height ?? null,
      storageKey,
    };

    await prisma.moduleAsset.upsert({
      where: { moduleId_assetId: { moduleId, assetId } },
      create: data,
      update: data,
    });
  }

  if (moduleData.assets) {
    await prisma.moduleAsset.deleteMany({
      where: { moduleId, assetId: { notIn: Array.from(assetIds) } },
    });
  }

  const lessonIds = new Set<string>();
  for (const lesson of sortedLessons) {
    const blocks = lesson.blocks ?? [];
    assertBlocks(lesson, assetIds);
    lessonIds.add(lesson.id);
    const data = {
      moduleId,
      slug: lesson.id,
      order: lesson.order ?? 0,
      title: lesson.title,
      mins: lesson.mins ?? null,
      source: lesson.source ?? null,
      summary: lesson.summary ?? null,
      html: "",
      blocks: blocks as never,
      searchText: blocksToPlainText(blocks),
    };
    await prisma.lesson.upsert({
      where: { moduleId_slug: { moduleId, slug: lesson.id } },
      create: { id: `${moduleId}:lesson:${lesson.id}`, ...data },
      update: data,
    });
  }

  await prisma.lesson.deleteMany({
    where: { moduleId, slug: { notIn: Array.from(lessonIds) } },
  });

  const questions = moduleData.questions ?? [];
  const questionIds = new Set<string>();
  for (const [index, question] of questions.entries()) {
    const id = `${moduleId}:q:${index + 1}`;
    questionIds.add(id);
    const choices = [...question.choices, "", "", "", ""].slice(0, 4);
    const correctOption = String.fromCharCode(65 + Math.max(0, Math.min(3, question.correct)));
    const data = {
      moduleId,
      lessonSlug: question.topic ?? null,
      blockId: question.blockId ?? null,
      order: index,
      text: question.question,
      optionA: choices[0],
      optionB: choices[1],
      optionC: choices[2],
      optionD: choices[3],
      correctOption,
      explanation: question.why,
      topic: question.topic ?? null,
    };
    await prisma.moduleQuestion.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  }
  await prisma.moduleQuestion.deleteMany({
    where: { moduleId, id: { notIn: Array.from(questionIds) } },
  });

  const flashcards = moduleData.flashcards ?? [];
  const flashcardIds = new Set<string>();
  for (const [index, card] of flashcards.entries()) {
    const id = `${moduleId}:fc:${index + 1}`;
    flashcardIds.add(id);
    const data = {
      moduleId,
      order: index,
      term: card.term,
      definition: card.definition,
    };
    await prisma.flashcard.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  }
  await prisma.flashcard.deleteMany({
    where: { moduleId, id: { notIn: Array.from(flashcardIds) } },
  });

  return {
    module: moduleRecord,
    lessons: sortedLessons.length,
    questions: questions.length,
    flashcards: flashcards.length,
    assets: assetIds.size,
  };
}

export function validateModuleAssetRefs(lessons: LessonJsonInput[]) {
  const refs = new Set<string>();
  for (const lesson of lessons) {
    for (const assetId of collectAssetRefs(lesson.blocks ?? [])) refs.add(assetId);
  }
  return Array.from(refs);
}
