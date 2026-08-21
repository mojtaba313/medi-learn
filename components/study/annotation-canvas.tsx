"use client";

import * as React from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { useStudyStore } from "@/lib/store";
import { safeFetch } from "@/lib/client/safe-fetch";
import {
  createElementId,
  type AnnotationData,
  type AnnotationElement,
  type AnnotationPoint,
} from "@/lib/annotations";
import { cn, clamp } from "@/lib/utils";

interface AnnotationCanvasProps {
  courseId: string;
  pageNumber: number;
  imageUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  className?: string;
}

export function AnnotationCanvas({
  courseId,
  pageNumber,
  imageUrl,
  naturalWidth,
  naturalHeight,
  className,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const tool = useStudyStore((s) => s.tool);
  const color = useStudyStore((s) => s.color);
  const penColor = useStudyStore((s) => s.penColor);
  const penSize = useStudyStore((s) => s.penSize);
  const highlightSize = useStudyStore((s) => s.highlightSize);
  const showAnnotations = useStudyStore((s) => s.showAnnotations);
  const zoom = useStudyStore((s) => s.zoom);

  const annotations = useStudyStore((s) => s.annotationsByPage[pageNumber]) ?? [];
  const setPageAnnotations = useStudyStore((s) => s.setPageAnnotations);
  const pushSnapshot = useStudyStore((s) => s.pushSnapshot);
  const setPageDirty = useStudyStore((s) => s.setPageDirty);
  const markPageSaved = useStudyStore((s) => s.markPageSaved);

  const [baseWidth, setBaseWidth] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const drawingRef = useRef<AnnotationElement | null>(null);
  const eraserPathRef = useRef<AnnotationPoint[]>([]);
  const dragRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const moveRef = useRef<{ elementId: string; offset: AnnotationPoint; original: AnnotationElement } | null>(null);
  const loadedPageRef = useRef<number | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scaleFactor = React.useMemo(() => {
    if (!baseWidth || naturalWidth <= 0) return 1;
    // Must include zoom: the canvas bitmap and CSS size both scale with zoom,
    // so annotations stored in natural PDF space must be drawn/hit-tested at the
    // on-screen scale (baseWidth * zoom) or they drift when zoom changes.
    return (baseWidth * zoom) / naturalWidth;
  }, [baseWidth, naturalWidth, zoom]);

  const displaySize = React.useMemo(() => {
    if (!baseWidth) return { width: 0, height: 0 };
    return {
      width: Math.floor(baseWidth * zoom),
      height: Math.floor(naturalHeight * (baseWidth / naturalWidth) * zoom),
    };
  }, [baseWidth, zoom, naturalWidth, naturalHeight]);

  const isDrawingTool = tool === "pen" || tool === "highlight";

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        // The scroll container has a stable width (set by the flex layout),
        // unlike the page wrapper whose size depends on this measurement.
        // Subtract the inner padding (p-4 = 32px) so the page fits exactly.
        const w = Math.floor(entry.contentRect.width) - 32;
        if (w > 0) setBaseWidth(w);
      }
    });
    if (scrollRef.current) observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = displaySize.width * dpr;
    canvas.height = displaySize.height * dpr;
    ctx.setTransform(dpr * scaleFactor, 0, 0, dpr * scaleFactor, 0, 0);

    ctx.clearRect(0, 0, naturalWidth, naturalHeight);

    if (!showAnnotations) return;

    const data = useStudyStore.getState().annotationsByPage[pageNumber] ?? [];

    for (const element of data) {
      if (element.id === selectedId) continue;
      drawElement(ctx, element, selectedId === null);
    }

    if (selectedId) {
      const selected = data.find((e) => e.id === selectedId);
      if (selected) {
        drawElement(ctx, selected, false);
        drawSelectionBox(ctx, selected);
      }
    }

    const live = drawingRef.current;
    if (live) {
      drawElement(ctx, live, true);
    }
  }, [displaySize, scaleFactor, showAnnotations, pageNumber, selectedId, naturalWidth, naturalHeight]);

  useEffect(() => {
    render();
  }, [render, annotations, tool, penColor, penSize, highlightSize, zoom, showAnnotations, selectedId, displaySize]);

  useEffect(() => {
    if (loadedPageRef.current === pageNumber || !naturalWidth) return;
    loadedPageRef.current = pageNumber;

    async function load() {
      try {
        const res = await safeFetch(
          `/api/courses/${courseId}/annotations?pageNumber=${pageNumber}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const data = await res.json();
          setPageAnnotations(pageNumber, data.data ?? []);
        }
      } catch {
        /* connection errors are surfaced via toast by safeFetch */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId, pageNumber, naturalWidth, setPageAnnotations]);

  const persist = useCallback(() => {
    const data = useStudyStore.getState().annotationsByPage[pageNumber] ?? [];
    safeFetch(`/api/courses/${courseId}/annotations`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageNumber, data }),
    }).then((res) => {
      if (res.ok) markPageSaved(pageNumber);
    }).catch(() => {});
  }, [courseId, pageNumber, markPageSaved]);

  const schedulePersist = useCallback(() => {
    setPageDirty(pageNumber);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(persist, 1200);
  }, [pageNumber, persist, setPageDirty]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  function getPointFromEvent(e: React.PointerEvent | PointerEvent): AnnotationPoint {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width) / (window.devicePixelRatio || 1) / scaleFactor;
    const y = (e.clientY - rect.top) * (canvas.height / rect.height) / (window.devicePixelRatio || 1) / scaleFactor;
    return { x: clamp(x, 0, naturalWidth), y: clamp(y, 0, naturalHeight) };
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (loading) return;
    const point = getPointFromEvent(e);

    if (tool === "pan") {
      const scroller = scrollRef.current!;
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        scrollLeft: scroller.scrollLeft,
        scrollTop: scroller.scrollTop,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    if (tool === "select") {
      const data = useStudyStore.getState().annotationsByPage[pageNumber] ?? [];
      const hit = findStrokeAt(data, point, scaleFactor, tool, isDrawingTool ? penSize : highlightSize);
      if (hit) {
        setSelectedId(hit.id);
        moveRef.current = {
          elementId: hit.id,
          offset: {
            x: point.x - hit.points[0].x,
            y: point.y - hit.points[0].y,
          },
          original: hit,
        };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } else {
        setSelectedId(null);
      }
      return;
    }

    if (tool === "eraser") {
      eraserPathRef.current = [point];
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    if (isDrawingTool) {
      const element: AnnotationElement = {
        id: createElementId(),
        tool: tool as "pen" | "highlight",
        color: tool === "highlight" ? color : penColor,
        size: tool === "highlight" ? highlightSize : penSize,
        opacity: tool === "highlight" ? 0.4 : 1,
        points: [point],
      };
      drawingRef.current = element;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (tool === "pan" && dragRef.current) {
      const scroller = scrollRef.current!;
      scroller.scrollLeft = dragRef.current.scrollLeft - (e.clientX - dragRef.current.startX);
      scroller.scrollTop = dragRef.current.scrollTop - (e.clientY - dragRef.current.startY);
      return;
    }

    const point = getPointFromEvent(e);

    if (tool === "select" && moveRef.current) {
      const element = moveRef.current;
      const data = useStudyStore.getState().annotationsByPage[pageNumber] ?? [];
      const moved = data.map((el) => {
        if (el.id !== element.elementId) return el;
        const dx = point.x - element.offset.x - el.points[0].x;
        const dy = point.y - element.offset.y - el.points[0].y;
        return {
          ...el,
          points: el.points.map((p) => ({
            x: clamp(p.x + dx, 0, naturalWidth),
            y: clamp(p.y + dy, 0, naturalHeight),
          })),
        };
      });
      useStudyStore.setState({
        annotationsByPage: { ...useStudyStore.getState().annotationsByPage, [pageNumber]: moved },
      });
      return;
    }

    if (tool === "eraser") {
      eraserPathRef.current.push(point);
      eraseStrokesNear(eraserPathRef.current);
      return;
    }

    if (isDrawingTool && drawingRef.current) {
      const element = drawingRef.current;
      const last = element.points[element.points.length - 1];
      const dist = Math.hypot(point.x - last.x, point.y - last.y);
      if (dist > 1.2) {
        element.points.push(point);
        render();
      }
    }
  }

  function handlePointerUp() {
    if (isDrawingTool && drawingRef.current) {
      const element = drawingRef.current;
      drawingRef.current = null;
      if (element.points.length > 1) {
        const current = useStudyStore.getState().annotationsByPage[pageNumber] ?? [];
        pushSnapshot(pageNumber, [...current, element]);
        schedulePersist();
      }
    }
    if (tool === "eraser" && eraserPathRef.current.length > 0) {
      eraserPathRef.current = [];
    }
    if (tool === "select" && moveRef.current) {
      moveRef.current = null;
      schedulePersist();
    }
    dragRef.current = null;
  }

  function eraseStrokesNear(path: AnnotationPoint[]) {
    const data = useStudyStore.getState().annotationsByPage[pageNumber] ?? [];
    if (data.length === 0) return;
    const threshold = (highlightSize * scaleFactor) / scaleFactor * 1.2;
    const keep = data.filter((el) => {
      for (const p of path) {
        for (const elP of el.points) {
          if (Math.hypot(p.x - elP.x, p.y - elP.y) < threshold) return false;
        }
      }
      return true;
    });
    if (keep.length !== data.length) {
      pushSnapshot(pageNumber, keep);
      schedulePersist();
    }
  }

  function handleClearAll() {
    const data = useStudyStore.getState().annotationsByPage[pageNumber] ?? [];
    if (data.length === 0) return;
    pushSnapshot(pageNumber, []);
    schedulePersist();
    setSelectedId(null);
    toast.success("همه حاشیه‌نویسی‌های این صفحه پاک شد");
  }

  function handleDeleteSelected() {
    if (!selectedId) return;
    const data = useStudyStore.getState().annotationsByPage[pageNumber] ?? [];
    pushSnapshot(
      pageNumber,
      data.filter((el) => el.id !== selectedId)
    );
    setSelectedId(null);
    schedulePersist();
  }

  return (
    <div
      ref={scrollRef}
      className={cn("relative h-full w-full overflow-auto", className)}
    >
      <div className="flex min-h-full w-fit min-w-full items-center justify-center p-4">
        <div
          ref={wrapperRef}
          className="relative shrink-0 overflow-hidden rounded-lg bg-white shadow-xl"
          style={{ width: displaySize.width, height: displaySize.height }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`صفحه ${pageNumber}`}
            className="absolute inset-0 h-full w-full select-none object-fill"
            draggable={false}
            onLoad={() => {
              setLoading(false);
            }}
          />
          <canvas
            ref={canvasRef}
            className={cn(
              "absolute inset-0 h-full w-full",
              isDrawingTool && "cursor-crosshair",
              tool === "eraser" && "cursor-cell",
              tool === "pan" && "cursor-grab active:cursor-grabbing",
              tool === "select" && "cursor-default"
            )}
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/40">
              <div className="shimmer h-full w-full" />
            </div>
          )}
        </div>
      </div>

      {tool === "select" && selectedId && (
        <button
          onClick={handleDeleteSelected}
          className="absolute bottom-4 right-1/2 translate-x-1/2 rounded-full bg-destructive px-4 py-2 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105"
        >
          حذف عنصر انتخاب‌شده
        </button>
      )}
      {tool === "eraser" && (
        <button
          onClick={handleClearAll}
          className="absolute bottom-4 right-1/2 translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg transition-transform hover:scale-105"
        >
          پاک کردن همه
        </button>
      )}
    </div>
  );
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

function drawSelectionBox(ctx: CanvasRenderingContext2D, element: AnnotationElement) {
  const xs = element.points.map((p) => p.x);
  const ys = element.points.map((p) => p.y);
  const minX = Math.min(...xs) - 6;
  const minY = Math.min(...ys) - 6;
  const maxX = Math.max(...xs) + 6;
  const maxY = Math.max(...ys) + 6;

  ctx.save();
  ctx.strokeStyle = "rgba(13, 148, 136, 0.8)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
  ctx.restore();
}

function findStrokeAt(
  data: AnnotationData,
  point: AnnotationPoint,
  scaleFactor: number,
  tool: string,
  size: number
): AnnotationElement | null {
  const threshold = (size / 2 + 8) / scaleFactor;
  let best: AnnotationElement | null = null;
  let bestDist = Infinity;

  for (const el of data) {
    for (const p of el.points) {
      const dist = Math.hypot(p.x - point.x, p.y - point.y);
      if (dist < threshold && dist < bestDist) {
        bestDist = dist;
        best = el;
      }
    }
  }
  return best;
}