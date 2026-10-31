import type { PrismaClient } from "@prisma/client";
import {
  blocksToPlainText,
  collectAssetRefs,
  isImageOnly,
  type ContentBlock,
} from "@/lib/content-blocks";
import { putObject } from "@/lib/s3";

export interface NoteQuestionInput {
  topic?: string;
  question: string;
  choices: string[];
  correct: number;
  why: string;
  blockId?: string;
}

export interface NoteAssetJson {
  assetId: string;
  fileName?: string;
  kind?: string;
  mimeType?: string;
  storageKey?: string;
  width?: number | null;
  height?: number | null;
}

export interface NoteJsonInput {
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
  questions?: NoteQuestionInput[];
  flashcards?: { term: string; definition: string }[];
  references?: { title?: string; intro?: string; html?: string };
  gallery?: unknown;
  blocks?: ContentBlock[];
  searchText?: string;
  assets?: NoteAssetJson[];
}

export interface NoteAssetInput extends NoteAssetJson {
  buffer?: Buffer | Uint8Array;
}

import type { Note } from "@prisma/client";

export interface NoteImportResult {
  note: Note;
  blocks: number;
  questions: number;
  flashcards: number;
  assets: number;
}

function safeFileName(value: string) {
  return value.replace(/[^\w.\-]+/g, "-").replace(/^-+|-+$/g, "") || "asset";
}

export function noteAssetKey(noteId: string, assetId: string, fileName: string) {
  return `notes/${noteId}/assets/${safeFileName(assetId)}-${safeFileName(fileName)}`;
}

function mimeFromName(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function assertBlocks(blocks: ContentBlock[] | undefined, assetIds: Set<string>) {
  if (!blocks) return;
  const seen = new Set<string>();
  for (const block of blocks) {
    if (seen.has(block.id)) {
      throw new Error(`شناسهٔ بلوک تکراری: ${block.id}`);
    }
    seen.add(block.id);
    if (block.type === "image" && !assetIds.has(block.assetId)) {
      throw new Error(
        `تصویر «${block.assetId}» در دارایی‌های جزوه پیدا نشد.`,
      );
    }
  }
}

export async function importNote(
  prisma: PrismaClient,
  noteData: NoteJsonInput,
  createdById?: string,
  assetInputs: NoteAssetInput[] = [],
) {
  const noteId = noteData.id;
  const blocks = noteData.blocks ?? [];
  const kind =
    noteData.kind ??
    (blocks.length > 0 && isImageOnly(blocks) ? "IMAGE_ONLY" : "STRUCTURED");

  const noteRecord = await prisma.note.upsert({
    where: { id: noteId },
    create: {
      id: noteId,
      slug: noteId,
      kind,
      order: noteData.order ?? noteData.number ?? 0,
      number: noteData.number ?? noteData.order ?? 0,
      title: noteData.title,
      cardTitle: noteData.cardTitle ?? noteData.title,
      eyebrow: noteData.eyebrow ?? null,
      cardDescription: noteData.cardDescription ?? null,
      description: noteData.description,
      pills: noteData.pills ?? [],
      footer: noteData.footer ?? null,
      gallery: (noteData.gallery as object | undefined) ?? undefined,
      referencesTitle: noteData.references?.title ?? null,
      referencesIntro: noteData.references?.intro ?? null,
      referencesHtml: noteData.references?.html ?? null,
      quizTitle: noteData.quiz?.title ?? null,
      quizDescription: noteData.quiz?.description ?? null,
      quizNavLabel: noteData.quiz?.navLabel ?? null,
      blocks: blocks as never,
      searchText: noteData.searchText ?? blocksToPlainText(blocks),
      createdById: createdById ?? null,
    },
    update: {
      slug: noteId,
      kind,
      order: noteData.order ?? noteData.number ?? 0,
      number: noteData.number ?? noteData.order ?? 0,
      title: noteData.title,
      cardTitle: noteData.cardTitle ?? noteData.title,
      eyebrow: noteData.eyebrow ?? null,
      cardDescription: noteData.cardDescription ?? null,
      description: noteData.description,
      pills: noteData.pills ?? [],
      footer: noteData.footer ?? null,
      gallery: (noteData.gallery as object | undefined) ?? undefined,
      referencesTitle: noteData.references?.title ?? null,
      referencesIntro: noteData.references?.intro ?? null,
      referencesHtml: noteData.references?.html ?? null,
      quizTitle: noteData.quiz?.title ?? null,
      quizDescription: noteData.quiz?.description ?? null,
      quizNavLabel: noteData.quiz?.navLabel ?? null,
      blocks: blocks as never,
      searchText: noteData.searchText ?? blocksToPlainText(blocks),
      ...(createdById ? { createdById } : {}),
    },
  });

  const manifest = noteData.assets ?? [];
  const manifestById = new Map(manifest.map((asset) => [asset.assetId, asset]));
  const inputById = new Map(assetInputs.map((asset) => [asset.assetId, asset]));
  const assetIds = new Set<string>([
    ...manifest.map((asset) => asset.assetId),
    ...assetInputs.map((asset) => asset.assetId),
  ]);

  for (const assetId of assetIds) {
    const manifestAsset = manifestById.get(assetId);
    const input = inputById.get(assetId) ?? (manifestAsset as NoteAssetInput | undefined);
    if (!input) continue;

    const fileName = input.fileName ?? manifestAsset?.fileName ?? assetId;
    const mimeType = input.mimeType ?? manifestAsset?.mimeType ?? mimeFromName(fileName);
    let storageKey = input.storageKey ?? manifestAsset?.storageKey;
    if (!storageKey) {
      if (!input.buffer) {
        throw new Error(`فایل دارایی «${assetId}» ارسال نشده است.`);
      }
      storageKey = noteAssetKey(noteId, assetId, fileName);
      await putObject(storageKey, input.buffer, mimeType);
    }

    const data = {
      noteId,
      assetId,
      kind: input.kind ?? manifestAsset?.kind ?? "IMAGE",
      fileName,
      mimeType,
      size: input.buffer?.byteLength ?? 0,
      width: input.width ?? manifestAsset?.width ?? null,
      height: input.height ?? manifestAsset?.height ?? null,
      storageKey,
    };

    await prisma.noteAsset.upsert({
      where: { noteId_assetId: { noteId, assetId } },
      create: data,
      update: data,
    });
  }

  if (noteData.assets) {
    await prisma.noteAsset.deleteMany({
      where: { noteId, assetId: { notIn: Array.from(assetIds) } },
    });
  }

  assertBlocks(blocks, assetIds);

  const questionIds = new Set<string>();
  const questions = noteData.questions ?? [];
  for (const [index, question] of questions.entries()) {
    const id = `${noteId}:q:${index + 1}`;
    questionIds.add(id);
    const choices = [...question.choices, "", "", "", ""].slice(0, 4);
    const correctOption = String.fromCharCode(65 + Math.max(0, Math.min(3, question.correct)));
    const data = {
      noteId,
      noteSlug: question.topic ?? null,
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
    await prisma.noteQuestion.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  }
  await prisma.noteQuestion.deleteMany({
    where: { noteId, id: { notIn: Array.from(questionIds) } },
  });

  const flashcardIds = new Set<string>();
  const flashcards = noteData.flashcards ?? [];
  for (const [index, card] of flashcards.entries()) {
    const id = `${noteId}:fc:${index + 1}`;
    flashcardIds.add(id);
    const data = {
      noteId,
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
    where: { noteId, id: { notIn: Array.from(flashcardIds) } },
  });

  return {
    note: noteRecord,
    blocks: blocks.length,
    questions: questions.length,
    flashcards: flashcards.length,
    assets: assetIds.size,
  };
}

export function validateNoteAssetRefs(blocks: ContentBlock[] | undefined) {
  const refs = new Set<string>();
  if (blocks) {
    for (const assetId of collectAssetRefs(blocks)) refs.add(assetId);
  }
  return Array.from(refs);
}
