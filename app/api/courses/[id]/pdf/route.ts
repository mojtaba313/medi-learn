import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { courseSourceKey, streamObject } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return new NextResponse("دسترسی غیرمجاز", { status: 401 });

  const { id } = await params;

  try {
    const res = await streamObject(courseSourceKey(id));
    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    if (res.size) headers.set("Content-Length", String(res.size));
    headers.set(
      "Content-Disposition",
      `inline; filename="course-${id}.pdf"`,
    );
    return new NextResponse(res.stream, { status: 200, headers });
  } catch {
    return new NextResponse("یافت نشد", { status: 404 });
  }
}
