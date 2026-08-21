"use client";

import { create } from "zustand";
import type { AnnotationData, AnnotationElement, AnnotationToolType } from "@/lib/annotations";

interface StudyState {
  tool: AnnotationToolType;
  color: string;
  penColor: string;
  penSize: number;
  highlightSize: number;
  showAnnotations: boolean;
  currentPage: number;
  zoom: number;
  annotationsByPage: Record<number, AnnotationData>;
  history: AnnotationElement[][];
  historyIndex: number;
  savedPages: Set<number>;

  setTool: (tool: AnnotationToolType) => void;
  setColor: (color: string) => void;
  setPenColor: (color: string) => void;
  setPenSize: (size: number) => void;
  setHighlightSize: (size: number) => void;
  toggleAnnotations: () => void;
  setCurrentPage: (page: number) => void;
  setZoom: (zoom: number) => void;

  setPageAnnotations: (page: number, data: AnnotationData) => void;
  pushSnapshot: (page: number, data: AnnotationData) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  markPageSaved: (page: number) => void;
  setPageDirty: (page: number) => void;
}

export const useStudyStore = create<StudyState>((set, get) => ({
  tool: "highlight",
  color: "yellow",
  penColor: "#ef4444",
  penSize: 4,
  highlightSize: 24,
  showAnnotations: true,
  currentPage: 1,
  zoom: 1,
  annotationsByPage: {},
  history: [],
  historyIndex: -1,
  savedPages: new Set(),

  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setPenColor: (penColor) => set({ penColor }),
  setPenSize: (penSize) => set({ penSize }),
  setHighlightSize: (highlightSize) => set({ highlightSize }),
  toggleAnnotations: () => set((s) => ({ showAnnotations: !s.showAnnotations })),
  setCurrentPage: (currentPage) => set({ currentPage }),
  setZoom: (zoom) => set({ zoom: Math.min(3, Math.max(0.5, zoom)) }),

  setPageAnnotations: (page, data) =>
    set((s) => ({
      annotationsByPage: { ...s.annotationsByPage, [page]: data },
      history: [data],
      historyIndex: 0,
    })),

  pushSnapshot: (page, data) =>
    set((s) => {
      const history = [...s.history.slice(0, s.historyIndex + 1), data];
      return {
        annotationsByPage: { ...s.annotationsByPage, [page]: data },
        history,
        historyIndex: history.length - 1,
        savedPages: new Set([...s.savedPages].filter((p) => p !== page)),
      };
    }),

  undo: () =>
    set((s) => {
      if (s.historyIndex <= 0) return s;
      const index = s.historyIndex - 1;
      const data = s.history[index] ?? [];
      return {
        historyIndex: index,
        annotationsByPage: { ...s.annotationsByPage, [s.currentPage]: data },
      };
    }),

  redo: () =>
    set((s) => {
      if (s.historyIndex >= s.history.length - 1) return s;
      const index = s.historyIndex + 1;
      const data = s.history[index] ?? [];
      return {
        historyIndex: index,
        annotationsByPage: { ...s.annotationsByPage, [s.currentPage]: data },
      };
    }),

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  markPageSaved: (page) =>
    set((s) => ({ savedPages: new Set([...s.savedPages, page]) })),

  setPageDirty: (page) =>
    set((s) => {
      const savedPages = new Set(s.savedPages);
      savedPages.delete(page);
      return { savedPages };
    }),
}));