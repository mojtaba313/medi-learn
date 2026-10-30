"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Coffee, Pause, Play, RotateCcw, Timer, X } from "lucide-react";
import { toast } from "sonner";
import { useStudyPrefs } from "@/lib/use-study-prefs";
import { cn, toFa } from "@/lib/utils";

const formatClock = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return toFa(`${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`);
};

export function FocusTimer() {
  const pathname = usePathname();
  const prefs = useStudyPrefs();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [secondsLeft, setSecondsLeft] = useState(prefs.pomodoroFocus * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);

  const moduleMatch = pathname.match(/^\/modules\/([^/?]+)/);
  const moduleId = moduleMatch?.[1] ? decodeURIComponent(moduleMatch[1]) : undefined;

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (!running || secondsLeft !== 0) return;

    const timeout = window.setTimeout(() => {
      setRunning(false);
      if (mode === "focus") {
        const minutes = prefs.pomodoroFocus;
        void fetch("/api/study-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ minutes, moduleId, kind: "focus" }),
        }).catch(() => undefined);
        setSessions((current) => current + 1);
        setMode("break");
        setSecondsLeft(prefs.pomodoroBreak * 60);
        toast.success(`جلسه ${toFa(minutes)} دقیقه‌ای ثبت شد. وقت استراحت!`);
      } else {
        setMode("focus");
        setSecondsLeft(prefs.pomodoroFocus * 60);
        toast.success("استراحت تمام شد. آماده تمرکز بعدی؟");
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [secondsLeft, running, mode, prefs.pomodoroFocus, prefs.pomodoroBreak, moduleId]);

  const reset = () => {
    setRunning(false);
    setMode("focus");
    setSecondsLeft(prefs.pomodoroFocus * 60);
  };

  const total = (mode === "focus" ? prefs.pomodoroFocus : prefs.pomodoroBreak) * 60;
  const percent = total > 0 ? Math.round(((total - secondsLeft) / total) * 100) : 0;

  return (
    <div className="fixed bottom-4 left-4 z-40">
      {open && (
        <div className="mb-2 w-72 rounded-2xl border border-border bg-card p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              {mode === "focus" ? (
                <Timer className="h-4 w-4 text-teal-500" />
              ) : (
                <Coffee className="h-4 w-4 text-amber-500" />
              )}
              {mode === "focus" ? "تمرکز" : "استراحت"}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              aria-label="بستن تایمر"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 text-center text-4xl font-black tabular-nums">
            {formatClock(secondsLeft)}
          </div>
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                mode === "focus" ? "bg-teal-500" : "bg-amber-500",
              )}
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setRunning((current) => !current)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              {running ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {running ? "توقف" : "شروع"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-muted"
              aria-label="بازنشانی"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-3 text-center text-[10px] leading-5 text-muted-foreground">
            هر جلسه تمرکز به‌صورت خودکار در آمار مطالعه ثبت می‌شود.
            {sessions > 0 && ` (${toFa(sessions)} جلسه امروز)`}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-12 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium shadow-xl transition-colors hover:border-teal-500/40",
          running && "border-teal-500/40",
        )}
        title="تایمر پومودورو"
      >
        <Timer className={cn("h-4 w-4", running ? "text-teal-500" : "text-muted-foreground")} />
        <span className="tabular-nums">{formatClock(secondsLeft)}</span>
      </button>
    </div>
  );
}
