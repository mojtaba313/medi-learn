import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminModules } from "@/components/admin/admin-modules";

export const metadata = { title: "مدیریت ماژول‌ها" };

export default async function AdminModulesPage() {
  await requireAdmin();

  const modules = await db.module.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: {
      lessons: { select: { id: true, slug: true, title: true } },
      _count: { select: { questions: true, flashcards: true } },
    },
  });

  return (
    <AdminModules
      initialModules={modules.map((module) => ({
        id: module.id,
        title: module.title,
        cardTitle: module.cardTitle,
        description: module.description,
        lessonCount: module.lessons.length,
        questionCount: module._count.questions,
        flashcardCount: module._count.flashcards,
        createdAt: module.createdAt.toISOString(),
      }))}
    />
  );
}
