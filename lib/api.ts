import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function err(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export function dbUnavailable(details?: unknown) {
  return NextResponse.json(
    {
      error: "ارتباط با پایگاه داده برقرار نیست",
      code: "DB_UNAVAILABLE",
      details,
    },
    { status: 503 },
  );
}

const DB_ERROR_CODES = new Set([
  "P1001",
  "P1002",
  "P1008",
  "P1009",
  "P1011",
  "P1017",
  "P2024",
  "P2034",
  "P3006",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
]);

/**
 * Detects Prisma / database-connection failures so routes can respond with a
 * recognizable 503 (DB_UNAVAILABLE) instead of a generic 500.
 */
export function isDbConnectionError(e: unknown): boolean {
  if (!e) return false;
  const errVal = e as {
    code?: string;
    message?: string;
    cause?: { message?: string };
  };
  if (errVal.code && DB_ERROR_CODES.has(errVal.code)) return true;
  const text = `${errVal.message ?? ""} ${errVal.cause?.message ?? ""}`.toLowerCase();
  return /can't reach database|could not connect|connection (to database )?(failed|terminated|closed|refused)|timed out|econnrefused|etimedout|pool.*(timeout|exhausted)|ECONNRESET/.test(
    text,
  );
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}