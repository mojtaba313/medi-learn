"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    toast.error("خطای سیستمی رخ داد. در حال تلاش مجدد...", {
      id: "global-error",
      duration: 4000,
    });
  }, [error, reset]);

  return (
    <html lang="fa" dir="rtl">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-xl">
          <h2 className="mb-2 text-lg font-bold">خطای غیرمنتظره</h2>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            مشکلی پیش آمده است. سیستم دوباره تلاش می‌کند.
          </p>
          <Button onClick={reset} className="rounded-xl">
            تلاش مجدد
          </Button>
        </div>
      </body>
    </html>
  );
}
