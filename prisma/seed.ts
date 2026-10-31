import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import {
  importNote,
  type NoteJsonInput,
  type NoteAssetInput,
  type NoteAssetJson,
} from "../lib/module-import";
import type { ContentBlock } from "@/lib/content-blocks";

interface ModuleJsonInput {
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
  questions?: { topic?: string; question: string; choices: string[]; correct: number; why: string; blockId?: string }[];
  flashcards?: { term: string; definition: string }[];
  references?: { title?: string; intro?: string; html?: string };
  gallery?: unknown;
  assets?: { assetId: string; fileName?: string; kind?: string; mimeType?: string; storageKey?: string; width?: number | null; height?: number | null }[];
}

const prisma = new PrismaClient();

async function seedAdmin() {
  const username = (process.env.ADMIN_USERNAME ?? "admin").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "admin1234";
  const name = process.env.ADMIN_NAME ?? "مدیر";

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { username },
    create: { username, name, passwordHash, role: "ADMIN" },
    update: { passwordHash },
  });
  console.log(`✅ حساب مدیر ایجاد شد: ${username} (رمز: ${password})`);
  return user;
}

function collectAssetRefs(blocks: ContentBlock[]): string[] {
  const refs = new Set<string>();
  for (const block of blocks ?? []) {
    if (block.type === "image") refs.add(block.assetId);
  }
  return Array.from(refs);
}

async function seedNotes(adminId?: string) {
  const bundleDir = path.join(process.cwd(), "content", "export", "module-3");
  const notePath = path.join(bundleDir, "note.json");
  if (!fs.existsSync(bundleDir)) {
    console.log("ℹ️ پوشه xuất-content پیدا نشد؛ از واردکردن جزوه صرف‌نظر شد.");
    return;
  }

  // Prefer a single bundled note.json; otherwise build one note per lesson.
  if (fs.existsSync(notePath)) {
    const noteData = JSON.parse(
      fs.readFileSync(notePath, "utf8"),
    ) as NoteJsonInput;
    const result = await importNote(prisma, noteData, adminId);
    console.log(
      `✅ جزوه «${result.note.title}» وارد شد: ${result.blocks} بلوک، ${result.questions} سوال، ${result.flashcards} فلش‌کارت، ${result.assets} دارایی`,
    );
    return;
  }

  const modulePath = path.join(bundleDir, "module.json");
  if (!fs.existsSync(modulePath)) {
    console.log("ℹ️ فایل جزوه پیدا نشد؛ از واردکردن صرف‌نظر شد.");
    return;
  }

  const moduleData = JSON.parse(
    fs.readFileSync(modulePath, "utf8"),
  ) as ModuleJsonInput;

  const lessonsDir = path.join(bundleDir, "lessons");
  const lessonFiles = fs.existsSync(lessonsDir)
    ? fs
        .readdirSync(lessonsDir)
        .filter((file) => file.endsWith(".json"))
        .map((file) => JSON.parse(fs.readFileSync(path.join(lessonsDir, file), "utf8")))
        .sort((a: ModuleJsonInput, b: ModuleJsonInput) => (a.order ?? 0) - (b.order ?? 0))
    : [];

  // Deduplicate lessons by id
  const seenLessonIds = new Set<string>();
  const lessons = lessonFiles.filter((lesson) => {
    if (seenLessonIds.has(lesson.id)) return false;
    seenLessonIds.add(lesson.id);
    return true;
  });

  console.log(`Found ${lessons.length} unique lessons`);

  // Assets referenced across all lessons (shared repo assets).
  const allAssets: NoteAssetInput[] = [];
  const assetsDir = path.join(bundleDir, "assets");
  const manifestAssets = (moduleData.assets ?? []) as NoteAssetJson[];
  for (const asset of manifestAssets) {
    const fileName = asset.fileName ?? asset.assetId;
    const filePath = path.join(assetsDir, fileName);
    const buffer = fs.existsSync(filePath) ? fs.readFileSync(filePath) : undefined;
    allAssets.push({
      assetId: asset.assetId,
      fileName: asset.fileName,
      kind: asset.kind,
      mimeType: asset.mimeType,
      buffer,
    } as NoteAssetInput);
  }
  const assetIds = new Set(allAssets.map((a) => a.assetId));

  // Combine all lesson blocks into a single note
  const allBlocks: ContentBlock[] = [];
  let blockCounter = 0;
  for (const lesson of lessons) {
    const blocks = lesson.blocks ?? [];
    // Add lesson title as a heading block if not already present
    const lessonTitleBlock: ContentBlock = {
      id: `heading-${blockCounter++}`,
      type: "heading",
      level: 2,
      text: lesson.title,
    };
    allBlocks.push(lessonTitleBlock);
    // Add lesson blocks with updated IDs to avoid duplicates
    for (const block of blocks) {
      allBlocks.push({
        ...block,
        id: `${block.id}-${blockCounter++}`,
      });
    }
    // Add a divider between lessons (except after the last one)
    if (lesson !== lessons[lessons.length - 1]) {
      allBlocks.push({
        id: `divider-${blockCounter++}`,
        type: "divider",
      });
    }
  }

  // Collect all asset IDs used in all blocks
  const usedAssetIds = new Set<string>();
  for (const block of allBlocks) {
    if (block.type === "image") {
      usedAssetIds.add(block.assetId);
    }
  }
  const noteAssets = allAssets.filter((a) => usedAssetIds.has(a.assetId));

  const noteData: NoteJsonInput = {
    id: moduleData.id,
    order: 1,
    number: 1,
    title: moduleData.title,
    cardTitle: moduleData.cardTitle ?? moduleData.title,
    description: moduleData.description ?? "",
    kind: moduleData.kind,
    blocks: allBlocks,
    searchText: allBlocks
      .filter((b) => b.type === "paragraph" || b.type === "heading")
      .map((b) => (b as { text: string }).text)
      .join(" "),
    assets: noteAssets.length ? noteAssets : undefined,
  };

  const result = await importNote(prisma, noteData, adminId, noteAssets);
  console.log(
    `✅ جزوه «${result.note.title}» وارد شد: ${result.blocks} بلوک، ${result.questions} سوال، ${result.flashcards} فلش‌کارت، ${result.assets} دارایی`,
  );
}

async function main() {
  const admin = await seedAdmin();
  await seedNotes(admin?.id);
}

main()
  .catch((e) => {
    console.error("❌ خطا در اجرای seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
