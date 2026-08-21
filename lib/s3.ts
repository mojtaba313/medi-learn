import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

const BUCKET = process.env.ARVAN_BUCKET_NAME ?? "";
export { BUCKET };

export const s3 = new S3Client({
  region: process.env.ARVAN_REGION,
  endpoint: process.env.ARVAN_PUBLIC_BASE_URL,
  credentials: {
    accessKeyId: process.env.ARVAN_ACCESS_KEY_ID!,
    secretAccessKey: process.env.ARVAN_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

export function courseKey(courseId: string, fileName: string) {
  return `courses/${courseId}/${fileName}`;
}

export function courseSourceKey(courseId: string) {
  return `courses/${courseId}/source.pdf`;
}

export function pageKey(courseId: string, pageNumber: number) {
  return `courses/${courseId}/page-${pad3(pageNumber)}.png`;
}

/** Internal, auth-gated URL served by our proxy routes (no public bucket needed). */
export function imageUrlFor(courseId: string, fileName: string) {
  return `/api/courses/${courseId}/image/${encodeURIComponent(fileName)}`;
}

export function pdfUrlFor(courseId: string) {
  return `/api/courses/${courseId}/pdf`;
}

export async function putObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const res = await s3.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
  );
  if (!res.Body) throw new Error("بدنه فایل خالی است");
  return Buffer.from(await res.Body.transformToByteArray());
}

export async function streamObject(key: string) {
  const res = await s3.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
  );
  if (!res.Body) throw new Error("فایل پیدا نشد");
  return {
    stream: res.Body.transformToWebStream(),
    contentType: res.ContentType ?? "application/octet-stream",
    size: res.ContentLength ?? undefined,
  };
}

/**
 * ArvanCloud Object Storage returns 501 for multi-object DeleteObjects, so we
 * delete each object individually after listing by prefix.
 */
export async function deleteCourseObjects(courseId: string) {
  const prefix = `courses/${courseId}/`;
  let continuationToken: string | undefined;
  do {
    const listed = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    const keys = (listed.Contents ?? [])
      .map((o) => o.Key)
      .filter((k): k is string => Boolean(k));
    for (const k of keys) {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: k }));
    }
    continuationToken = listed.NextContinuationToken;
  } while (continuationToken);
}
