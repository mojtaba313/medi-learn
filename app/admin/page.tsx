import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata = { title: "پنل مدیریت" };

export default async function AdminPage() {
  const user = await requireAdmin();

  const notes = await db.note.findMany({
    where: { createdById: user.id },
    include: {
      _count: { select: { questions: true, flashcards: true, assets: true } },
    },
    orderBy: { order: "asc" },
  });

  const serialized = notes.map((n) => ({
    id: n.id,
    title: n.title,
    cardTitle: n.cardTitle,
    description: n.description,
    kind: n.kind,
    order: n.order,
    _count: {
      questions: n._count.questions,
      flashcards: n._count.flashcards,
      assets: n._count.assets,
    },
  }));

  return <AdminDashboard initialNotes={serialized} />;
}