import { pdfToPng } from "pdf-to-png-converter";

export interface RenderedPage {
  buffer: Buffer;
  pageNumber: number;
  width: number;
  height: number;
}

/**
 * Renders every page of a PDF buffer into PNG images (in memory).
 * `pageNumber` is 1-based and matches the human-facing page numbers.
 */
export async function renderPdfPages(
  pdfBuffer: Buffer,
  scale = 2
): Promise<RenderedPage[]> {
  const pages = await pdfToPng(pdfBuffer, {
    viewportScale: scale,
    verbosityLevel: 0,
    maxInputBytes: 256 * 1024 * 1024,
    returnPageContent: true,
  });

  return pages
    .filter((p) => p.kind === "content" && p.content && p.content.length > 0)
    .map((p) => ({
      buffer: p.content as Buffer,
      pageNumber: p.pageNumber,
      width: p.width,
      height: p.height,
    }));
}

export async function renderPdfMetadata(pdfBuffer: Buffer) {
  const pages = await pdfToPng(pdfBuffer, {
    viewportScale: 1,
    verbosityLevel: 0,
    maxInputBytes: 256 * 1024 * 1024,
    returnMetadataOnly: true,
  });
  return pages.length;
}