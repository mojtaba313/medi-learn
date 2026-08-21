"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "motion/react";
import { LogIn, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";

const schema = z.object({
  email: z.string().email("ایمیل معتبر نیست"),
  password: z.string().min(1, "رمز عبور را وارد کنید"),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "خطا در ورود");
        return;
      }
      toast.success(`خوش آمدید، ${data.user.name} 👋`);
      await refresh();
      const next = searchParams.get("next");
      if (next && next.startsWith("/")) {
        router.push(next);
      } else {
        router.push(data.user.role === "ADMIN" ? "/admin" : "/dashboard");
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-border/60 shadow-xl shadow-teal-500/5 backdrop-blur-xl">
      <CardHeader className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/30"
        >
          <Stethoscope className="h-7 w-7" />
        </motion.div>
        <CardTitle className="text-2xl">ورود به حساب</CardTitle>
        <CardDescription>به پلتفرم یادگیری پزشکی خوش آمدید</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">ایمیل</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              dir="ltr"
              className="text-right"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">رمز عبور</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              dir="ltr"
              className="text-right"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full rounded-xl" loading={loading} size="lg">
            <LogIn className="ml-2" />
            ورود
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          حساب ندارید؟{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            ثبت‌نام کنید
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}