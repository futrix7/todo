"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Check,
  Flame,
  Smile,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EASE } from "@/components/motion-fade";

/** Shared split-screen shell for /login and /register. */
export function AuthLayout({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-16">
        <Link href="/" className="flex items-center gap-2 self-start">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Check className="size-4" strokeWidth={3} />
          </span>
          <span className="font-heading text-sm font-semibold tracking-tight">
            Taskflow
          </span>
        </Link>

        <div className="flex flex-1 items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="w-full max-w-sm"
          >
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {title}
            </h1>
            <div className="mt-6">{children}</div>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {footer}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Decorative side */}
      <div className="relative hidden overflow-hidden border-l bg-primary/[0.03] lg:block">
        <div className="relative flex h-full flex-col items-center justify-center gap-6 p-12">
          <motion.div
            initial={{ opacity: 0, y: 24, rotate: -3 }}
            animate={{ opacity: 1, y: 0, rotate: -3 }}
            transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
            className="w-72 rounded-xl bg-card p-4 shadow-xl ring-1 ring-foreground/10"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Build a routine</span>
              <Flame className="size-4 text-primary" />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Small, consistent actions make progress easier to see.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24, rotate: 3 }}
            animate={{ opacity: 1, y: 0, rotate: 3 }}
            transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
            className="w-72 rounded-xl bg-card p-4 shadow-xl ring-1 ring-foreground/10"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">How was your day?</span>
              <Smile className="size-4 text-primary" />
            </div>
            <div className="mt-3 flex justify-between text-2xl">
              <span>😡</span>
              <span>😕</span>
              <span>😐</span>
              <span>🙂</span>
              <span>😄</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <Badge variant="outline">
              <Flame className="text-primary" /> Tasks · Streaks · Days ·
              Analytics
            </Badge>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
