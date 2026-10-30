"use client";

import { useMemo, useState } from "react";
import { ImageIcon, Search, X } from "lucide-react";
import type { GalleryData } from "@/components/modules/types";
import { toFa } from "@/lib/utils";

const PAGE_SIZE = 24;

export function ModuleGallery({
  gallery,
  onOpenImage,
}: {
  gallery: GalleryData | null;
  onOpenImage: (src: string, title: string) => void;
}) {
  const collections = useMemo(() => gallery?.collections ?? [], [gallery]);
  const [type, setType] = useState(collections[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const collection = useMemo(
    () => collections.find((item) => item.id === type) ?? collections[0],
    [collections, type],
  );

  if (!gallery || !collection) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
        گالری‌ای برای این ماژول ثبت نشده است.
      </div>
    );
  }

  const numbers = Array.from({ length: collection.pageCount }, (_, index) => index + 1).filter(
    (page) => !search.trim() || String(page).includes(search.trim()),
  );
  const shown = numbers.slice(0, limit);

  const pageSrc = (page: number) =>
    `/${collection.file.replace(
      "{page}",
      String(page).padStart(collection.pad || 0, "0"),
    )}`;

  const selectType = (value: string) => {
    setType(value);
    setLimit(PAGE_SIZE);
  };

  return (
    <section className="mx-auto w-full max-w-6xl">
      <header className="mb-5">
        <div className="mb-1 flex items-center gap-2 text-xs font-medium text-teal-600 dark:text-teal-400">
          <ImageIcon className="h-3.5 w-3.5" />
          اسناد اصلی درس
        </div>
        <h1 className="text-2xl font-black sm:text-3xl">{gallery.title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
          {gallery.intro}
        </p>
      </header>

      {gallery.callout && (
        <div className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-7 text-amber-800 dark:text-amber-200">
          {gallery.callout}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={collection.id}
          onChange={(event) => selectType(event.target.value)}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
          aria-label="نوع جزوه"
        >
          {collections.map((item) => (
            <option value={item.id} key={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setLimit(PAGE_SIZE);
            }}
            placeholder="شماره صفحه، مثلاً 12"
            type="search"
            className="h-10 w-full rounded-xl border border-input bg-background px-3 pr-9 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setType(collections[0]?.id ?? "");
            setSearch("");
            setLimit(PAGE_SIZE);
          }}
          className="h-10 rounded-xl border border-border px-4 text-sm font-medium hover:bg-muted"
        >
          بازنشانی
        </button>
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        نمایش {toFa(shown.length)} از {toFa(numbers.length)} {collection.unit}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {shown.map((page) => {
          const src = pageSrc(page);
          const title = `${collection.unit} ${toFa(page)}`;
          return (
            <button
              type="button"
              key={src}
              onClick={() => onOpenImage(src, title)}
              className="group overflow-hidden rounded-xl border border-border/60 bg-card text-right transition-colors hover:border-teal-500/40"
            >
              <div className="aspect-[3/4] overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  loading="lazy"
                  src={src}
                  alt={`${collection.unit} ${page}`}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                {collection.unit} {toFa(page)}
              </div>
            </button>
          );
        })}
      </div>

      {shown.length < numbers.length && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setLimit((current) => current + PAGE_SIZE)}
            className="rounded-xl border border-border px-5 py-2 text-sm font-medium hover:bg-muted"
          >
            نمایش صفحات بعدی
          </button>
        </div>
      )}
    </section>
  );
}

export function ImageLightbox({
  image,
  onClose,
}: {
  image: { src: string; title: string } | null;
  onClose: () => void;
}) {
  if (!image) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-label={image.title}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="بستن"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="max-h-full max-w-5xl overflow-auto rounded-xl bg-white p-2" onClick={(event) => event.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.src} alt={image.title} className="max-h-[85vh] w-auto" />
        <div className="py-2 text-center text-sm text-zinc-700">{image.title}</div>
      </div>
    </div>
  );
}
