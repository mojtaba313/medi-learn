"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    toast.error("ارتباط با پایگاه داده برقرار نیست. در حال تلاش مجدد...", {
      id: "db-error",
      duration: 4000,
    });
    // Auto-retry the connection a few times before giving up.
    let attempts = 0;
    const t = setInterval(() => {
      attempts += 1;
      if (attempts >= 4) {
        clearInterval(t);
        return;
      }
      reset();
    }, 4000);
    return () => clearInterval(t);
  }, [error, reset]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
        <h2 className="mb-2 text-lg font-bold">خطا در برقراری ارتباط</h2>
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          ارتباط با پایگاه داده ممکن است قطع باشد. لطفاً اتصال اینترنت خود را
          بررسی کنید؛ سیستم به‌طور خودکار دوباره تلاش می‌کند.
        </p>
        <Button onClick={reset} className="rounded-xl">
          تلاش مجدد
        </Button>
      </div>
    </div>
  );
}
