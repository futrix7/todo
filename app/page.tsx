"use client";
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
  },
  {
    icon: CalendarClock,
    title: "Advanced scheduling",
  },
  {
    icon: Flame,
    title: "Streaks & habits",
  },
  {
    icon: Smile,
    title: "Daily check-ins",
  },
  {
    icon: BarChart3,
    title: "Analytics",
  },
  {
    icon: UserCog,
    title: "Profile & settings",
  },
];

function PreviewCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
    >
      <div className="rounded-2xl bg-card p-5 shadow-xl ring-1 ring-foreground/10 dark:shadow-none">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ListTodo className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">Your daily overview</p>
            <p className="text-xs text-muted-foreground">
              A clear space for your plans and progress
            </p>
          </div>
        </div>
        <div className="mt-5 flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-5 text-center">
          <ListChecks className="size-7 text-muted-foreground/70" />
          <p className="mt-3 text-sm font-medium">Your day, at a glance</p>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
            Add your first task to see your schedule, check-ins, and progress here.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Check className="size-4" strokeWidth={3} />
            </span>
            <span className="font-heading text-sm font-semibold tracking-tight">
              Taskflow
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>
              Login
            </Button>
            <Button nativeButton={false} render={<Link href="/register" />}>Register</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:px-6 md:py-24">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <Badge variant="secondary" className="mb-4">
              <Sparkles /> Your daily productivity companion
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
            className="font-heading text-4xl font-semibold tracking-tight text-balance md:text-5xl"
          >
            Turn your to-do list into a daily streak.
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24, ease: EASE }}
            className="mt-6 flex flex-wrap gap-3"
          >
            <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
              Get started free
            </Button>
            <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/login" />}>
              Log in
            </Button>
          </motion.div>

        </div>

        <PreviewCard />
      </section>

      {/* Features */}
      <section id="features" className="border-t bg-muted/30 py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center">
            <p className="mb-2 text-xs font-semibold tracking-widest text-primary uppercase">
              Features
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
                  <div className="group h-full rounded-xl bg-card p-5 ring-1 ring-foreground/10 transition-shadow hover:shadow-lg">
                    <span className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="size-4.5" />
                    </span>
                    <h3 className="font-heading text-base font-medium">
                      {feature.title}
                    </h3>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* …and more — simple section header with login / register */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
          <Reveal>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl">
              …and much more on the way
            </h2>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
                Register
              </Button>
              <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/login" />}>
                Login
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground md:flex-row md:px-6">
          <span className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Check className="size-3" strokeWidth={3} />
            </span>
            Taskflow
          </span>
          <span>Built with Next.js, shadcn/ui and Framer Motion.</span>
        </div>
      </footer>
    </div>
  );
}
