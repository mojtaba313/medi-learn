import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { s3, BUCKET, courseSourceKey } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return new NextResponse("دسترسی غیرمجاز", { status: 401 });

  const { id } = await params;
  const key = courseSourceKey(id);
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    );
    if (!res.Body) return new NextResponse("یافت نشد", { status: 404 });
    const headers = new Headers();
    headers.set("Content-Type", res.ContentType ?? "application/pdf");
    headers.set(
      "Content-Disposition",
      `inline; filename="course-${id}.pdf"`,
    );
    return new NextResponse(res.Body.transformToWebStream(), {
      status: 200,
      headers,
    });
  } catch {
    return new NextResponse("یافت نشد", { status: 404 });
  }
}
