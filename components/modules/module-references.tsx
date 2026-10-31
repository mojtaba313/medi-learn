"use client";

import { useEffect, useRef } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { withRootPath } from "@/lib/module-utils";

export function ModuleReferences({
  title,
  intro,
  html,
}: {
  title: string | null;
  intro: string | null;
  html: string | null;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.querySelectorAll("a").forEach((anchor) => {
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noreferrer");
    });
  }, [html]);

  if (!html) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
        منبعی برای این جزوه ثبت نشده است.
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl">
      <header className="mb-5">
        <div className="mb-1 flex items-center gap-2 text-xs font-medium text-teal-600 dark:text-teal-400">
          <FileText className="h-3.5 w-3.5" />
          منابع و راهنمای استفاده
        </div>
        <h1 className="text-2xl font-black sm:text-3xl">{title ?? "منابع"}</h1>
        {intro && (
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{intro}</p>
        )}
      </header>

      <div className="rounded-2xl border border-border/60 bg-card/70 p-5">
        <div
          ref={bodyRef}
          className="lesson-body text-[16px] leading-8"
          dangerouslySetInnerHTML={{ __html: withRootPath(html) }}
        />
        <p className="mt-4 flex items-center gap-1.5 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <ExternalLink className="h-3.5 w-3.5" />
          لینک‌ها در تب جدید باز می‌شوند.
        </p>
      </div>
    </section>
  );
}
