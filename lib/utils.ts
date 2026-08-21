import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const faDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toFa(value: number | string): string {
  return String(value).replace(/\d/g, (d) => faDigits[Number(d)]);
}

export function toFaWithSeparator(value: number): string {
  return toFa(value.toLocaleString("en-US"));
}

const faDate = new Intl.DateTimeFormat("fa-IR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const faDateShort = new Intl.DateTimeFormat("fa-IR", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

const faTime = new Intl.DateTimeFormat("fa-IR", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(date: Date | string): string {
  return faDate.format(new Date(date));
}

export function formatDateShort(date: Date | string): string {
  return faDateShort.format(new Date(date));
}

export function formatTime(date: Date | string): string {
  return faTime.format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return `${faDate.format(d)} - ${faTime.format(d)}`;
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return toFa(`${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
  return toFa(`${m}:${String(s).padStart(2, "0")}`);
}

export function formatRelative(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "هم‌اکنون";
  if (minutes < 60) return toFa(`${minutes} دقیقه پیش`);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return toFa(`${hours} ساعت پیش`);
  const days = Math.floor(hours / 24);
  if (days < 7) return toFa(`${days} روز پیش`);
  return formatDateShort(d);
}

export function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}