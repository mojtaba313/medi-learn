"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  TEXT_ANNOTATION_COLORS,
  type TextAnnotation,
  type TextAnnotationColor,
} from "@/lib/text-annotations";
import { cn } from "@/lib/utils";

const COLOR_LABELS: Record<TextAnnotationColor, string> = {
  yellow: "زرد",
  green: "سبز",
  blue: "آبی",
  pink: "صورتی",
};

const COLOR_CLASSES: Record<TextAnnotationColor, string> = {
  yellow: "bg-yellow-300",
  green: "bg-emerald-300",
  blue: "bg-sky-300",
  pink: "bg-pink-300",
};

export function AnnotationPopover({
  annotation,
  position,
  onSave,
  onDelete,
  onClose,
}: {
  annotation: TextAnnotation;
  position: { top: number; left: number };
  onSave: (note: string, color: TextAnnotationColor) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState(annotation.note);
  const [color, setColor] = useState<TextAnnotationColor>(annotation.color);

  return (
    <div
      className="annotation-popover fixed z-50 w-80 rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl"
      style={{ top: position.top, left: position.left }}
      role="dialog"
      aria-label="ویرایش هایلایت"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between">
        <b className="text-sm">هایلایت</b>
        <button
          type="button"
          className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
          onClick={onClose}
          aria-label="بستن"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <blockquote className="mb-3 line-clamp-3 rounded-xl border-r-2 border-primary/40 bg-muted/50 px-3 py-2 text-xs leading-6 text-muted-foreground">
        {annotation.quote}
      </blockquote>

      <div className="mb-3 flex items-center gap-2">
        {TEXT_ANNOTATION_COLORS.map((item) => (
          <button
            key={item}
            type="button"
            className={cn(
              "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
              COLOR_CLASSES[item],
              color === item ? "border-foreground" : "border-transparent",
            )}
            onClick={() => setColor(item)}
            aria-label={COLOR_LABELS[item]}
            title={COLOR_LABELS[item]}
          />
        ))}
      </div>

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={3}
        placeholder="یادداشت روی این هایلایت…"
        className="mb-3 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm leading-6 outline-none focus:border-primary"
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          onClick={() => onSave(note, color)}
        >
          ذخیره
        </button>
        <button
          type="button"
          className="rounded-xl border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
          onClick={onDelete}
        >
          حذف
        </button>
      </div>
    </div>
  );
}
