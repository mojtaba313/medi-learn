"use client";

import { toast } from "sonner";

export class DbUnavailableError extends Error {
  code = "DB_UNAVAILABLE" as const;
  constructor(message = "DB_UNAVAILABLE") {
    super(message);
    this.name = "DbUnavailableError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface SafeFetchOpts {
  retries?: number;
  retryDelay?: number;
  /** Show toasts automatically on connection failures. Default true. */
  toastErrors?: boolean;
}

/**
 * fetch wrapper that treats 503 DB_UNAVAILABLE (or any 5xx / network failure)
 * as a transient connection problem: it retries a few times and surfaces a
 * toast instead of letting the caller crash the page.
 */
export async function safeFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  opts: SafeFetchOpts = {},
): Promise<Response> {
  const retries = opts.retries ?? 2;
  const retryDelay = opts.retryDelay ?? 2000;
  const toastErrors = opts.toastErrors ?? true;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(input, init);
      if (res.status === 503) {
        const body = await res.clone().json().catch(() => null);
        if (body?.code === "DB_UNAVAILABLE") {
          if (attempt < retries) {
            if (toastErrors)
              toast.loading("ارتباط با پایگاه داده برقرار نیست. در حال تلاش مجدد…", {
                id: "db-retry",
              });
            await sleep(retryDelay);
            continue;
          }
          if (toastErrors)
            toast.error("ارتباط با پایگاه داده همچنان برقرار نیست.", {
              id: "db-retry",
            });
          throw new DbUnavailableError();
        }
        return res;
      }
      if (res.status >= 500 && attempt < retries) {
        if (toastErrors)
          toast.loading("خطای سرور. در حال تلاش مجدد…", { id: "db-retry" });
        await sleep(retryDelay);
        continue;
      }
      return res;
    } catch (e) {
      lastError = e;
      if (attempt < retries) {
        if (toastErrors)
          toast.loading("ارتباط برقرار نیست. در حال تلاش مجدد…", {
            id: "db-retry",
          });
        await sleep(retryDelay);
        continue;
      }
      if (toastErrors)
        toast.error("ارتباط با سرور برقرار نیست.", { id: "db-retry" });
      throw e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("request failed");
}
