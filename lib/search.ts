import { db } from "@/lib/db";

export type SearchResultType =
  | "module"
  | "lesson"
  | "note"
  | "highlight"
  | "module-question"
  | "course"
  | "question"
  | "sample-question";

export interface SearchResult {
  type: SearchResultType;
  label: string;
  title: string;
  subtitle: string;
  href: string;
  snippet: string;
}

const mode = "insensitive" as const;

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function snippet(text: string, query: string, max = 190) {
  const clean = stripHtml(text);
  const index = clean.toLowerCase().indexOf(query.toLowerCase());
  const start = Math.max(0, index >= 0 ? index - 60 : 0);
  const value = clean.slice(start, start + max);
  return `${start > 0 ? "…" : ""}${value}${start + max < clean.length ? "…" : ""}`;
}

export async function searchAll(userId: string, rawQuery: string) {
  const query = rawQuery.trim();
  if (query.length < 2) return [] as SearchResult[];

  const [modules, lessons, notes, highlights, moduleQuestions, courses, questions, sampleQuestions] =
    await Promise.all([
      db.module.findMany({
        where: {
          OR: [
            { title: { contains: query, mode } },
            { cardTitle: { contains: query, mode } },
            { description: { contains: query, mode } },
          ],
        },
        take: 5,
      }),
      db.lesson.findMany({
        where: {
          OR: [
            { title: { contains: query, mode } },
            { summary: { contains: query, mode } },
            { html: { contains: query, mode } },
          ],
        },
        include: { module: { select: { id: true, title: true } } },
        take: 12,
      }),
      db.lessonNote.findMany({
        where: { userId, text: { contains: query, mode } },
        include: {
          lesson: {
            select: {
              slug: true,
              title: true,
              module: { select: { id: true, title: true } },
            },
          },
        },
        take: 10,
      }),
      db.lessonAnnotation.findMany({
        where: {
          userId,
          OR: [
            { quote: { contains: query, mode } },
            { note: { contains: query, mode } },
          ],
        },
        include: {
          lesson: {
            select: {
              slug: true,
              title: true,
              module: { select: { id: true, title: true } },
            },
          },
        },
        take: 10,
      }),
      db.moduleQuestion.findMany({
        where: {
          OR: [
            { text: { contains: query, mode } },
            { explanation: { contains: query, mode } },
          ],
        },
        include: { module: { select: { id: true, title: true } } },
        take: 10,
      }),
      db.course.findMany({
        where: {
          status: "READY",
          OR: [
            { title: { contains: query, mode } },
            { description: { contains: query, mode } },
            { category: { contains: query, mode } },
          ],
        },
        take: 6,
      }),
      db.question.findMany({
        where: {
          OR: [
            { text: { contains: query, mode } },
            { explanation: { contains: query, mode } },
          ],
        },
        include: { course: { select: { id: true, title: true } } },
        take: 10,
      }),
      db.sampleQuestion.findMany({
        where: {
          OR: [
            { text: { contains: query, mode } },
            { explanation: { contains: query, mode } },
          ],
        },
        include: {
          sampleSet: {
            select: {
              title: true,
              courseId: true,
              course: { select: { title: true } },
            },
          },
        },
        take: 8,
      }),
    ]);

  return [
    ...modules.map<SearchResult>((module) => ({
      type: "module",
      label: "ماژول",
      title: module.cardTitle,
      subtitle: module.title,
      href: `/modules/${module.id}`,
      snippet: snippet(module.description, query),
    })),
    ...lessons.map<SearchResult>((lesson) => ({
      type: "lesson",
      label: "درس",
      title: lesson.title,
      subtitle: lesson.module.title,
      href: `/modules/${lesson.module.id}?lesson=${lesson.slug}`,
      snippet: snippet(lesson.html, query),
    })),
    ...notes.map<SearchResult>((note) => ({
      type: "note",
      label: "یادداشت",
      title: note.lesson.title,
      subtitle: note.lesson.module.title,
      href: `/modules/${note.lesson.module.id}?lesson=${note.lesson.slug}`,
      snippet: snippet(note.text, query),
    })),
    ...highlights.map<SearchResult>((highlight) => ({
      type: "highlight",
      label: "هایلایت",
      title: highlight.lesson.title,
      subtitle: highlight.lesson.module.title,
      href: `/modules/${highlight.lesson.module.id}?lesson=${highlight.lesson.slug}`,
      snippet: snippet(`${highlight.quote} ${highlight.note ?? ""}`, query),
    })),
    ...moduleQuestions.map<SearchResult>((question) => ({
      type: "module-question",
      label: "سوال ماژول",
      title: question.text,
      subtitle: question.module.title,
      href: `/modules/${question.module.id}?view=quiz`,
      snippet: snippet(question.explanation, query),
    })),
    ...courses.map<SearchResult>((course) => ({
      type: "course",
      label: "درس تصویری",
      title: course.title,
      subtitle: course.category,
      href: `/study/${course.id}`,
      snippet: snippet(course.description, query),
    })),
    ...questions.map<SearchResult>((question) => ({
      type: "question",
      label: "سوال صفحه",
      title: question.text,
      subtitle: question.course.title,
      href: `/quiz/${question.course.id}`,
      snippet: snippet(question.explanation ?? "", query),
    })),
    ...sampleQuestions.map<SearchResult>((question) => ({
      type: "sample-question",
      label: "نمونه سوال",
      title: question.text,
      subtitle: `${question.sampleSet.title} • ${question.sampleSet.course.title}`,
      href: `/study/${question.sampleSet.courseId}/sample`,
      snippet: snippet(question.explanation ?? "", query),
    })),
  ];
}
