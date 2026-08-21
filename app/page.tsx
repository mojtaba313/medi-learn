"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  BookOpen,
  Brain,
  FileText,
  Gauge,
  GraduationCap,
  Highlighter,
  LineChart,
  Pen,
  Sparkles,
  Stethoscope,
  Target,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: FileText,
    title: "جزوه‌های تصویری",
    desc: "بارگذاری PDF و تبدیل خودکار به تصاویر با کیفیت، صفحه‌به‌صفحه",
  },
  {
    icon: Highlighter,
    title: "حاشیه‌نویسی هوشمند",
    desc: "هایلایت، نقاشی و یادداشت روی هر صفحه، ذخیره‌شده برای هر کاربر",
  },
  {
    icon: Brain,
    title: "آزمون صفحه‌محور",
    desc: "سوالات مرتبط با هر صفحه، همراه با پاسخ تشریحی و تحلیل عملکرد",
  },
  {
    icon: LineChart,
    title: "تحلیل عملکرد",
    desc: "نمودار پیشرفت، نقاط ضعف و توصیه‌های هوشمند برای مرور",
  },
  {
    icon: Target,
    title: "حالت‌های متنوع آزمون",
    desc: "مطالعه، آزمون آزمایشی، تصادفی و مرور نقاط ضعف",
  },
  {
    icon: GraduationCap,
    title: "متناسب با دانشجوی پزشکی",
    desc: "دوره‌های تخصصی، آمار دقیق و تجربه یادگیری روان و زیبا",
  },
];

export default function HomePage() {
  return (
    <AppShell>
      <main className="relative overflow-hidden">
        <section className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="grid-bg absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
            <div className="animate-blob absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-teal-400/20 blur-3xl" />
            <div className="animate-blob absolute top-20 right-10 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl [animation-delay:5s]" />
          </div>

          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-4 py-1.5 text-sm font-medium text-teal-600 dark:text-teal-400"
            >
              <Sparkles className="h-4 w-4" />
              پلتفرم یادگیری هوشمند برای دانشجویان پزشکی
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl font-black leading-[1.2] tracking-tight sm:text-6xl"
            >
              مطالعه هوشمند با{" "}
              <span className="bg-gradient-to-l from-teal-500 to-cyan-500 bg-clip-text text-transparent">
                جزوه‌ها و آزمون‌های
              </span>{" "}
              صفحه‌به‌صفحه
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground"
            >
              مدی‌لرن جزوه‌های PDF شما را به یک فضای مطالعه تعاملی تبدیل می‌کند؛
              هایلایت روی صفحات، سوالات مرتبط با هر مبحث، و تحلیل دقیق عملکردتان در مسیر یادگیری.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Button asChild size="lg" className="w-full rounded-2xl sm:w-auto">
                <Link href="/register">شروع یادگیری</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full rounded-2xl sm:w-auto">
                <Link href="/login">
                  <Stethoscope className="ml-2" />
                  ورود به حساب
                </Link>
              </Button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mx-auto mt-16 max-w-4xl"
          >
            <div className="relative rounded-3xl border border-border/60 bg-card/80 p-2 shadow-2xl shadow-teal-500/10 backdrop-blur-xl">
              <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-yellow-400" />
                <span className="h-3 w-3 rounded-full bg-green-400" />
                <span className="ml-auto text-xs text-muted-foreground">
                  study / anatomy
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 p-1">
                <div className="col-span-2 rounded-2xl bg-muted/60 p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-1.5 shadow-sm">
                      <Pen className="h-3.5 w-3.5 text-teal-500" />
                      <span className="text-xs font-medium">قلم</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-1.5 shadow-sm">
                      <Highlighter className="h-3.5 w-3.5 text-yellow-500" />
                      <span className="text-xs font-medium">هایلایت</span>
                    </div>
                  </div>
                  <div className="relative rounded-xl bg-white shadow-inner dark:bg-zinc-100">
                    <div className="flex aspect-[3/4] w-full items-center justify-center rounded-xl bg-gradient-to-br from-zinc-50 to-zinc-200">
                      <div className="space-y-3 p-8">
                        <div className="h-3 w-40 rounded bg-zinc-300" />
                        <div className="h-3 w-56 rounded bg-zinc-300" />
                        <div className="relative">
                          <div className="h-3 w-48 rounded bg-zinc-300" />
                          <div className="absolute -left-2 top-0 h-4 w-56 rounded-sm bg-yellow-300/60" />
                        </div>
                        <div className="h-3 w-52 rounded bg-zinc-300" />
                        <div className="h-3 w-44 rounded bg-zinc-300" />
                        <div className="flex gap-2">
                          <div className="h-3 w-24 rounded bg-teal-400/50" />
                          <div className="h-3 w-28 rounded bg-zinc-300" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex-1 rounded-2xl bg-muted/60 p-4">
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">سوال مرتبط با این صفحه</p>
                    <p className="text-xs leading-5">عصب زوج ۷ ... ؟</p>
                    <div className="mt-3 space-y-1.5">
                      <div className="rounded-md bg-teal-500/15 px-2 py-1.5 text-[10px] font-medium text-teal-600">
                        گزینه ۱ ✓
                      </div>
                      <div className="rounded-md bg-card px-2 py-1.5 text-[10px] text-muted-foreground">گزینه ۲</div>
                      <div className="rounded-md bg-card px-2 py-1.5 text-[10px] text-muted-foreground">گزینه ۳</div>
                    </div>
                  </div>
                  <div className="flex-1 rounded-2xl bg-muted/60 p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <Gauge className="h-3.5 w-3.5 text-teal-500" />
                      پیشرفت شما
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span>۸۵٪</span>
                      <span className="text-muted-foreground">صفحه ۱۴ از ۲۰</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div className="h-full w-[85%] rounded-full bg-gradient-to-l from-teal-500 to-cyan-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">هر آنچه برای مطالعه نیاز دارید</h2>
            <p className="mt-3 text-muted-foreground">
              ابزارهای حرفه‌ای برای یادگیری عمیق و اثربخش
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="group rounded-2xl border border-border/60 bg-card p-6 transition-all hover:-translate-y-1 hover:border-teal-500/40 hover:shadow-lg hover:shadow-teal-500/10"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/15 to-cyan-500/15 text-teal-500 transition-transform group-hover:scale-110">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-semibold">{feature.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-teal-600 to-cyan-600 p-10 text-center text-white shadow-2xl shadow-teal-500/30 sm:p-16">
            <div className="pointer-events-none absolute inset-0 opacity-10">
              <div className="grid-bg absolute inset-0" />
            </div>
            <BookOpen className="mx-auto mb-6 h-12 w-12" />
            <h2 className="text-3xl font-bold sm:text-4xl">آماده‌اید شروع کنید؟</h2>
            <p className="mx-auto mt-4 max-w-xl text-teal-50">
              همین امروز به مدی‌لرن بپیوندید و مطالعه خود را هوشمندتر کنید.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-8 rounded-2xl bg-white text-teal-700 hover:bg-teal-50"
            >
              <Link href="/register">ساخت حساب رایگان</Link>
            </Button>
          </div>
        </section>
      </main>
    </AppShell>
  );
}