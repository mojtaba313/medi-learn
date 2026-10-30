import Link from "next/link";
import { Search } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { searchAll } from "@/lib/search";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toFa } from "@/lib/utils";

export const metadata = { title: "جستجو" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireAuth();
  const { q = "" } = await searchParams;
  const results = await searchAll(user.id, q);

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold sm:text-3xl">جستجوی سراسری</h1>
          <p className="mt-1 text-muted-foreground">
            در درس‌ها، یادداشت‌ها، هایلایت‌ها، سوالات و جزوه‌های تصویری جستجو کنید.
          </p>
        </div>

        <form action="/search" className="mb-8 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="مثلاً: مارفان، هیالین، CNV…"
              className="h-12 rounded-xl pr-10 text-base"
              autoFocus
            />
          </div>
          <Button type="submit" className="h-12 rounded-xl px-6">
            جستجو
          </Button>
        </form>

        {q.trim().length >= 2 ? (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {toFa(results.length)} نتیجه برای «{q}»
            </p>
            <div className="space-y-3">
              {results.map((result, index) => (
                <Card key={`${result.type}-${index}`} className="border-border/60">
                  <CardContent className="p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{result.label}</Badge>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                      )}
                    </div>
                    <Link
                      href={result.href}
                      className="font-semibold leading-7 transition-colors hover:text-primary"
                    >
                      {result.title}
                    </Link>
                    {result.snippet && (
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {result.snippet}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
              {results.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
                  چیزی پیدا نشد. عبارت دیگری را امتحان کنید.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
            حداقل دو حرف وارد کنید.
          </div>
        )}
      </main>
    </AppShell>
  );
}
