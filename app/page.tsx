"use client";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BarChart3,
  CalendarClock,
  Check,
  Flame,
  ListChecks,
  ListTodo,
  Smile,
  Sparkles,
  UserCog,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Reveal, EASE } from "@/components/motion-fade";

const FEATURES = [
  {
    icon: ListChecks,
    title: "Smart tasks",
    description: "Keep priorities, notes, and progress together in one clear list.",
  },
  {
    icon: CalendarClock,
    title: "Advanced scheduling",
    description: "Plan due dates and recurring work around your actual week.",
  },
  {
    icon: Flame,
    title: "Streaks & habits",
    description: "Turn small routines into steady progress you can see.",
  },
  {
    icon: Smile,
    title: "Daily check-ins",
    description: "Make space to reflect and notice how each day feels.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description: "Review your activity and consistency over time.",
  },
  {
    icon: UserCog,
    title: "Profile & settings",
    description: "Make your workspace feel like yours.",
  },
];

const PREVIEW_TASKS = [
  { title: "Plan today's priorities", time: "9:00 AM", complete: true },
  { title: "Read for 20 minutes", time: "6:30 PM", complete: true },
  { title: "Evening reflection", time: "9:00 PM", complete: false },
];

function getIndiaPricing() {
  if (typeof navigator === "undefined") return false;
  const locales = navigator.languages.length
    ? navigator.languages
    : [navigator.language];
  const indiaLocale = locales.some((locale) => /-IN(?:-|$)/i.test(locale));
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    indiaLocale ||
    timeZone === "Asia/Kolkata" ||
    timeZone === "Asia/Calcutta"
  );
}

function subscribeToPricingRegion() {
  return () => {};
}

function useIndiaPricing() {
  return useSyncExternalStore(
    subscribeToPricingRegion,
    getIndiaPricing,
    () => false
  );
}

function PreviewCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
    >
      <div className="relative isolate overflow-hidden rounded-3xl border bg-card p-5 shadow-xl ring-1 ring-foreground/5 dark:shadow-none sm:p-6">
        <div
          className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ListTodo className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Your daily overview</p>
              <p className="text-xs text-muted-foreground">
                A little progress adds up
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border bg-background p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">TODAY</p>
                <p className="mt-1 font-heading text-lg font-semibold">A steady day</p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                2 of 3 done
              </span>
            </div>
            <div
              className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Today's tasks"
              aria-valuemin={0}
              aria-valuemax={3}
              aria-valuenow={2}
            >
              <div className="h-full w-2/3 rounded-full bg-primary" />
            </div>

            <ul className="mt-4 divide-y">
              {PREVIEW_TASKS.map((task) => (
                <li
                  key={task.title}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                      task.complete
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted/30"
                    }`}
                    aria-hidden="true"
                  >
                    {task.complete && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${
                      task.complete
                        ? "text-muted-foreground line-through"
                        : "font-medium"
                    }`}
                  >
                    {task.title}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {task.time}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-primary/[0.06] px-4 py-3">
            <div>
              <p className="text-xs text-muted-foreground">Current streak</p>
              <p className="mt-0.5 text-sm font-semibold">5 days in a row</p>
            </div>
            <Flame className="size-5 text-primary" aria-hidden="true" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  const isIndia = useIndiaPricing();

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Check className="size-4" strokeWidth={3} />
            </span>
            <span className="font-heading text-base font-semibold tracking-tight">
              Taskflow
            </span>
          </Link>

          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="Main navigation"
          >
            <Button
              variant="ghost"
              nativeButton={false}
              render={<Link href="#features" />}
            >
              Features
            </Button>
            <Button
              variant="ghost"
              nativeButton={false}
              render={<Link href="#pricing" />}
            >
              Pricing
            </Button>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              Log in
            </Button>
            <Button nativeButton={false} render={<Link href="/register" />}>
              Get started
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:px-6 md:py-24">
          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <Badge variant="secondary" className="mb-4 rounded-full px-3 py-1">
                <Sparkles /> A calmer way to make progress
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
              className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl"
            >
              Plan your day. Build better habits.
            </motion.h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Plan your tasks, build habits, and reflect on each day in one
              simple workspace.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24, ease: EASE }}
              className="mt-6 flex flex-wrap gap-3"
            >
              <Button
                size="lg"
                nativeButton={false}
                render={<Link href="/register" />}
              >
                Start building your routine
              </Button>
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                render={<Link href="#pricing" />}
              >
                View pricing
              </Button>
            </motion.div>

            <p className="mt-5 text-xs text-muted-foreground">
              Tasks, habits, daily check-ins, and progress—all in one place.
            </p>
          </div>
          <PreviewCard />
        </section>

        <section
          id="features"
          className="scroll-mt-20 border-t bg-muted/30 py-16 md:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <Reveal className="mx-auto mb-10 max-w-2xl text-center">
              <p className="mb-2 text-xs font-semibold tracking-widest text-primary uppercase">
                Made for everyday progress
              </p>
              <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl">
                Everything you need to stay on track
              </h2>
            </Reveal>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <Reveal key={feature.title} delay={(i % 3) * 0.08}>
                    <article className="group h-full rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                      <span className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <Icon className="size-5" />
                      </span>
                      <h3 className="font-heading text-base font-semibold">
                        {feature.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {feature.description}
                      </p>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className="scroll-mt-20 border-t py-16 md:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="mb-2 text-xs font-semibold tracking-widest text-primary uppercase">
                Simple pricing
              </p>
              <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl">
                One plan. Everything you need.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Focus on building a routine that works for you.
              </p>
            </Reveal>

            <Reveal className="mx-auto mt-10 max-w-md">
              <div className="relative overflow-hidden rounded-3xl border bg-card p-6 shadow-lg ring-1 ring-foreground/5 sm:p-8">
                <div
                  className="pointer-events-none absolute -right-12 -top-16 size-40 rounded-full bg-primary/10 blur-3xl"
                  aria-hidden="true"
                />
                <div className="relative">
                  <Badge variant="secondary" className="rounded-full px-3 py-1">
                    <Sparkles /> Full access
                  </Badge>
                  <p className="mt-5 text-sm font-semibold">Taskflow monthly</p>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    {isIndia ? (
                      <>
                        <span className="font-heading text-5xl font-semibold tracking-tight">
                          ₹99
                        </span>
                        <span className="text-sm text-muted-foreground">
                          / month
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-lg text-muted-foreground line-through">
                          $3
                        </span>
                        <span className="font-heading text-5xl font-semibold tracking-tight">
                          $1.99
                        </span>
                        <span className="text-sm text-muted-foreground">
                          / month
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {isIndia
                      ? "A straightforward monthly price in INR."
                      : "Introductory monthly price in USD."}
                  </p>

                  <ul className="mt-6 space-y-3 border-t pt-5 text-sm">
                    {[
                      "Tasks and calendar planning",
                      "Habit tracking and streaks",
                      "Daily mood check-ins",
                      "Progress and habit analytics",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2.5">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    size="lg"
                    className="mt-7 w-full"
                    nativeButton={false}
                    render={<Link href="/register" />}
                  >
                    Get started
                  </Button>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Sign up to start organizing your day.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground md:flex-row md:px-6">
          <span className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Check className="size-3" strokeWidth={3} />
            </span>
            Taskflow
          </span>
          <div className="flex items-center gap-4">
            <Link href="#features" className="hover:text-foreground">
              Features
            </Link>
            <Link href="#pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Log in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
