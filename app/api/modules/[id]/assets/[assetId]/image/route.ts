import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { streamObject } from "@/lib/s3";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> },
) {
  const session = await getSession();
  if (!session) return new NextResponse("دسترسی غیرمجاز", { status: 401 });

  const { id, assetId } = await params;

  const asset = await db.noteAsset.findUnique({
    where: { noteId_assetId: { noteId: id, assetId } },
    select: { storageKey: true },
  });
  if (!asset) return new NextResponse("یافت نشد", { status: 404 });

  try {
    const res = await streamObject(asset.storageKey);
    const headers = new Headers();
    headers.set("Content-Type", res.contentType);
    if (res.size) headers.set("Content-Length", String(res.size));
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    return new NextResponse(res.stream, { status: 200, headers });
  } catch {
    return new NextResponse("یافت نشد", { status: 404 });
  }
}
