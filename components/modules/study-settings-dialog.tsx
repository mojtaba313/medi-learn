"use client";

import { Moon, Sun } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StudyPrefs } from "@/lib/study-prefs";
import { cn, toFa } from "@/lib/utils";

const FONT_SIZES = [
  { value: "sm", label: "کوچک" },
  { value: "md", label: "متوسط" },
  { value: "lg", label: "بزرگ" },
] as const;

const LINE_HEIGHTS = [
  { value: "normal", label: "معمولی" },
  { value: "relaxed", label: "بازتر" },
] as const;

const WIDTHS = [
  { value: "narrow", label: "باریک" },
  { value: "normal", label: "معمولی" },
  { value: "wide", label: "پهن" },
] as const;

export function StudySettingsDialog({
  open,
  onOpenChange,
  prefs,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefs: StudyPrefs;
  onChange: (patch: Partial<StudyPrefs>) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>تنظیمات مطالعه</DialogTitle>
          <DialogDescription>
            ظاهر خواندن، هدف روزانه و زمان‌بندی پومودورو را شخصی‌سازی کنید.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <div className="mb-2 text-sm font-medium">پوسته</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "light", label: "روشن", icon: Sun },
                { value: "dark", label: "تیره", icon: Moon },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onChange({ theme: item.value as StudyPrefs["theme"] })}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium",
                    prefs.theme === item.value
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border hover:bg-muted",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <Segment
            label="اندازه متن"
            value={prefs.fontSize}
            options={FONT_SIZES}
            onChange={(value) => onChange({ fontSize: value as StudyPrefs["fontSize"] })}
          />
          <Segment
            label="فاصله خطوط"
            value={prefs.lineHeight}
            options={LINE_HEIGHTS}
            onChange={(value) =>
              onChange({ lineHeight: value as StudyPrefs["lineHeight"] })
            }
          />
          <Segment
            label="عرض متن"
            value={prefs.readingWidth}
            options={WIDTHS}
            onChange={(value) =>
              onChange({ readingWidth: value as StudyPrefs["readingWidth"] })
            }
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <NumberField
              label="هدف روزانه (دقیقه)"
              value={prefs.dailyGoalMinutes}
              min={5}
              max={600}
              onChange={(value) => onChange({ dailyGoalMinutes: value })}
            />
            <NumberField
              label="پومودورو تمرکز"
              value={prefs.pomodoroFocus}
              min={5}
              max={120}
              onChange={(value) => onChange({ pomodoroFocus: value })}
            />
            <NumberField
              label="پومودورو استراحت"
              value={prefs.pomodoroBreak}
              min={1}
              max={60}
              onChange={(value) => onChange({ pomodoroBreak: value })}
            />
          </div>

          <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs leading-6 text-muted-foreground">
            تنظیمات به‌صورت خودکار در این مرورگر و حساب شما ذخیره می‌شود. میانگین
            هدف روزانه: {toFa(prefs.dailyGoalMinutes)} دقیقه.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Segment({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium">{label}</div>
      <div className="flex rounded-xl border border-border bg-muted/40 p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 rounded-lg px-3 py-1.5 text-sm transition-colors",
              value === option.value
                ? "bg-background font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) {
            onChange(Math.min(max, Math.max(min, Math.round(next))));
          }
        }}
        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
      />
    </label>
  );
}
