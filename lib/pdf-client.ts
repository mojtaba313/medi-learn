// Browser-only PDF rasterization. Renders each page to a JPEG blob so the
// course-creation flow can upload ready-made images and surface processing
// errors on the client (no server-side PDF rendering / worker bundling).
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

export interface RenderedPageImage {
  blob: Blob;
  width: number;
  height: number;
}

export interface RenderProgress {
  page: number;
  total: number;
}

export async function renderPdfToImages(
  file: File,
  opts: {
    scale?: number;
    quality?: number;
    onProgress?: (p: RenderProgress) => void;
  } = {},
): Promise<RenderedPageImage[]> {
  const scale = opts.scale ?? 2;
  const quality = opts.quality ?? 0.9;

  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  const results: RenderedPageImage[] = [];
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("امکان ایجاد بوم نقاشی در مرورگر وجود ندارد");

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      // JPEG has no alpha channel — paint a white background first.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvas, canvasContext: ctx, viewport }).promise;

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (!blob) throw new Error(`خطا در تبدیل صفحه ${i} به تصویر`);

      results.push({
        blob,
        width: canvas.width,
        height: canvas.height,
      });

      opts.onProgress?.({ page: i, total: pdf.numPages });
      page.cleanup();
    }
  } finally {
    const doc = pdf as unknown as { destroy?: () => Promise<void> | void };
    await doc.destroy?.();
  }

  return results;
}
