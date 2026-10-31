import { z } from "zod";
import type { AnnotationData, AnnotationElement } from "@/lib/annotations";

export const BLOCK_TYPES = [
  "heading",
  "paragraph",
  "list",
  "image",
  "table",
  "callout",
  "quote",
  "code",
  "divider",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export interface HeadingBlock {
  id: string;
  type: "heading";
  level: 2 | 3 | 4;
  text: string;
}

export interface ParagraphBlock {
  id: string;
  type: "paragraph";
  text: string;
}

export interface ListBlock {
  id: string;
  type: "list";
  ordered: boolean;
  items: string[];
}

export interface ImageBlock {
  id: string;
  type: "image";
  assetId: string;
  alt?: string;
  caption?: string;
}

export interface TableBlock {
  id: string;
  type: "table";
  headers: string[];
  rows: string[][];
}

export interface CalloutBlock {
  id: string;
  type: "callout";
  tone: "info" | "warning" | "success" | "danger";
  title?: string;
  text: string;
}

export interface QuoteBlock {
  id: string;
  type: "quote";
  text: string;
  cite?: string;
}

export interface CodeBlock {
  id: string;
  type: "code";
  language?: string;
  text: string;
}

export interface DividerBlock {
  id: string;
  type: "divider";
}

export type ContentBlock =
  | HeadingBlock
  | ParagraphBlock
  | ListBlock
  | ImageBlock
  | TableBlock
  | CalloutBlock
  | QuoteBlock
  | CodeBlock
  | DividerBlock;

const idSchema = z.string().min(1).max(200);
const textSchema = z.string().max(200_000);
const optionalTextSchema = textSchema.optional();

export const contentBlockSchema = z.discriminatedUnion("type", [
  z.object({
    id: idSchema,
    type: z.literal("heading"),
    level: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    text: textSchema,
  }),
  z.object({
    id: idSchema,
    type: z.literal("paragraph"),
    text: textSchema,
  }),
  z.object({
    id: idSchema,
    type: z.literal("list"),
    ordered: z.boolean().default(false),
    items: z.array(textSchema).max(500),
  }),
  z.object({
    id: idSchema,
    type: z.literal("image"),
    assetId: z.string().min(1).max(200),
    alt: optionalTextSchema,
    caption: optionalTextSchema,
  }),
  z.object({
    id: idSchema,
    type: z.literal("table"),
    headers: z.array(textSchema).max(30),
    rows: z.array(z.array(textSchema).max(30)).max(500),
  }),
  z.object({
    id: idSchema,
    type: z.literal("callout"),
    tone: z.enum(["info", "warning", "success", "danger"]).default("info"),
    title: optionalTextSchema,
    text: textSchema,
  }),
  z.object({
    id: idSchema,
    type: z.literal("quote"),
    text: textSchema,
    cite: optionalTextSchema,
  }),
  z.object({
    id: idSchema,
    type: z.literal("code"),
    language: optionalTextSchema,
    text: textSchema,
  }),
  z.object({
    id: idSchema,
    type: z.literal("divider"),
  }),
]);

export const blocksSchema = z.array(contentBlockSchema).max(5_000);

export function parseBlocks(value: unknown): ContentBlock[] {
  const parsed = blocksSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function blocksToPlainText(blocks: ContentBlock[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case "heading":
      case "paragraph":
      case "callout":
      case "quote":
      case "code":
        parts.push(block.text);
        if (block.type === "callout" && block.title) parts.push(block.title);
        if (block.type === "quote" && block.cite) parts.push(block.cite);
        break;
      case "list":
        parts.push(...block.items);
        break;
      case "image":
        if (block.alt) parts.push(block.alt);
        if (block.caption) parts.push(block.caption);
        break;
      case "table":
        parts.push(...block.headers);
        for (const row of block.rows) parts.push(...row);
        break;
      case "divider":
        break;
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function collectAssetRefs(blocks: ContentBlock[]): string[] {
  const refs = new Set<string>();
  for (const block of blocks) {
    if (block.type === "image") refs.add(block.assetId);
  }
  return Array.from(refs);
}

export function extractBlockHeadings(blocks: ContentBlock[]): { id: string; text: string }[] {
  return blocks.flatMap((block) =>
    block.type === "heading" && block.text.trim()
      ? [{ id: `section-${block.id}`, text: block.text }]
      : [],
  );
}

export function splitBlocksByHeadings(
  blocks: ContentBlock[],
  noteId: string,
  noteTitle: string,
): Array<{
  id: string;
  slug: string;
  order: number;
  title: string;
  mins: string | null;
  source: string | null;
  summary: string;
  html: string;
  blocks: ContentBlock[];
  searchText: string | null;
  assets: Record<string, { url: string; width?: number; height?: number }>;
  imageAnnotations: Record<string, AnnotationElement[]>;
}> {
  const lessons: Array<{
    id: string;
    slug: string;
    order: number;
    title: string;
    mins: string | null;
    source: string | null;
    summary: string;
    html: string;
    blocks: ContentBlock[];
    searchText: string | null;
    assets: Record<string, { url: string; width?: number; height?: number }>;
    imageAnnotations: Record<string, AnnotationElement[]>;
  }> = [];

  let currentLessonBlocks: ContentBlock[] = [];
  let currentLessonTitle = "";
  let currentLessonOrder = 0;
  let lessonCounter = 0;

  for (const block of blocks) {
    if (block.type === "heading" && block.level === 2 && block.text.trim()) {
      // Save previous lesson if it has content
      if (currentLessonBlocks.length > 0) {
        lessonCounter++;
        lessons.push({
          id: `${noteId}-lesson-${lessonCounter}`,
          slug: `${noteId}-lesson-${lessonCounter}`,
          order: currentLessonOrder,
          title: currentLessonTitle || `درس ${lessonCounter}`,
          mins: null,
          source: null,
          summary: "",
          html: "",
          blocks: currentLessonBlocks,
          searchText: currentLessonBlocks
            .filter((b) => b.type === "paragraph" || b.type === "heading")
            .map((b) => (b as { text: string }).text)
            .join(" "),
          assets: {},
          imageAnnotations: {},
        });
      }
      // Start new lesson
      currentLessonTitle = block.text.trim();
      currentLessonOrder = lessonCounter + 1;
      currentLessonBlocks = [];
    } else {
      currentLessonBlocks.push(block);
    }
  }

  // Save last lesson
  if (currentLessonBlocks.length > 0) {
    lessonCounter++;
    lessons.push({
      id: `${noteId}-lesson-${lessonCounter}`,
      slug: `${noteId}-lesson-${lessonCounter}`,
      order: currentLessonOrder,
      title: currentLessonTitle || `درس ${lessonCounter}`,
      mins: null,
      source: null,
      summary: "",
      html: "",
      blocks: currentLessonBlocks,
      searchText: currentLessonBlocks
        .filter((b) => b.type === "paragraph" || b.type === "heading")
        .map((b) => (b as { text: string }).text)
        .join(" "),
      assets: {},
      imageAnnotations: {},
    });
  }

  // If no headings found, return single lesson with all blocks
  if (lessons.length === 0 && blocks.length > 0) {
    lessons.push({
      id: noteId,
      slug: noteId,
      order: 1,
      title: noteTitle,
      mins: null,
      source: null,
      summary: "",
      html: "",
      blocks,
      searchText: blocks
        .filter((b) => b.type === "paragraph" || b.type === "heading")
        .map((b) => (b as { text: string }).text)
        .join(" "),
      assets: {},
      imageAnnotations: {},
    });
  }

  return lessons;
}

export function isImageOnly(blocks: ContentBlock[]): boolean {
  return (
    blocks.length > 0 &&
    blocks.every((block) => block.type === "image" || block.type === "heading")
  );
}
