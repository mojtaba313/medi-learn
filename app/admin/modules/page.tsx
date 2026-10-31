import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminModules } from "@/components/admin/admin-modules";

export const metadata = { title: "مدیریت جزوه‌ها" };

export default async function AdminModulesPage() {
  await requireAdmin();

  const notes = await db.note.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { questions: true, flashcards: true } },
    },
  });

  return (
    <AdminModules
      initialModules={notes.map((note) => ({
        id: note.id,
        title: note.title,
        cardTitle: note.cardTitle,
        description: note.description,
        lessonCount: 1,
        questionCount: note._count.questions,
        flashcardCount: note._count.flashcards,
        createdAt: note.createdAt.toISOString(),
      }))}
    />
  );
}
