import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { StudyViewer } from "@/components/study/study-viewer";

export const metadata = { title: "مطالعه" };

export default async function StudyPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { courseId } = await params;

  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      pages: { orderBy: { pageNumber: "asc" } },
      questions: {
        include: {
          responses: {
            where: { userId: user.id },
            select: { selectedOption: true, isCorrect: true },
          },
        },
        orderBy: { pageNumber: "asc" },
      },
    },
  });

  if (!course || course.status !== "READY") return notFound();

  const serialized = {
    id: course.id,
    title: course.title,
    category: course.category,
    pages: course.pages.map((p) => ({
      pageNumber: p.pageNumber,
      imageUrl: p.imageUrl,
      width: p.width,
      height: p.height,
    })),
    questions: course.questions.map((q) => ({
      id: q.id,
      pageNumber: q.pageNumber,
      text: q.text,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctOption: q.correctOption,
      explanation: q.explanation,
      tags: q.tags,
      response: q.responses[0] ?? null,
    })),
  };

  return (
    <StudyViewer
      course={serialized}
      userName={user.name}
      isAdmin={user.role === "ADMIN"}
    />
  );
}