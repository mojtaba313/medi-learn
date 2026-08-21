import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

export async function GET() {
  try {
    const client = new S3Client({
      endpoint: process.env.ARVAN_ENDPOINT,
      region: "ir-thr-at1",
      credentials: {
        accessKeyId: process.env.ARVAN_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.ARVAN_SECRET_ACCESS_KEY || "",
      },
      forcePathStyle: true,
    });

    const command = new ListBucketsCommand({});
    const response = await client.send(command);

    return Response.json({
      success: true,
      message: "اتصال به ArvanCloud S3 موفق بود!",
      buckets: response.Buckets?.map((b) => b.Name),
    });
  } catch (error) {
    const e = error as { message?: string; code?: string };
    console.error("خطا:", error);

    return Response.json(
      {
        success: false,
        message: "خطا در اتصال به ArvanCloud S3",
        error: e.message,
        code: e.code,
      },
      { status: 500 },
    );
  }
}
