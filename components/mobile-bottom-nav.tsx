"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Bell,
  ChevronUp,
  MoreHorizontal,
  Moon,
  Sun,
  UserRound,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useMounted } from "@/lib/use-local-storage";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type NavigationItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const PRIMARY_LINKS = [
  { href: "/tasks", label: "Tasks" },
  { href: "/calendar", label: "Calendar" },
  { href: "/streak", label: "Streaks" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/friends") return pathname === "/friends";
  if (href === "/profile") {
    return pathname === "/profile" || pathname.startsWith("/profile/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav({ items }: { items: NavigationItem[] }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const dark = mounted && resolvedTheme === "dark";

  const additionalLinks = items.filter(
    (item) => !PRIMARY_LINKS.some((primary) => primary.href === item.href)
  );
  const links = [
    ...additionalLinks,
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/profile", label: "Profile", icon: UserRound },
  ];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgb(0_0_0/0.06)] md:hidden">
      <Drawer
        open={moreOpen}
        onOpenChange={setMoreOpen}
        showSwipeHandle
        swipeDirection="down"
      >
        <DrawerContent className="max-h-[min(80dvh,36rem)]">
          <div className="min-h-0 overflow-y-auto">
            <DrawerHeader className="relative px-5 pb-3 pt-2">
              <DrawerTitle className="text-lg">More</DrawerTitle>
              <DrawerDescription className="sr-only">
                Additional pages and app settings.
              </DrawerDescription>
              <button
                type="button"
                aria-label="Close more navigation"
                onClick={() => setMoreOpen(false)}
                className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-4" />
              </button>
            </DrawerHeader>
            <nav
              id="mobile-more-links"
              aria-label="More navigation links"
              className="grid grid-cols-2 gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
            >
              {links.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
              <button
                type="button"
                aria-label="Toggle theme"
                onClick={() => setTheme(dark ? "light" : "dark")}
                className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {dark ? (
                  <Moon className="size-4 shrink-0" />
                ) : (
                  <Sun className="size-4 shrink-0" />
                )}
                Toggle theme
              </button>
            </nav>
          </div>
        </DrawerContent>
      </Drawer>

      <nav aria-label="Mobile primary navigation" className="grid grid-cols-4">
        {PRIMARY_LINKS.map((item) => {
          const navItem = items.find((candidate) => candidate.href === item.href);
          if (!navItem) return null;
          const Icon = navItem.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          aria-expanded={moreOpen}
          aria-controls="mobile-more-links"
          onClick={() => setMoreOpen((open) => !open)}
          className={cn(
            "flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
            moreOpen || links.some((item) => isActive(pathname, item.href))
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          {moreOpen ? (
            <X className="size-5" />
          ) : links.some((item) => isActive(pathname, item.href)) ? (
            <ChevronUp className="size-5" />
          ) : (
            <MoreHorizontal className="size-5" />
          )}
          More
        </button>
      </nav>
    </div>
  );
}
