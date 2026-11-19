"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Pencil,
  Save,
  SmilePlus,
  Star,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { shortLabel } from "@/lib/date-utils";
import { longDateLabel } from "@/lib/date-utils";
import { MOODS } from "@/lib/task-options";
import { getDayRatingScore, type DayEntry, type DayRating } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { FadeIn, EASE } from "@/components/motion-fade";
import { useTodayKey } from "@/lib/use-local-storage";
import {
  isTaskDataSchemaUnavailable,
  isSupabaseConfigured,
  loadDayEntries,
  saveDayEntry,
} from "@/lib/supabase/task-data";
import { useSupabaseDataStatus } from "@/components/supabase-data-provider";
import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";

const moodConfig = {
  rating: { label: "Day rating", color: "var(--chart-1)" },
} satisfies ChartConfig;

const distributionConfig = {
  count: { label: "Days", color: "var(--chart-1)" },
} satisfies ChartConfig;

const DAY_MS = 86_400_000;

/** Compact, human date for the recent check-in list. */
function recentDateLabel(key: string, today: string): string {
  const date = new Date(`${key}T12:00:00`);
  const current = new Date(`${today}T12:00:00`);
  const dayDiff = Math.round((current.getTime() - date.getTime()) / DAY_MS);
  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== current.getFullYear()
      ? { year: "numeric" }
      : {}),
  }).format(date);
}

export default function DaysClientPage() {
  const { user } = useAuth();
  const {
    schemaUnavailable,
    reportError,
    reportSchemaUnavailable,
    reportConfigurationError,
  } = useSupabaseDataStatus();
  const today = useTodayKey();
  const [entries, setEntries] = React.useState<DayEntry[]>([]);
  const [loadedUserId, setLoadedUserId] = React.useState<string | null>(null);
  const [resetConfirmationOpen, setResetConfirmationOpen] = React.useState(false);
  // Local edits live in a draft until the user saves the check-in.
  const [draft, setDraft] = React.useState<{
    date: string;
    mood?: number;
    note: string;
    rating?: DayRating;
  } | null>(null);

  React.useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return;
    const userId = user.id;
    if (schemaUnavailable || isTaskDataSchemaUnavailable()) return;

    let active = true;
    loadDayEntries(userId)
      .then((remoteEntries) => {
        if (!active) return;
        setEntries(remoteEntries);
        setLoadedUserId(userId);
      })
      .catch((error: unknown) => {
        if (!active) return;
        reportError(error);
        setLoadedUserId(userId);
      });

    return () => {
      active = false;
    };
  }, [user?.id, setEntries, reportError, schemaUnavailable]);

  const todaysEntry = entries.find((e) => e.date === today);
  const todaysDraft = draft?.date === today ? draft : null;
  const mood = todaysDraft?.mood ?? todaysEntry?.mood;
  const note = todaysDraft?.note ?? todaysEntry?.note ?? "";
  const rating = todaysDraft?.rating ?? todaysEntry?.rating;
  const saved = Boolean(todaysEntry) && todaysDraft === null;

  const updateDraft = (patch: Partial<{ mood: number; note: string; rating: DayRating }>) =>
    setDraft((previous) => {
      const current = previous?.date === today ? previous : null;
      return {
        date: today,
        mood: current?.mood ?? todaysEntry?.mood,
        note: current?.note ?? todaysEntry?.note ?? "",
        rating: current?.rating ?? todaysEntry?.rating,
        ...patch,
      };
    });

  const chartData = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({
      day: shortLabel(entry.date),
      rating: getDayRatingScore(entry.rating),
    }));

  const distribution = MOODS.map((mood, index) => ({
    label: mood.emoji,
    name: mood.label,
    count: entries.filter(
      (entry) => getDayRatingScore(entry.rating) === index + 1
    ).length,
  }));

  const avgMood = entries.length
    ? (entries.reduce((sum, e) => sum + e.mood, 0) / entries.length).toFixed(1)
    : "0";
  const avgRating = entries.length
    ? (
        entries.reduce(
          (sum, entry) => sum + getDayRatingScore(entry.rating),
          0
        ) / entries.length
      ).toFixed(1)
    : "0";
  const ratingScore =
    rating === undefined ? undefined : getDayRatingScore(rating);
  const selectedScore = ratingScore ?? mood;
  const selectedMood = MOODS.find((item) => item.value === selectedScore);

  async function handleSave() {
    if (!today || mood === undefined || rating === undefined) {
      toast.error("Choose a mood and a rating before saving.");
      return;
    }
    if (isTaskDataSchemaUnavailable()) {
      reportSchemaUnavailable();
      return;
    }
    if (!isSupabaseConfigured) {
      reportConfigurationError();
      return;
    }

    const entry: DayEntry = {
      id: todaysEntry?.id ?? `d-${today}`,
      date: today,
      mood,
      note,
      rating,
      checkedInAt: new Date().toISOString(),
    };
    try {
      if (!user?.id) throw new Error("A valid Supabase session is required.");
      await saveDayEntry(user.id, entry);
    } catch (error) {
      reportError(error);
      return;
    }
    setEntries((prev) => {
      const exists = prev.some((e) => e.date === today);
      if (exists) return prev.map((e) => (e.date === today ? entry : e));
      return [...prev, entry];
    });
    setDraft(null);
    toast.success("Today's check-in saved.");
  }

  if (isSupabaseConfigured && !user?.id) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
        A valid Supabase session is required to load mood check-ins.
      </div>
    );
  }

  if (
    isSupabaseConfigured &&
    loadedUserId !== user?.id &&
    !schemaUnavailable
  ) {
    return <PageLoadingSkeleton label="Loading mood check-ins" variant="days" />;
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 sm:gap-6">
      <header className="flex flex-col gap-4 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between sm:pb-5">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 sm:size-12">
            <SmilePlus className="size-5 sm:size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Daily reflection
            </p>
            <h1 className="mt-0.5 font-heading text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
              Days
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Make space to check in, notice your patterns, and see how your days change over time.
            </p>
          </div>
        </div>
        {today && (
          <div className="flex w-fit shrink-0 items-center gap-2.5 self-start rounded-xl border border-border/70 bg-card/80 px-3 py-2 shadow-sm sm:self-auto sm:px-4 sm:py-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <CalendarDays className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Today
              </p>
              <p className="text-sm font-semibold leading-tight">
                {longDateLabel(today)}
              </p>
            </div>
          </div>
        )}
      </header>

      <Dialog
        open={resetConfirmationOpen}
        onOpenChange={setResetConfirmationOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset today&apos;s check-in?</DialogTitle>
            <DialogDescription>
              Your unsaved mood, notes, and rating will be discarded. Saved
              check-ins will not be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetConfirmationOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDraft(null);
                setResetConfirmationOpen(false);
              }}
            >
              Reset check-in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3 lg:items-start">
        {/* Check-in */}
        <FadeIn className="lg:col-span-2">
          <Card className="rounded-2xl border-border/70 bg-card/80 shadow-sm">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <SmilePlus className="size-4 text-primary" /> How is your
                    day?
                  </CardTitle>
                  {today && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {longDateLabel(today)}
                    </p>
                  )}
                </div>
                {saved ? (
                  <Badge variant="secondary">
                    <CheckCircle2 className="text-primary" /> Checked in
                  </Badge>
                ) : todaysDraft ? (
                  <Badge variant="outline">Unsaved changes</Badge>
                ) : (
                  <Badge variant="outline">Not checked in</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <Label className="text-sm font-medium">Rate your day</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Choose the emoji that best matches how today felt.
                    </p>
                  </div>
                  {selectedMood && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary ring-1 ring-primary/20"
                      aria-live="polite"
                    >
                      <span aria-hidden>{selectedMood.emoji}</span>
                      {selectedMood.label}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
                  {MOODS.map((m) => {
                    const active = selectedScore === m.value;
                    return (
                      <motion.button
                        key={m.value}
                        type="button"
                        onClick={() =>
                          updateDraft({ mood: m.value, rating: m.value })
                        }
                        whileTap={{ scale: 0.9 }}
                        animate={active ? { scale: 1.04 } : { scale: 1 }}
                        transition={{ type: "spring", bounce: 0.4, duration: 0.4 }}
                        className={cn(
                          "flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border p-1.5 transition-colors active:scale-[0.97] sm:min-h-[88px] sm:gap-1.5 sm:p-3",
                          active
                            ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/30"
                            : "border-border/80 bg-background hover:border-foreground/20 hover:bg-muted/60"
                        )}
                        aria-pressed={active}
                        aria-label={m.label}
                      >
                        <span
                          aria-hidden
                          className="text-xl leading-none sm:text-2xl"
                        >
                          {m.emoji}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-medium leading-tight sm:text-xs",
                            active ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {m.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="day-note" className="text-sm font-medium">Notes</Label>
                <Textarea
                  id="day-note"
                  rows={4}
                  value={note}
                  placeholder="What stood out today? Wins, blockers, or something to remember."
                  onChange={(e) => updateDraft({ note: e.target.value })}
                  className="min-h-[112px] resize-y sm:min-h-[128px]"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
                <Button
                  variant="ghost"
                  className="w-full sm:w-auto"
                  onClick={() => setResetConfirmationOpen(true)}
                >
                  <Pencil /> Reset
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  onClick={handleSave}
                  disabled={!today || mood === undefined || rating === undefined}
                >
                  <Save /> {todaysEntry ? "Update check-in" : "Save check-in"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Summary */}
        <FadeIn delay={0.08}>
          <Card className="rounded-2xl border-border/70 bg-card/80 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-primary" /> Check-in overview
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Your saved reflections
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {entries.length} {entries.length === 1 ? "day" : "days"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-5 gap-1 rounded-xl bg-muted/50 p-2.5 sm:p-3">
                {MOODS.map((m) => {
                  const count = entries.filter((e) => e.mood === m.value).length;
                  const pct = entries.length ? (count / entries.length) * 100 : 0;
                  return (
                    <div
                      key={m.value}
                      className="flex min-w-0 flex-col items-center gap-1"
                    >
                      <span
                        className="text-xl leading-none sm:text-2xl"
                        aria-hidden
                      >
                        {m.emoji}
                      </span>
                      <span className="text-[11px] font-semibold tabular-nums">
                        {pct.toFixed(0)}%
                      </span>
                      <span className="max-w-full truncate text-[10px] text-muted-foreground">
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              {!entries.length && (
                <p className="text-center text-sm text-muted-foreground">
                  Save your first check-in to start this overview.
                </p>
              )}

              <div className="grid grid-cols-3 items-stretch gap-2 text-center sm:gap-2.5">
                <div className="flex flex-col items-center justify-center rounded-xl border border-border/70 bg-background/40 px-2 py-3">
                  <p className="font-heading text-lg font-semibold tabular-nums sm:text-2xl">
                    {entries.length ? avgMood : "—"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Avg mood
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-xl border border-border/70 bg-background/40 px-2 py-3">
                  <p className="font-heading text-lg font-semibold text-primary tabular-nums sm:text-2xl">
                    {entries.length ? avgRating : "—"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Avg rating
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center rounded-xl border border-border/70 bg-background/40 px-2 py-3">
                  <p className="font-heading text-lg font-semibold text-primary tabular-nums sm:text-2xl">
                    {entries.length}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Check-ins
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Rating history */}
      <FadeIn delay={0.1}>
        <Card className="rounded-2xl border-border/70 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle>Rating history</CardTitle>
            <CardDescription>
              Your daily score and how your ratings are spread across check-ins.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            {chartData.length ? (
              <div className="grid min-w-0 gap-5 sm:gap-6 lg:grid-cols-3">
                <div className="min-w-0 lg:col-span-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Daily score</p>
                    <span className="text-[11px] text-muted-foreground">
                      1–5 scale
                    </span>
                  </div>
                  <ChartContainer
                    config={moodConfig}
                    className="h-[200px] w-full sm:h-[240px]"
                  >
                    <AreaChart
                      data={chartData}
                      margin={{ left: 4, right: 8, top: 8 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="day"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tick={{ fontSize: 11 }}
                        minTickGap={24}
                      />
                      <YAxis
                        domain={[1, 5]}
                        ticks={[1, 2, 3, 4, 5]}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        width={32}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="rating"
                        stroke="var(--chart-1)"
                        strokeWidth={2.5}
                        fill="var(--chart-1)"
                        fillOpacity={0.12}
                        dot={
                          chartData.length <= 31
                            ? { r: 2.5, fill: "var(--chart-1)" }
                            : false
                        }
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ChartContainer>
                </div>

                <div className="min-w-0">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Rating mix</p>
                    <span className="text-[11px] text-muted-foreground">
                      Days per mood
                    </span>
                  </div>
                  <ChartContainer
                    config={distributionConfig}
                    className="h-[200px] w-full sm:h-[240px]"
                  >
                    <BarChart
                      data={distribution}
                      margin={{ left: 0, right: 4, top: 8 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 15 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                        width={28}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={(value) => {
                              const mood = MOODS.find(
                                (item) => item.emoji === value
                              );
                              return mood ? `${mood.emoji} ${mood.label}` : value;
                            }}
                          />
                        }
                      />
                      <Bar
                        dataKey="count"
                        fill="var(--chart-1)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={36}
                      />
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/20 px-5 py-8 text-center">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BarChart3 className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold">No rating history yet</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Save your first check-in and your daily scores will show up
                    here.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {/* Recent check-ins */}
      <FadeIn delay={0.14}>
        <Card className="rounded-2xl border-border/70 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle>Recent check-ins</CardTitle>
            <CardDescription>
              Your latest reflections, newest first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {entries.length ? (
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {[...entries]
                .sort((a, b) =>
                  b.date.localeCompare(a.date) ||
                  (b.checkedInAt ?? "").localeCompare(a.checkedInAt ?? "")
                )
                .slice(0, 6)
                .map((entry, i) => {
                  const emoji = MOODS.find((m) => m.value === entry.mood);
                  const score = getDayRatingScore(entry.rating);
                  return (
                    <motion.li
                      key={entry.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.05, ease: EASE }}
                      className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/40 p-3.5 transition-colors hover:bg-muted/40 sm:p-4"
                    >
                      <span
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted/60 text-xl sm:size-11 sm:text-2xl"
                        aria-hidden
                      >
                        {emoji?.emoji ?? "😐"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-medium">
                            {recentDateLabel(entry.date, today || entry.date)}
                          </p>
                          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                            {entry.checkedInAt
                              ? new Date(entry.checkedInAt).toLocaleTimeString(
                                  undefined,
                                  { hour: "numeric", minute: "2-digit" }
                                )
                              : "Time unavailable"}
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="border-primary/30 bg-primary/5 text-primary"
                          >
                            <Star />
                            {score}/5 · {MOODS[score - 1].label}
                          </Badge>
                        </div>
                        <p className="mt-1.5 break-words text-sm leading-relaxed text-muted-foreground">
                          {entry.note || "No notes for this day."}
                        </p>
                      </div>
                    </motion.li>
                  );
                })}
            </ul>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/20 px-5 py-8 text-center">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <CalendarDays className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold">No check-ins yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your saved reflections will appear here as you check in.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
