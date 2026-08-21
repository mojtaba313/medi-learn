import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { err, readJson } from "@/lib/api";

const registerSchema = z.object({
  name: z.string().trim().min(2, "نام باید حداقل ۲ کاراکتر باشد").max(80),
  username: z
    .string()
    .trim()
    .min(3, "نام کاربری حداقل ۳ کاراکتر باشد")
    .max(30, "نام کاربری حداکثر ۳۰ کاراکتر باشد")
    .regex(/^[\p{L}\p{N}_.]+$/u, "نام کاربری فقط شامل حروف، اعداد، _ و . باشد")
    .toLowerCase(),
  password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد").max(128),
});

export async function POST(request: NextRequest) {
  const body = await readJson<unknown>(request);
  if (!body) return err("درخواست نامعتبر است");

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "داده‌های ورودی نامعتبر است", 422);
  }

  const { name, username, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { username } });
  if (existing) return err("این نام کاربری قبلاً ثبت شده است", 409);

  const userCount = await db.user.count();
  const passwordHash = await hashPassword(password);

  const user = await db.user.create({
    data: {
      name,
      username,
      passwordHash,
      role: userCount === 0 ? "ADMIN" : "STUDENT",
    },
  });

  await createSession({
    userId: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
  });

  return NextResponse.json(
    {
      user: { id: user.id, name: user.name, username: user.username, role: user.role },
      isFirstUser: userCount === 0,
    },
    { status: 201 }
  );
}