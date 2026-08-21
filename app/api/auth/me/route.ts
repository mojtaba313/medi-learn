import { getSession } from "@/lib/auth";
import { ok } from "@/lib/api";

export async function GET() {
  const session = await getSession();
  if (!session) return ok({ user: null });
  return ok({ user: session });
}