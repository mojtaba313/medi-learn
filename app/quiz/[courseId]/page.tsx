import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { QuizPage } from "@/components/quiz/quiz-page";

export const metadata = { title: "آزمون" };

export default async function QuizRoute({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { courseId } = await params;

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, category: true, status: true },
  });

  if (!course || course.status !== "READY") return notFound();

  return <QuizPage courseId={course.id} courseTitle={course.title} userId={user.id} />;
}