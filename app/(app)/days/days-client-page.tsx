"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
  count: { label: "Days", color: "var(--chart-2)" },
} satisfies ChartConfig;

const RATING_LABELS = ["Very hard", "Hard", "Okay", "Good", "Great"] as const;

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

  const distribution = [1, 2, 3, 4, 5].map((score) => ({
    label: String(score),
    count: entries.filter(
      (entry) => getDayRatingScore(entry.rating) === score
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
    <div className="flex flex-col gap-5 sm:gap-6">
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

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Check-in */}
        <FadeIn className="lg:col-span-2">
          <Card className="rounded-2xl border-border/70 shadow-sm">
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
                  <Badge variant="outline">Not logged yet</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {/* Emojis */}
              <div className="flex flex-col gap-2">
                <Label>Pick an emoji</Label>
                <div className="grid grid-cols-5 gap-2">
                  {MOODS.map((m) => {
                    const active = mood !== undefined && mood === m.value;
                    return (
                      <motion.button
                        key={m.value}
                        type="button"
                        onClick={() => updateDraft({ mood: m.value })}
                        whileTap={{ scale: 0.9 }}
                        animate={active ? { scale: 1.06 } : { scale: 1 }}
                        transition={{ type: "spring", bounce: 0.4, duration: 0.4 }}
                        className={cn(
                          "flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border p-2 text-2xl transition-colors active:scale-[0.97] sm:p-3",
                          active
                            ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                            : "bg-background hover:bg-muted"
                        )}
                        aria-pressed={active}
                        aria-label={m.label}
                      >
                        <span aria-hidden>{m.emoji}</span>
                        <span
                          className={cn(
                            "text-[11px] font-medium",
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
                <Label htmlFor="day-note">Notes</Label>
                <Textarea
                  id="day-note"
                  rows={3}
                  value={note}
                  placeholder="Enter your notes here..."
                  onChange={(e) => updateDraft({ note: e.target.value })}
                />
              </div>

              {/* Rating */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Rate your day</Label>
                  {ratingScore !== undefined && (
                    <span className="text-xs font-medium text-muted-foreground">
                      {ratingScore}/5 · {RATING_LABELS[ratingScore - 1]}
                    </span>
                  )}
                </div>
                <ToggleGroup
                  value={ratingScore === undefined ? [] : [String(ratingScore)]}
                  onValueChange={(v) => {
                    const score = Number(v[0]);
                    if (Number.isInteger(score) && score >= 1 && score <= 5) {
                      updateDraft({ rating: score as DayRating });
                    }
                  }}
                  variant="outline"
                  className="w-full gap-1"
                >
                  {RATING_LABELS.map((label, index) => (
                    <ToggleGroupItem
                      key={label}
                      value={String(index + 1)}
                      aria-label={`${index + 1} out of 5: ${label}`}
                      className="h-12 flex-1 flex-col gap-0.5 rounded-lg px-1 text-xs aria-pressed:border-primary/50 aria-pressed:bg-primary/10 aria-pressed:text-primary sm:h-14"
                    >
                      <span className="font-semibold">{index + 1}</span>
                      <span className="text-[9px] leading-3 sm:text-[10px]">
                        {label}
                      </span>
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setResetConfirmationOpen(true)}
                >
                  <Pencil /> Reset
                </Button>
                <Button
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
          <Card className="h-full rounded-2xl border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-4 text-primary" /> This month
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-around rounded-xl bg-muted/50 p-4">
                {MOODS.map((m) => {
                  const count = entries.filter((e) => e.mood === m.value).length;
                  const pct = entries.length ? (count / entries.length) * 100 : 0;
                  return (
                    <div key={m.value} className="flex flex-col items-center gap-1">
                      <span
                        className={cn(
                          "text-2xl transition-opacity",
                          mood === m.value ? "opacity-100" : "opacity-45"
                        )}
                        aria-hidden
                      >
                        {m.emoji}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
              {!entries.length && (
                <p className="text-center text-xs text-muted-foreground">
                  Your saved check-ins will appear in this summary.
                </p>
              )}

              <div className="grid grid-cols-3 items-stretch gap-2 text-center">
                <div className="flex min-h-20 flex-col items-center rounded-lg border p-3">
                  <p className="flex h-7 items-center font-heading text-xl font-semibold tabular-nums">{entries.length ? avgMood : "—"}</p>
                  <p className="mt-auto flex min-h-7 items-center text-[11px] leading-4 text-muted-foreground">Avg mood</p>
                </div>
                <div className="flex min-h-20 flex-col items-center rounded-lg border p-3">
                  <p className="flex h-7 items-center font-heading text-xl font-semibold text-primary tabular-nums">
                    {entries.length ? avgRating : "—"}
                  </p>
                  <p className="mt-auto flex min-h-7 items-center text-[11px] leading-4 text-muted-foreground">Avg rating</p>
                </div>
                <div className="flex min-h-20 flex-col items-center rounded-lg border p-3">
                  <p className="flex h-7 items-center font-heading text-xl font-semibold text-primary tabular-nums">
                    {entries.length}
                  </p>
                  <p className="mt-auto flex min-h-7 items-center text-[11px] leading-4 text-muted-foreground">Check-ins</p>
                </div>
              </div>

            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Rating graph */}
      <FadeIn delay={0.1}>
        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Day rating over time</CardTitle>
          </CardHeader>
          <CardContent className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              {chartData.length ? (
                <ChartContainer config={moodConfig} className="h-[210px] w-full sm:h-[260px]">
                  <AreaChart data={chartData} margin={{ left: 4, right: 8, top: 8 }}>
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
                      dot={{ r: 2.5, fill: "var(--chart-1)" }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[210px] items-center justify-center rounded-xl border border-dashed text-center text-sm text-muted-foreground sm:h-[260px]">
                  Save your first daily check-in to see your day-rating trend.
                </div>
              )}
            </div>

            <div className="min-w-0">
              {entries.length ? (
                <ChartContainer config={distributionConfig} className="h-[210px] w-full sm:h-[260px]">
                  <BarChart data={distribution} margin={{ left: 4, right: 8, top: 8 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 16 }}
                    />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={24} />
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Bar
                      dataKey="count"
                      fill="var(--chart-1)"
                      radius={[6, 6, 0, 0]}
                      barSize={26}
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[210px] items-center justify-center text-center text-sm text-muted-foreground sm:h-[260px]">
                  Your rating distribution will appear after your first check-in.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Recent check-ins */}
      <FadeIn delay={0.14}>
        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Recent check-ins</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2.5">
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
                      className="flex items-start gap-3 rounded-xl border p-3.5"
                    >
                      <span className="text-2xl" aria-hidden>
                        {emoji?.emoji ?? "😐"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">
                            {entry.date === today
                              ? `Today · ${longDateLabel(entry.date)}`
                              : longDateLabel(entry.date)}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {entry.checkedInAt
                              ? new Date(entry.checkedInAt).toLocaleTimeString(
                                  undefined,
                                  { hour: "numeric", minute: "2-digit" }
                                )
                              : "Time unavailable"}
                          </span>
                          <Badge
                            variant="outline"
                            className="border-primary/30 bg-primary/5 text-primary"
                          >
                            <Star />
                            {score}/5 · {RATING_LABELS[score - 1]}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {entry.note || "No notes for this day."}
                        </p>
                      </div>
                    </motion.li>
                  );
                })}
            </ul>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
