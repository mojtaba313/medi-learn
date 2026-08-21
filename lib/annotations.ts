export type AnnotationToolType = "select" | "pan" | "highlight" | "pen" | "eraser";

export interface AnnotationPoint {
  x: number;
  y: number;
}

export interface AnnotationElement {
  id: string;
  tool: "highlight" | "pen";
  color: string;
  size: number;
  opacity: number;
  points: AnnotationPoint[];
}

export type AnnotationData = AnnotationElement[];

export function createElementId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function parseAnnotationData(data: unknown): AnnotationData {
  if (Array.isArray(data)) {
    return data.filter(
      (e): e is AnnotationElement =>
        e &&
        typeof e === "object" &&
        (e.tool === "highlight" || e.tool === "pen") &&
        Array.isArray(e.points) &&
        typeof e.color === "string" &&
        typeof e.size === "number"
    );
  }
  return [];
}

export function measureStrokeLength(elem: AnnotationElement): number {
  let length = 0;
  for (let i = 1; i < elem.points.length; i++) {
    const a = elem.points[i - 1];
    const b = elem.points[i];
    length += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return length;
}