import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { err, ok, dbUnavailable, isDbConnectionError } from "@/lib/api";
import {
  courseKey,
  courseSourceKey,
  imageUrlFor,
  pdfUrlFor,
  putObject,
} from "@/lib/s3";

export async function GET() {
  const user = await requireAdmin();
  try {
    const courses = await db.course.findMany({
      where: user.role === "ADMIN" ? {} : { createdById: user.id },
      include: {
        _count: { select: { pages: true, questions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const pageCounts = await db.page.groupBy({
      by: ["courseId"],
      _count: { _all: true },
    });
    const counts = new Map(pageCounts.map((p) => [p.courseId, p._count._all]));

    const response = courses.map((c) => ({
      ...c,
      totalPages: counts.get(c.id) ?? 0,
    }));

    return ok({ courses: response });
  } catch (e) {
    if (isDbConnectionError(e)) return dbUnavailable(e);
    throw e;
  }
}

export async function POST(request: NextRequest) {
  const user = await requireAdmin();

  const formData = await request.formData();
  if (!formData) return err("درخواست نامعتبر است");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "عمومی").trim();
  const file = formData.get("file");
  const images = formData.getAll("images");
  const metaRaw = formData.get("meta");

  if (!title) return err("عنوان درس الزامی است", 422);
  if (!(file instanceof File)) return err("فایل PDF جزوه الزامی است", 422);
  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    return err("فقط فایل‌های PDF پشتیبانی می‌شوند", 422);
  }
  if (file.size > 200 * 1024 * 1024) {
    return err("حجم فایل نباید بیشتر از ۲۰۰ مگابایت باشد", 422);
  }

  const imageBlobs = images.filter((x): x is File => x instanceof File);
  if (imageBlobs.length === 0) {
    return err("تصاویر صفحات تولید نشده‌اند", 422);
  }

  let meta: { width?: number; height?: number }[] = [];
  if (metaRaw) {
    try {
      const parsed = JSON.parse(String(metaRaw));
      if (Array.isArray(parsed)) meta = parsed;
    } catch {
      meta = [];
    }
  }

  const course = await db.course.create({
    data: {
      title,
      description,
      category,
      createdById: user.id,
      status: "PROCESSING",
      pdfUrl: null,
    },
  });

  try {
    // Store the original PDF for download / reference.
    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    await putObject(courseSourceKey(course.id), pdfBuffer, "application/pdf");
    await db.course.update({
      where: { id: course.id },
      data: { pdfUrl: pdfUrlFor(course.id) },
    });

    // Upload the client-rendered page images to storage.
    const uploads = await Promise.all(
      imageBlobs.map(async (blob, i) => {
        const pageNumber = i + 1;
        const buffer = Buffer.from(await blob.arrayBuffer());
        const fileName = `page-${String(pageNumber).padStart(3, "0")}.jpg`;
        await putObject(courseKey(course.id, fileName), buffer, "image/jpeg");
        const dims = meta[i] ?? {};
        return {
          pageNumber,
          fileName,
          width: Number(dims.width) || 0,
          height: Number(dims.height) || 0,
        };
      }),
    );

    await db.$transaction(async (tx) => {
      for (const u of uploads) {
        await tx.page.create({
          data: {
            courseId: course.id,
            pageNumber: u.pageNumber,
            imageUrl: imageUrlFor(course.id, u.fileName),
            width: u.width,
            height: u.height,
          },
        });
      }
      await tx.course.update({
        where: { id: course.id },
        data: { status: "READY", totalPages: uploads.length, error: null },
      });
    });

    const created = await db.course.findUnique({
      where: { id: course.id },
      include: { _count: { select: { pages: true, questions: true } } },
    });
    return ok({ course: created }, { status: 201 });
  } catch (error) {
    await db.course.update({
      where: { id: course.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "آپلود ناموفق بود",
      },
    });
    const failed = await db.course.findUnique({ where: { id: course.id } });
    return ok({ course: failed }, { status: 201 });
  }
}
