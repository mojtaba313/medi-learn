"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { Activity, BookOpen, Heart, LayoutDashboard, LogOut, Shield, Stethoscope, User } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-bold text-lg", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/30">
        <Stethoscope className="h-5 w-5" />
      </span>
      <span className="bg-gradient-to-l from-teal-600 to-cyan-600 bg-clip-text text-transparent dark:from-teal-400 dark:to-cyan-400">
        مدی‌لرن
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />

          <nav className="hidden items-center gap-1 md:flex">
            {user ? (
              <>
                <NavLink href="/dashboard" icon={LayoutDashboard} label="داشبورد" />
                {user.role === "ADMIN" && (
                  <NavLink href="/admin" icon={Shield} label="پنل مدیریت" />
                )}
              </>
            ) : (
              <Button asChild variant="default" size="sm" className="rounded-full">
                <Link href="/login">ورود به پلتفرم</Link>
              </Button>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-full gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <User className="h-3.5 w-3.5" />
                    </span>
                    <span className="hidden max-w-[120px] truncate sm:inline">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.username}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">
                      <LayoutDashboard className="ml-2 h-4 w-4" />
                      داشبورد
                    </Link>
                  </DropdownMenuItem>
                  {user.role === "ADMIN" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <Shield className="ml-2 h-4 w-4" />
                        پنل مدیریت
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive">
                    <LogOut className="ml-2 h-4 w-4" />
                    خروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="default" size="sm" className="rounded-full">
                <Link href="/login">ورود</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t border-border/60 py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-teal-500" />
            <span>مدی‌لرن - پلتفرم یادگیری دانشجویان پزشکی</span>
          </div>
          <p className="flex flex-wrap items-center justify-center gap-1">
            <span>توسعه داده شده با</span>
            <Heart className="h-4 w-4 fill-primary text-primary" />
            <span>توسط</span>
            <a
              href="https://github.com/mojtaba313"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary transition-colors hover:underline"
            >
              مجتبی
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
}) {
  const pathname = usePathname();
  const active = pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-pill"
          className="absolute inset-0 rounded-full bg-primary/10"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <Icon className="relative z-10 h-4 w-4" />
      <span className="relative z-10">{label}</span>
    </Link>
  );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-blob absolute -top-32 -right-32 h-96 w-96 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="animate-blob absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl [animation-delay:4s]" />
        <div className="animate-blob absolute top-1/3 left-1/4 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl [animation-delay:8s]" />
      </div>
      <div className="relative z-10 mb-8">
        <Logo />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative z-10 w-full max-w-md"
      >
        {children}
      </motion.div>
    </div>
  );
}

export { BookOpen };