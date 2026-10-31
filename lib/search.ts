import { db } from "@/lib/db";

export type SearchResultType =
  | "note"
  | "highlight"
  | "module-question"
  | "note-question"
  | "note-note";

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

  const [notes, highlights, noteNotes, noteQuestions] = await Promise.all([
    db.note.findMany({
      where: {
        OR: [
          { title: { contains: query, mode } },
          { cardTitle: { contains: query, mode } },
          { description: { contains: query, mode } },
          { searchText: { contains: query, mode } },
        ],
      },
      take: 12,
    }),
    db.textAnnotation.findMany({
      where: {
        userId,
        OR: [
          { quote: { contains: query, mode } },
          { content: { contains: query, mode } },
        ],
      },
      include: {
        note: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
      },
      take: 10,
    }),
    db.noteNote.findMany({
      where: { userId, text: { contains: query, mode } },
      include: {
        note: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
      },
      take: 10,
    }),
    db.noteQuestion.findMany({
      where: {
        OR: [
          { text: { contains: query, mode } },
          { explanation: { contains: query, mode } },
        ],
      },
      select: {
        id: true,
        text: true,
        explanation: true,
        note: { select: { id: true, title: true } },
      },
      take: 10,
    }),
  ]);

  return [
    ...notes.map<SearchResult>((note) => ({
      type: "note",
      label: "جزوه",
      title: note.title,
      subtitle: note.slug,
      href: `/modules/${note.id}`,
      snippet: snippet(note.searchText, query),
    })),
    ...highlights.map<SearchResult>((highlight) => ({
      type: "highlight",
      label: "هایلایت",
      title: highlight.note.title,
      subtitle: highlight.note.title,
      href: `/modules/${highlight.note.id}`,
      snippet: snippet(`${highlight.quote} ${highlight.content ?? ""}`, query),
    })),
    ...noteNotes.map<SearchResult>((noteNote) => ({
      type: "note-note",
      label: "یادداشت",
      title: noteNote.note.title,
      subtitle: noteNote.text.slice(0, 50),
      href: `/modules/${noteNote.note.id}`,
      snippet: snippet(noteNote.text, query),
    })),
    ...noteQuestions.map<SearchResult>((question) => ({
      type: "note-question",
      label: "سوال جزوه",
      title: question.text,
      subtitle: question.note.title,
      href: `/modules/${question.note.id}?view=quiz`,
      snippet: snippet(question.explanation, query),
    })),
  ];
}