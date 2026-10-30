import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import {
  importModule,
  type LessonJsonInput,
  type ModuleJsonInput,
} from "../lib/module-import";

const prisma = new PrismaClient();

async function seedAdmin() {
  const username = (process.env.ADMIN_USERNAME ?? "admin").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "admin1234";
  const name = process.env.ADMIN_NAME ?? "مدیر";

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`✅ کاربر مدیر از قبل وجود دارد: ${username}`);
    return existing;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      username,
      name,
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log(`✅ حساب مدیر ایجاد شد: ${username} (رمز: ${password})`);
  return user;
}

async function seedModules(adminId?: string) {
  const contentDir = path.join(process.cwd(), "content", "modules");
  if (!fs.existsSync(contentDir)) {
    console.log("ℹ️ پوشه content/modules پیدا نشد؛ از واردکردن ماژول صرف‌نظر شد.");
    return;
  }

  const moduleDirs = fs
    .readdirSync(contentDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const dirName of moduleDirs) {
    const dir = path.join(contentDir, dirName);
    const modulePath = path.join(dir, "module.json");
    if (!fs.existsSync(modulePath)) continue;

    const moduleData = JSON.parse(
      fs.readFileSync(modulePath, "utf8"),
    ) as ModuleJsonInput;

    const lessonsDir = path.join(dir, "lessons");
    const lessons: LessonJsonInput[] = fs.existsSync(lessonsDir)
      ? fs
          .readdirSync(lessonsDir)
          .filter((file) => file.endsWith(".json"))
          .map((file) =>
            JSON.parse(
              fs.readFileSync(path.join(lessonsDir, file), "utf8"),
            ) as LessonJsonInput,
          )
      : [];

    const result = await importModule(prisma, moduleData, lessons, adminId);
    console.log(
      `✅ ماژول «${result.module.title}» وارد شد: ${result.lessons} درس، ${result.questions} سوال، ${result.flashcards} فلش‌کارت`,
    );
  }
}

async function main() {
  const admin = await seedAdmin();
  await seedModules(admin?.id);
}

main()
  .catch((e) => {
    console.error("❌ خطا در اجرای seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
