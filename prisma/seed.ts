import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@medilearn.app";
  const password = process.env.ADMIN_PASSWORD ?? "admin1234";
  const name = process.env.ADMIN_NAME ?? "مدیر";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✅ کاربر مدیر از قبل وجود دارد: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log(`✅ حساب مدیر ایجاد شد: ${email} (رمز: ${password})`);
}

main()
  .catch((e) => {
    console.error("❌ خطا در اجرای seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });