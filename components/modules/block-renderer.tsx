"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize } from "lucide-react";
import {
  createElementId,
  type AnnotationData,
  type AnnotationElement,
} from "@/lib/annotations";
import { cn } from "@/lib/utils";

interface ImageAnnotationCanvasProps {
  assetId: string;
  imageUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  alt?: string;
  initialAnnotations: AnnotationElement[];
  onChange: (annotations: AnnotationElement[]) => void;
  className?: string;
}

function drawElement(ctx: CanvasRenderingContext2D, element: AnnotationElement, live: boolean) {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if (element.tool === "highlight") {
    ctx.strokeStyle = element.color;
    ctx.globalAlpha = element.opacity;
    ctx.lineWidth = element.size;
    ctx.globalCompositeOperation = "multiply";
  } else {
    ctx.strokeStyle = element.color;
    ctx.globalAlpha = live ? 0.9 : 1;
    ctx.lineWidth = element.size;
    ctx.globalCompositeOperation = "source-over";
  }

  const points = element.points;
  if (points.length === 1) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[0].x + 0.01, points[0].y);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;
      ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.stroke();
  }
  ctx.restore();
}

function ImageAnnotationCanvas({
  assetId,
  imageUrl,
  naturalWidth,
  naturalHeight,
  alt,
  initialAnnotations,
  onChange,
  className,
}: ImageAnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const color = "#3b82f6";
  const highlightSize = 24;

  const [annotations, setAnnotations] = useState<AnnotationElement[]>(initialAnnotations);
  const [baseWidth, setBaseWidth] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const drawingRef = useRef<AnnotationElement | null>(null);

  const displaySize = useMemo(() => {
    if (!baseWidth) return { width: 0, height: 0 };
    return {
      width: baseWidth,
      height: Math.floor(naturalHeight * (baseWidth / naturalWidth)),
    };
  }, [baseWidth, naturalWidth, naturalHeight]);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const w = Math.floor(entry.contentRect.width) - 32;
        if (w > 0) setBaseWidth(w);
      }
    });
    if (scrollRef.current) observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    onChange(annotations);
  }, [annotations, onChange]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, displaySize.width * dpr);
    canvas.height = Math.max(1, displaySize.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, naturalWidth, naturalHeight);

    for (const element of annotations) {
      if (element.id === selectedId) continue;
      drawElement(ctx, element, selectedId === null);
    }

    if (selectedId) {
      const selected = annotations.find((e) => e.id === selectedId);
      if (selected) {
        drawElement(ctx, selected, false);
      }
    }

    const live = drawingRef.current;
    if (live) drawElement(ctx, live, true);
  }, [annotations, selectedId, naturalWidth, naturalHeight, displaySize]);

  useEffect(() => {
    render();
  }, [render]);

  const getPointFromEvent = (e: React.PointerEvent | PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width) / (window.devicePixelRatio || 1);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height) / (window.devicePixelRatio || 1);
    return { x: Math.min(Math.max(x, 0), naturalWidth), y: Math.min(Math.max(y, 0), naturalHeight) };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (loading) return;
    const point = getPointFromEvent(e);

    drawingRef.current = {
      id: createElementId(),
      tool: "highlight",
      color,
      size: highlightSize,
      opacity: 0.4,
      points: [point],
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const point = getPointFromEvent(e);

    if (drawingRef.current) {
      const element = drawingRef.current;
      const last = element.points[element.points.length - 1];
      const dist = Math.hypot(point.x - last.x, point.y - last.y);
      if (dist > 1.2) element.points.push(point);
      render();
    }
  };

  const handlePointerUp = () => {
    if (drawingRef.current) {
      const element = drawingRef.current;
      drawingRef.current = null;
      if (element.points.length > 1) {
        setAnnotations((current) => [...current, element]);
      }
    }
  };

  const handleDeleteSelected = () => {
    if (!selectedId) return;
    setAnnotations((current) => current.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  };

  return (
    <div ref={scrollRef} className={cn("relative h-full w-full overflow-auto", className)}>
      <div className="flex min-h-full w-full min-w-full items-center justify-center p-4">
        <div
          className="relative shrink-0 overflow-hidden rounded-lg bg-white shadow-xl"
          style={{ width: displaySize.width, height: displaySize.height }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          <img
            src={imageUrl}
            alt={alt ?? `تصویر ${assetId}`}
            className="absolute inset-0 h-full w-full select-none object-fill"
            draggable={false}
            onLoad={() => setLoading(false)}
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full select-none cursor-crosshair"
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/40">
              <div className="shimmer h-full w-full" />
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-2">
        <div className="flex items-center gap-1 rounded-xl border border-input bg-background px-2.5 py-1 text-xs">
          <span className="rounded-full border border-current px-1.5 py-0.5" style={{ backgroundColor: color }} />
          <span>رنگ پراکنده</span>
        </div>
        {selectedId && (
          <button
            type="button"
            onClick={handleDeleteSelected}
            className="rounded-full bg-destructive px-3 py-1 text-xs font-medium text-white shadow-lg hover:scale-105"
          >
            حذف عنصر انتخاب‌شده
          </button>
        )}
      </div>
    </div>
  );
}

interface AssetImageBlockProps {
  assetId: string;
  imageUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  alt?: string;
  caption?: string;
  initialAnnotations: AnnotationElement[];
  onAnnotationsChange: (annotations: AnnotationElement[]) => void;
}

export function AssetImageBlock({
  assetId,
  imageUrl,
  naturalWidth,
  naturalHeight,
  alt,
  caption,
  initialAnnotations,
  onAnnotationsChange,
}: AssetImageBlockProps) {
  const [annotations, setAnnotations] = useState<AnnotationElement[]>(initialAnnotations);

  useEffect(() => {
    onAnnotationsChange(annotations);
  }, [annotations, onAnnotationsChange]);

  return (
    <figure className="rounded-2xl border border-border/60 bg-card overflow-hidden mb-6">
      <div className="relative overflow-hidden bg-muted aspect-[4/3]">
        <ImageAnnotationCanvas
          assetId={assetId}
          imageUrl={imageUrl}
          alt={alt}
          naturalWidth={naturalWidth}
          naturalHeight={naturalHeight}
          initialAnnotations={annotations}
          onChange={setAnnotations}
          className="h-full w-full"
        />
        <button
          type="button"
          aria-label="بزرگ‌نمایی تصویر"
          onClick={() => {}}
          className="absolute right-2 top-2 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60"
        >
          <Maximize className="h-4 w-4" />
        </button>
      </div>
      {caption && (
        <figcaption className="px-3 py-2 text-xs text-muted-foreground text-right">{caption}</figcaption>
      )}
    </figure>
  );
}

type BlockType =
  | "heading"
  | "paragraph"
  | "list"
  | "image"
  | "table"
  | "callout"
  | "quote"
  | "code"
  | "divider";

interface BaseBlock {
  id: string;
  type: BlockType;
}

interface HeadingBlock extends BaseBlock {
  type: "heading";
  level: 2 | 3 | 4;
  text: string;
}

interface ParagraphBlock extends BaseBlock {
  type: "paragraph";
  text: string;
}

interface ListBlock extends BaseBlock {
  type: "list";
  ordered: boolean;
  items: string[];
}

interface ImageBlock extends BaseBlock {
  type: "image";
  assetId: string;
  alt?: string;
  caption?: string;
}

interface TableBlock extends BaseBlock {
  type: "table";
  headers: string[];
  rows: string[][];
}

interface CalloutBlock extends BaseBlock {
  type: "callout";
  tone: "info" | "warning" | "success" | "danger";
  title?: string;
  text: string;
}

interface QuoteBlock extends BaseBlock {
  type: "quote";
  text: string;
  cite?: string;
}

interface CodeBlock extends BaseBlock {
  type: "code";
  language?: string;
  text: string;
}

interface DividerBlock extends BaseBlock {
  type: "divider";
}

type ContentBlock = HeadingBlock | ParagraphBlock | ListBlock | ImageBlock | TableBlock | CalloutBlock | QuoteBlock | CodeBlock | DividerBlock;

interface BlockRendererProps {
  blocks: ContentBlock[];
  assets: Record<string, { url: string; width?: number; height?: number }>;
  imageAnnotations: Record<string, AnnotationElement[]>;
  onImageAnnotationsChange: (assetId: string, annotations: AnnotationElement[]) => void;
}

const HEADING_TAG: Record<number, React.ElementType> = { 2: "h2", 3: "h3", 4: "h4" };

const CALLOUT_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  info: { color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/20", label: "اطلاع" },
  warning: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "هشدار" },
  success: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "موفقیت" },
  danger: { color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", label: "خطا" },
};

export function BlockRenderer({
  blocks,
  assets,
  imageAnnotations,
  onImageAnnotationsChange,
}: BlockRendererProps) {
  return (
    <div className="prose-sm max-w-none text-right">
      {blocks.map((block) => {
        switch (block.type) {
          case "heading": {
            const Tag = HEADING_TAG[block.level] ?? "h3";
            return (
              <Tag key={block.id} className="font-bold text-foreground mt-6 first:mt-0 mb-3">
                {block.text}
              </Tag>
            );
          }
          case "paragraph":
            return (
              <p key={block.id} className="leading-7 text-foreground mb-4">
                {block.text}
              </p>
            );
          case "list": {
            const listStyle = block.ordered ? "list-decimal" : "list-disc";
            return (
              <ul key={block.id} className={cn("text-foreground mb-4 pl-4 space-y-1", listStyle)}>
                {block.items.map((item, index) => (
                  <li key={index} className="leading-7">{item}</li>
                ))}
              </ul>
            );
          }
          case "image": {
            const asset = assets[block.assetId];
            return (
              <AssetImageBlock
                key={block.id}
                assetId={block.assetId}
                imageUrl={asset?.url ?? ""}
                naturalWidth={asset?.width ?? 600}
                naturalHeight={asset?.height ?? 450}
                alt={block.alt}
                caption={block.caption}
                initialAnnotations={imageAnnotations[block.assetId] ?? []}
                onAnnotationsChange={(anns: AnnotationData) =>
                  onImageAnnotationsChange(block.assetId, anns)
                }
              />
            );
          }
          case "table":
            return (
              <div key={block.id} className="overflow-x-auto mb-6">
                <table className="w-full text-sm border-collapse border border-border/60">
                  <thead>
                    <tr>
                      {block.headers.map((header, index) => (
                        <th key={index} className="border border-border/60 bg-muted/30 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-border/60">
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="border border-border/60 px-2 py-1.5 text-xs leading-6 text-foreground">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "callout": {
            const config = CALLOUT_CONFIG[block.tone];
            return (
              <div key={block.id} className={cn("rounded-xl border p-3 mb-4 flex gap-3", config.bg, config.border, "text-right")}>
                <div className="shrink-0 mt-0.5 text-lg text-foreground">
                  <span aria-hidden="true">{config.label}</span>
                </div>
                <div className="flex-1 leading-7 text-foreground">
                  {block.title && (
                    <p className="mb-1 text-xs font-semibold">{block.title}</p>
                  )}
                  {block.text}
                </div>
              </div>
            );
          }
          case "quote":
            return (
              <blockquote key={block.id} className="border-l-2 border-teal-500 pl-4 py-2 mb-4 italic text-muted-foreground text-right">
                {block.text}
                {block.cite && <div className="mt-1 text-xs text-muted-foreground">— {block.cite}</div>}
              </blockquote>
            );
          case "code":
            return (
              <pre key={block.id} className="rounded-xl border border-border/60 bg-muted p-3 mb-4 text-xs overflow-x-auto font-mono text-foreground">
                {block.text}
              </pre>
            );
          case "divider":
            return <hr key={block.id} className="my-6 border-border/60" />;
          default:
            return null;
        }
      })}
    </div>
  );
}
