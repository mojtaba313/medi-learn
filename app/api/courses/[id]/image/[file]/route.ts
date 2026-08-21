import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { s3, BUCKET } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";

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

  const key = `courses/${id}/${file}`;
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    );
    if (!res.Body) return new NextResponse("یافت نشد", { status: 404 });
    const headers = new Headers();
    if (res.ContentType) headers.set("Content-Type", res.ContentType);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    return new NextResponse(res.Body.transformToWebStream(), {
      status: 200,
      headers,
    });
  } catch {
    return new NextResponse("یافت نشد", { status: 404 });
  }
}
