"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  Pencil,
  Save,
  SmilePlus,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { shortLabel } from "@/lib/date-utils";
import { longDateLabel } from "@/lib/date-utils";
import { MOODS } from "@/lib/task-options";
import type { DayEntry, DayRating } from "@/lib/types";
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

const moodConfig = {
  mood: { label: "Mood", color: "var(--chart-1)" },
} satisfies ChartConfig;

const distributionConfig = {
  count: { label: "Days", color: "var(--chart-2)" },
} satisfies ChartConfig;

const RATING_META: Record<DayRating, { label: string; className: string }> = {
  up: {
    label: "Up",
    className: "border-primary/30 text-primary bg-primary/5",
  },
  down: {
    label: "Down",
    className: "border-primary/30 text-primary bg-primary/5",
  },
};

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

  const chartData = [...entries].sort((a, b) => a.date.localeCompare(b.date)).map((e) => ({
    day: shortLabel(e.date),
    mood: e.mood,
  }));

  const distribution = MOODS.map((m) => ({
    label: m.emoji,
    count: entries.filter((e) => e.mood === m.value).length,
  }));

  const upDays = entries.filter((e) => e.rating === "up").length;
  const downDays = entries.length - upDays;
  const avgMood = entries.length
    ? (entries.reduce((sum, e) => sum + e.mood, 0) / entries.length).toFixed(1)
    : "0";

  async function handleSave() {
    if (mood === undefined || rating === undefined) {
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
    return (
      <div className="flex min-h-48 items-center justify-center" role="status">
        <SmilePlus className="size-6 animate-pulse text-primary" />
        <span className="sr-only">Loading mood check-ins</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
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
          <Card>
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
                <Label>How would you rate your day?</Label>
                <ToggleGroup
                  value={rating ? [rating] : []}
                  onValueChange={(v) => {
                    if (v[0]) updateDraft({ rating: v[0] as DayRating });
                  }}
                  variant="outline"
                  className="w-full"
                >
                  <ToggleGroupItem
                    value="up"
                    className="h-9 flex-1 gap-2 aria-pressed:border-primary/50 aria-pressed:bg-primary/10 aria-pressed:text-primary sm:h-10"
                  >
                    <ThumbsUp /> Up
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="down"
                    className="h-9 flex-1 gap-2 aria-pressed:border-primary/50 aria-pressed:bg-primary/10 aria-pressed:text-primary sm:h-10"
                  >
                    <ThumbsDown /> Down
                  </ToggleGroupItem>
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
                  disabled={mood === undefined || rating === undefined}
                >
                  <Save /> {todaysEntry ? "Update check-in" : "Save check-in"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Summary */}
        <FadeIn delay={0.08}>
          <Card className="h-full">
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
                    {upDays}
                  </p>
                  <p className="mt-auto flex min-h-7 items-center text-[11px] leading-4 text-muted-foreground">Up days</p>
                </div>
                <div className="flex min-h-20 flex-col items-center rounded-lg border p-3">
                  <p className="flex h-7 items-center font-heading text-xl font-semibold text-primary tabular-nums">
                    {downDays}
                  </p>
                  <p className="mt-auto flex min-h-7 items-center text-[11px] leading-4 text-muted-foreground">Down days</p>
                </div>
              </div>

            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Mood graph */}
      <FadeIn delay={0.1}>
        <Card>
          <CardHeader>
            <CardTitle>Mood over time</CardTitle>
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
                      tickFormatter={(v) => MOODS[v - 1]?.emoji ?? ""}
                      tickLine={false}
                      axisLine={false}
                      width={32}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="mood"
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
                  Save your first daily check-in to see your mood trend.
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
                  Your mood distribution will appear after your first check-in.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Recent check-ins */}
      <FadeIn delay={0.14}>
        <Card>
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
                  const meta = RATING_META[entry.rating];
                  const emoji = MOODS.find((m) => m.value === entry.mood);
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
                          <Badge variant="outline" className={meta.className}>
                            {entry.rating === "up" ? (
                              <ThumbsUp />
                            ) : (
                              <ThumbsDown />
                            )}
                            {meta.label}
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
