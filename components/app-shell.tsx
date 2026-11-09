"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Check,
  Bell,
  Flame,
  ListChecks,
  Moon,
  Smile,
  Sun,
  UsersRound,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EASE } from "@/components/motion-fade";
import { useMounted } from "@/lib/use-local-storage";

const NAV_ITEMS = [
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/streak", label: "Streaks", icon: Flame },
  { href: "/days", label: "Days", icon: Smile },
  { href: "/friends", label: "Friends", icon: UsersRound },
];

function isActive(pathname: string, href: string) {
  if (href === "/profile") {
    return pathname === "/profile" || pathname.startsWith("/profile/");
  }
  return pathname === href;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const dark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </Button>
  );
}

function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:bottom-5 md:pb-0"
    >
      <div className="pointer-events-auto flex w-full max-w-[370px] items-center justify-between gap-0 rounded-2xl border bg-background/95 p-1 shadow-lg shadow-black/5 backdrop-blur-xl md:w-auto md:min-w-[480px] md:max-w-none md:gap-1 md:p-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex min-h-12 min-w-0 flex-1 flex-row items-center justify-center gap-1 rounded-xl px-0.5 py-1 text-sm font-semibold transition-[color,transform] duration-200 ease-out hover:scale-[1.04] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 max-[360px]:gap-1 max-[360px]:px-0 sm:px-1 md:min-h-10 md:flex-none md:gap-1.5 md:px-3 md:py-2 md:text-sm",
                active
                  ? "text-primary md:text-foreground"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-xl bg-primary/10 md:bg-muted md:ring-1 md:ring-foreground/5"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon className="relative z-10 size-[22px] shrink-0 transition-transform duration-200 group-hover:scale-110 max-[360px]:size-5 md:size-[18px]" />
              <span className="relative z-10 truncate text-xs sm:text-[13px] md:text-[13px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function UserMenu() {
  const { user } = useAuth();

  return (
    <Link
      href="/profile"
      aria-label="Open profile"
      className="inline-flex h-9 items-center gap-2 rounded-lg px-1.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <Avatar size="sm">
        <AvatarFallback>{initials(user?.name ?? "U")}</AvatarFallback>
      </Avatar>
      <span className="hidden max-w-28 truncate text-sm font-medium md:inline">
        {user?.name}
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const current =
    NAV_ITEMS.find((item) => isActive(pathname, item.href)) ?? NAV_ITEMS[0];
  const pageTitle =
    pathname === "/notifications"
      ? "Notifications"
      : pathname.startsWith("/profile")
        ? "Profile"
        : current.label;

  return (
    <div className="min-h-dvh bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2.5 border-b bg-background/90 px-3 backdrop-blur-xl sm:gap-3 sm:px-4 md:px-6">
        <Link
          href="/tasks"
          className="flex shrink-0 items-center gap-2"
          aria-label="Taskflow — tasks"
        >
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
            <Check className="size-4" strokeWidth={3} />
          </span>
          <span className="font-heading text-sm font-semibold tracking-tight">
            Taskflow
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 items-center gap-2 pl-2">
          <span aria-hidden className="text-muted-foreground/50">/</span>
          <h1 className="truncate font-heading text-sm font-semibold text-muted-foreground md:text-base">
            {pageTitle}
          </h1>
        </div>

        <ThemeToggle />

        <Link
          href="/notifications"
          aria-label="Notifications"
          title="Notifications"
          className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <Bell className="size-4" />
        </Link>

        <UserMenu />
      </header>

      {/* Page content with route transitions */}
      <main className="mx-auto w-full max-w-5xl min-w-0 px-3 py-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-6 sm:pb-28 md:px-6 md:py-8 md:pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating bottom navigation (PC + mobile) */}
      <BottomNav />
    </div>
  );
}

export { NAV_ITEMS };
