import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { err, readJson, ok } from "@/lib/api";
import { questionSchema } from "@/lib/question-schema";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return err("دسترسی غیرمجاز", 401);

  const { id } = await params;

  const course = await db.course.findUnique({ where: { id } });
  if (!course) return err("درس پیدا نشد", 404);

  const questions = await db.question.findMany({
    where: { courseId: id },
    include: {
      responses: {
        where: { userId: session.userId },
        select: { selectedOption: true, isCorrect: true, timeSpentMs: true, answeredAt: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const pageCount = await db.page.count({ where: { courseId: id } });

  const mapped = questions.map((q) => ({
    id: q.id,
    courseId: q.courseId,
    pageNumber: q.pageNumber,
    text: q.text,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    correctOption: q.correctOption,
    explanation: q.explanation,
    tags: q.tags,
    createdAt: q.createdAt,
    response: q.responses[0] ?? null,
  }));

  return ok({ questions: mapped, totalPages: pageCount });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return err("دسترسی غیرمجاز", 401);

  const { id } = await params;
  const course = await db.course.findUnique({ where: { id } });
  if (!course) return err("درس پیدا نشد", 404);

  const body = await readJson<unknown>(request);
  if (!body) return err("درخواست نامعتبر است");

  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "داده نامعتبر", 422);
  }

  const { pageNumber, ...data } = parsed.data;

  if (pageNumber !== null && pageNumber !== undefined) {
    const page = await db.page.findUnique({
      where: { courseId_pageNumber: { courseId: id, pageNumber } },
    });
    if (!page) return err(`صفحه ${pageNumber} در این درس وجود ندارد`, 422);
  }

  const question = await db.question.create({
    data: {
      courseId: id,
      pageNumber: pageNumber ?? null,
      ...data,
    },
  });

  return ok({ question }, { status: 201 });
}