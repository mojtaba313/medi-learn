import { db } from "@/lib/db";
import { renderPdfPages } from "@/lib/pdf";
import {
  courseSourceKey,
  getObjectBuffer,
  imageUrlFor,
  pageKey,
  putObject,
} from "@/lib/s3";

/**
 * Downloads the source PDF for a course from storage, renders every page to a
 * PNG, uploads the PNGs back to storage, and creates the corresponding Page
 * records. The course status is moved to READY (or FAILED on error).
 */
export async function processCoursePdf(courseId: string, scale = 2) {
  const sourceKey = courseSourceKey(courseId);
  const pdfBuffer = await getObjectBuffer(sourceKey);

  const pages = await renderPdfPages(pdfBuffer, scale);
  if (pages.length === 0) {
    throw new Error("هیچ صفحه‌ای از PDF استخراج نشد");
  }

  await db.$transaction(async (tx) => {
    await tx.page.deleteMany({ where: { courseId } });

    for (const page of pages) {
      const key = pageKey(courseId, page.pageNumber);
      await putObject(key, page.buffer, "image/png");
      await tx.page.create({
        data: {
          courseId,
          pageNumber: page.pageNumber,
          imageUrl: imageUrlFor(courseId, `page-${String(page.pageNumber).padStart(3, "0")}.png`),
          width: page.width,
          height: page.height,
        },
      });
    }

    await tx.course.update({
      where: { id: courseId },
      data: { status: "READY", totalPages: pages.length, error: null },
    });
  });
}
