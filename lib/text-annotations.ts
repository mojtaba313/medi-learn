export const TEXT_ANNOTATION_COLORS = ["yellow", "green", "blue", "pink"] as const;
export type TextAnnotationColor = (typeof TEXT_ANNOTATION_COLORS)[number];

export interface TextAnnotation {
  id: string;
  lessonSlug: string;
  color: TextAnnotationColor;
  note: string;
  quote: string;
  startPath: number[];
  startOffset: number;
  endPath: number[];
  endOffset: number;
  createdAt: number;
}

export const annotationTimestamp = () => Date.now();

export const createTextAnnotationId = () =>
  `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const getNodePath = (root: Node, node: Node) => {
  const path: number[] = [];
  let current: Node | null = node;

  while (current && current !== root) {
    const parent = current.parentNode as Node | null;
    if (!parent) return null;
    path.unshift(Array.prototype.indexOf.call(parent.childNodes, current));
    current = parent;
  }

  return current === root ? path : null;
};

export const resolveNodePath = (root: Node, path: number[]) => {
  let node: Node | null = root;
  for (const index of path) {
    if (!node || !node.childNodes || !node.childNodes[index]) return null;
    node = node.childNodes[index];
  }
  return node;
};

const boundaryPoint = (
  container: Node,
  offset: number,
  root: Node,
  isStart: boolean,
) => {
  if (container.nodeType === Node.TEXT_NODE) {
    return {
      node: container,
      offset: Math.min(Math.max(offset, 0), container.textContent?.length ?? 0),
    };
  }

  if (!root.contains(container)) return null;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  let last: Node | null = null;

  while (node) {
    last = node;
    if (isStart) break;
    node = walker.nextNode();
  }

  if (!last) return null;

  return {
    node: last,
    offset: isStart ? 0 : last.textContent?.length ?? 0,
  };
};

export const serializeSelection = (selection: Selection | null, root: HTMLElement) => {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;

  const start = boundaryPoint(range.startContainer, range.startOffset, root, true);
  const end = boundaryPoint(range.endContainer, range.endOffset, root, false);

  if (!start || !end) return null;
  if (start.node === end.node && start.offset === end.offset) return null;

  const quote = selection.toString().replace(/\s+/g, " ").trim();
  if (quote.length < 2) return null;

  const startPath = getNodePath(root, start.node);
  const endPath = getNodePath(root, end.node);

  if (!startPath || !endPath) return null;

  return {
    startPath,
    startOffset: start.offset,
    endPath,
    endOffset: end.offset,
    quote,
  };
};

const comparePaths = (a: number[], b: number[]) => {
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return a.length - b.length;
};

const compareAnnotations = (a: TextAnnotation, b: TextAnnotation) => {
  const pathOrder = comparePaths(a.startPath, b.startPath);
  if (pathOrder !== 0) return pathOrder;
  return a.startOffset - b.startOffset;
};

export const clearAnnotationMarks = (root: HTMLElement | null) => {
  if (!root) return;
  root.querySelectorAll("mark.annotation-highlight").forEach((mark) => {
    mark.replaceWith(document.createTextNode(mark.textContent ?? ""));
  });
  root.normalize();
};

const wrapRange = (range: Range, annotation: TextAnnotation) => {
  const nodes: Text[] = [];

  if (range.commonAncestorContainer.nodeType === Node.TEXT_NODE) {
    nodes.push(range.commonAncestorContainer as Text);
  } else {
    const walker = document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_TEXT,
    );
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (!range.intersectsNode(node)) continue;
      if (node.parentElement?.closest("mark.annotation-highlight")) continue;
      nodes.push(node);
    }
  }

  nodes.forEach((node) => {
    let start = node === range.startContainer ? range.startOffset : 0;
    let end = node === range.endContainer ? range.endOffset : node.textContent?.length ?? 0;

    start = Math.max(0, Math.min(start, node.textContent?.length ?? 0));
    end = Math.max(0, Math.min(end, node.textContent?.length ?? 0));
    if (start >= end) return;

    const target = node.splitText(start);
    target.splitText(end - start);

    const mark = document.createElement("mark");
    mark.className = `annotation-highlight annotation-${annotation.color}`;
    mark.dataset.annotationId = annotation.id;
    if (annotation.note) mark.title = annotation.note;
    mark.textContent = target.textContent;
    target.replaceWith(mark);
  });
};

export const applyTextAnnotations = (
  root: HTMLElement | null,
  annotations: TextAnnotation[],
) => {
  if (!root) return;
  clearAnnotationMarks(root);

  const valid = annotations
    .filter(
      (annotation) =>
        annotation &&
        TEXT_ANNOTATION_COLORS.includes(annotation.color) &&
        Array.isArray(annotation.startPath) &&
        Array.isArray(annotation.endPath),
    )
    .sort(compareAnnotations)
    .reverse();

  valid.forEach((annotation) => {
    const start = resolveNodePath(root, annotation.startPath);
    const end = resolveNodePath(root, annotation.endPath);
    if (!start || !end || start.nodeType !== Node.TEXT_NODE || end.nodeType !== Node.TEXT_NODE) {
      return;
    }

    const range = document.createRange();
    try {
      range.setStart(start, Math.min(annotation.startOffset, start.textContent?.length ?? 0));
      range.setEnd(end, Math.min(annotation.endOffset, end.textContent?.length ?? 0));
    } catch {
      return;
    }

    if (range.collapsed) return;
    wrapRange(range, annotation);
  });
};

export const findAnnotationMark = (root: HTMLElement | null, id: string) => {
  if (!root || !id) return null;
  return Array.from(root.querySelectorAll<HTMLElement>("mark.annotation-highlight")).find(
    (mark) => mark.dataset.annotationId === id,
  );
};
