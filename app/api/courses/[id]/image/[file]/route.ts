import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { streamObject } from "@/lib/s3";

export const dynamic = "force-dynamic";

const SAFE = /^[\w.-]+$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; file: string }> },
) {
  const session = await getSession();
  if (!session) return new NextResponse("دسترسی غیرمجاز", { status: 401 });

  const { id, file } = await params;
  if (!SAFE.test(file)) return new NextResponse("درخواست نامعتبر", { status: 400 });

  try {
    const res = await streamObject(`courses/${id}/${file}`);
    const headers = new Headers();
    headers.set("Content-Type", res.contentType);
    if (res.size) headers.set("Content-Length", String(res.size));
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    return new NextResponse(res.stream, { status: 200, headers });
  } catch {
    return new NextResponse("یافت نشد", { status: 404 });
  }
}
