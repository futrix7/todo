import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Flame,
  LifeBuoy,
  ListChecks,
  Settings,
} from "lucide-react";

import { FadeIn } from "@/components/motion-fade";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const instant = false;

const FAQS = [
  {
    question: "How do I add or update a task?",
    answer:
      "Open Tasks and select Add task. To update a task later, open its actions menu and choose edit.",
  },
  {
    question: "How do I track a streak?",
    answer:
      "Turn on streak tracking when creating or editing a task, then complete it regularly. Your current and best streaks are shown on the Streaks page.",
  },
  {
    question: "Where can I see my activity?",
    answer:
      "Open Analytics from your profile to review your task activity and progress.",
  },
  {
    question: "How do I change my profile or preferences?",
    answer:
      "Use Edit profile for your name and bio, or open Settings to manage your account and app preferences.",
  },
];

const SHORTCUTS = [
  { href: "/tasks", label: "Go to tasks", icon: ListChecks },
  { href: "/streak", label: "View streaks", icon: Flame },
  { href: "/profile/analytics", label: "Open analytics", icon: BarChart3 },
  { href: "/profile/settings", label: "Open settings", icon: Settings },
];

export default function HelpPage() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-5 sm:gap-6">
      <FadeIn className="flex items-center gap-3">
        <Link
          href="/profile"
          aria-label="Back to profile"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border bg-background text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ArrowLeft />
        </Link>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LifeBuoy className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
              Help & support
            </h2>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.06}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" />
              Frequently asked questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            {FAQS.map((faq, index) => (
              <details
                key={faq.question}
                className="group border-b py-3 last:border-b-0 last:pb-0"
                open={index === 0}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium marker:hidden">
                  {faq.question}
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-90" />
                </summary>
                <p className="mt-2 pr-6 text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </details>
            ))}
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.12}>
        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-2xl border bg-muted/20 px-3 sm:px-4">
              {SHORTCUTS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="group -mx-3 flex min-h-14 items-center gap-3 border-b px-3 transition-colors duration-200 last:border-b-0 hover:bg-primary/5 active:bg-primary/10 sm:-mx-4 sm:px-4"
                >
                  <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
                    <Icon className="size-4" />
                  </span>
                  <span className="flex-1 text-sm font-medium">{label}</span>
                  <ChevronRight className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
