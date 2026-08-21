import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { err, readJson } from "@/lib/api";

const loginSchema = z.object({
  email: z.string().trim().email("ایمیل معتبر نیست").toLowerCase(),
  password: z.string().min(1, "رمز عبور را وارد کنید"),
});

export async function POST(request: NextRequest) {
  const body = await readJson<unknown>(request);
  if (!body) return err("درخواست نامعتبر است");

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "داده‌های ورودی نامعتبر است", 422);

  const { email, password } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return err("ایمیل یا رمز عبور اشتباه است", 401);
  }

  await createSession({ userId: user.id, name: user.name, email: user.email, role: user.role });

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}