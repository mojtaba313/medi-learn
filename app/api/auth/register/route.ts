import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { err, readJson } from "@/lib/api";

const registerSchema = z.object({
  name: z.string().trim().min(2, "نام باید حداقل ۲ کاراکتر باشد").max(80),
  email: z.string().trim().email("ایمیل معتبر نیست").toLowerCase(),
  password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد").max(128),
});

export async function POST(request: NextRequest) {
  const body = await readJson<unknown>(request);
  if (!body) return err("درخواست نامعتبر است");

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "داده‌های ورودی نامعتبر است", 422);
  }

  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return err("این ایمیل قبلاً ثبت شده است", 409);

  const userCount = await db.user.count();
  const passwordHash = await hashPassword(password);

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: userCount === 0 ? "ADMIN" : "STUDENT",
    },
  });

  await createSession({ userId: user.id, name: user.name, email: user.email, role: user.role });

  return NextResponse.json(
    {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      isFirstUser: userCount === 0,
    },
    { status: 201 }
  );
}