"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  Archive,
  ArchiveRestore,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  Flame,
  Minus,
  Pencil,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { isHabitScheduledOn as isScheduledOn } from "@/lib/habit-analytics";
import type {
  Habit,
  HabitColor,
  HabitLog,
  HabitLogStatus,
} from "@/lib/habits";
import { dateKey } from "@/lib/date-utils";
import { useAuth } from "@/lib/auth";
import { useTodayKey } from "@/lib/use-local-storage";
import {
  isMissingHabitDataSchemaError,
  loadHabitLogs,
  loadHabits,
  removeHabitLog,
  saveHabit as persistHabit,
  saveHabitLog,
  setHabitArchived,
} from "@/lib/supabase/habit-data";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { useSupabaseDataStatus } from "@/components/supabase-data-provider";
import { HabitEditorDialog, type HabitFormValues } from "@/components/habit-editor-dialog";
import { HabitIcon } from "@/components/habit-icon";
import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

type HabitGroup = "Morning" | "Afternoon" | "Evening" | "Anytime";
type HabitFilter = "all" | "remaining" | "at-risk";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const COLOR_STYLES: Record<
  HabitColor,
  { icon: string; progress: string }
> = {
  gray: {
    icon: "border-slate-400/40 bg-slate-400/15 text-slate-600 dark:text-slate-300",
    progress: "bg-slate-500",
  },
  teal: {
    icon: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
    progress: "bg-teal-500",
  },
  blue: {
    icon: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    progress: "bg-blue-500",
  },
  violet: {
    icon: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    progress: "bg-violet-500",
  },
  amber: {
    icon: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    progress: "bg-amber-500",
  },
  rose: {
    icon: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    progress: "bg-rose-500",
  },
};

function localDate(key: string) {
  return new Date(`${key}T12:00:00`);
}

function datesForPeriod(today: string, count: number) {
  if (!today) return [];
  const current = localDate(today);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(current);
    date.setDate(current.getDate() - (count - index - 1));
    return dateKey(date);
  });
}

function datesForMonth(month: string) {
  if (!month) return [];
  const [year, monthNumber] = month.split("-").map(Number);
  const count = new Date(year, monthNumber, 0).getDate();
  return Array.from({ length: count }, (_, index) =>
    dateKey(new Date(year, monthNumber - 1, index + 1, 12))
  );
}

function shiftMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const shifted = new Date(year, monthNumber - 1 + amount, 1, 12);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}`;
}

function scheduleLabel(habit: Habit) {
  if (habit.frequency === "daily") return "Every day";
  if (habit.frequency === "weekdays") return "Weekdays";
  if (habit.frequency === "monthly") return "Monthly";
  return habit.scheduleDays.map((day) => DAY_NAMES[day]).join(" · ");
}

function dateRangeLabel(habit: Habit) {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  const start = localDate(habit.startedOn).toLocaleDateString(undefined, options);
  const end = habit.endedOn
    ? localDate(habit.endedOn).toLocaleDateString(undefined, {
        ...options,
        year:
          habit.startedOn.slice(0, 4) === habit.endedOn.slice(0, 4)
            ? undefined
            : "numeric",
      })
    : "Ongoing";
  return `${start} – ${end}`;
}

function habitCardKey(habit: Habit, log?: HabitLog) {
  return `${habit.id}-${log?.completedOn ?? ""}-${log?.value ?? ""}-${log?.status ?? ""}`;
}

function habitGroup(habit: Habit): HabitGroup {
  if (!habit.startTime) return "Anytime";
  const hour = Number(habit.startTime.split(":")[0]);
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

function streakFor(habit: Habit, logs: HabitLog[], today: string) {
  if (!today || habit.startedOn > today) return { current: 0, longest: 0 };
  const loggedDates = new Set(
    logs
      .filter(
        (log) =>
          log.habitId === habit.id &&
          (log.status === "completed" || log.status === "skipped")
      )
      .map((log) => log.completedOn)
  );
  const date = localDate(habit.startedOn);
  const end = localDate(
    habit.endedOn && habit.endedOn < today ? habit.endedOn : today
  );
  let current = 0;
  let longest = 0;
  let run = 0;

  while (date <= end) {
    const key = dateKey(date);
    if (isScheduledOn(habit, key)) {
      if (loggedDates.has(key)) {
        run++;
        longest = Math.max(longest, run);
      } else if (key !== today) {
        run = 0;
      }
      if (key < today) current = run;
    }
    date.setDate(date.getDate() + 1);
  }
  if (habit.endedOn && habit.endedOn < today) current = 0;
  else if (loggedDates.has(today) && isScheduledOn(habit, today)) current = run;
  return { current, longest };
}

function HabitCard({
  habit,
  log,
  streak,
  saving,
  archived = false,
  compact = false,
  onComplete,
  onProgress,
  onSkip,
  onEdit,
  onArchive,
}: {
  habit: Habit;
  log?: HabitLog;
  streak: number;
  saving: boolean;
  archived?: boolean;
  compact?: boolean;
  onComplete: () => void;
  onProgress: (value: number) => void;
  onSkip: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const [measureValue, setMeasureValue] = React.useState(
    log?.value ? String(log.value) : ""
  );
  const color = COLOR_STYLES[habit.color];
  const value = log?.status === "skipped" ? 0 : log?.value ?? 0;
  const complete = log?.status === "completed";
  const skipped = log?.status === "skipped";
  const percentage = Math.min(100, (value / habit.targetValue) * 100);
  const isQuantified = habit.type === "count" || habit.type === "measure";

  function handleMeasureSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(measureValue);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a value greater than zero.");
      return;
    }
    onProgress(amount);
  }

  if (compact) {
    return (
      <article
        className={`overflow-x-auto border-b border-border/70 px-2 py-3 transition-colors last:border-b-0 sm:px-4 ${
          complete
            ? "bg-primary/[0.035]"
            : skipped
              ? "bg-muted/35"
              : "hover:bg-muted/20"
        }`}
      >
        <div className="flex min-w-max items-center gap-3">
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${color.icon}`}
            aria-hidden="true"
          >
            <HabitIcon value={habit.emoji || "sparkles"} className="size-4.5" />
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h3
              title={habit.name}
              className="max-w-48 truncate font-heading text-sm font-semibold tracking-tight"
            >
              {habit.name}
            </h3>
            {habit.type !== "yes_no" && (
              <Badge variant="secondary" className="h-5 shrink-0 text-[11px] capitalize">
                {habit.type.replace("_", " ")}
              </Badge>
            )}
            <span className="max-w-56 truncate text-xs text-muted-foreground">
              <span className="capitalize">{habit.category}</span>
              {" · "}
              {scheduleLabel(habit)}
              {habit.startTime ? ` · ${habit.startTime}` : ""}
            </span>
            {streak > 0 && (
              <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <Flame className="size-3.5 text-primary" />
                {streak} day streak
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {habit.type === "count" && (
              <>
                <span className="text-xs font-medium tabular-nums text-muted-foreground">
                  {value}/{habit.targetValue}
                  {habit.unit ? ` ${habit.unit}` : ""}
                </span>
                {!complete && (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-8 rounded-lg"
                    aria-label={`Add one to ${habit.name}`}
                    title="Add one"
                    disabled={saving}
                    onClick={() => onProgress(Math.min(habit.targetValue, value + 1))}
                  >
                    <Plus />
                  </Button>
                )}
                {value > 0 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-8 rounded-lg"
                    aria-label={`Remove one from ${habit.name}`}
                    title="Remove one"
                    disabled={saving}
                    onClick={() => onProgress(Math.max(0, value - 1))}
                  >
                    <Minus />
                  </Button>
                )}
              </>
            )}
            {habit.type === "measure" && (
              <form
                className="flex items-center gap-1.5"
                onSubmit={handleMeasureSubmit}
              >
                <Input
                  type="number"
                  min="0.1"
                  step="any"
                  aria-label={`${habit.name} progress`}
                  className="h-8 w-20 rounded-lg bg-muted/40 px-2"
                  placeholder={habit.unit || "Value"}
                  value={measureValue}
                  onChange={(event) => setMeasureValue(event.target.value)}
                  disabled={saving}
                />
                <Button type="submit" size="sm" className="h-8 px-2.5" disabled={saving}>
                  <Check />
                  Save
                </Button>
              </form>
            )}
            {(habit.type === "yes_no" || habit.type === "quit") && (
              <Button
                type="button"
                size="sm"
                variant={complete ? "secondary" : "outline"}
                className="h-8 rounded-lg px-2.5"
                disabled={saving || skipped}
                aria-pressed={complete}
                onClick={onComplete}
              >
                {complete ? <Check /> : <CircleCheck />}
                {complete
                  ? habit.type === "quit"
                    ? "On track"
                    : "Done"
                  : habit.type === "quit"
                    ? "Stay on track"
                    : "Complete"}
              </Button>
            )}
            {complete && habit.type === "count" && (
              <Badge variant="secondary" className="h-7 px-2 text-xs">
                <Check />
                Complete
              </Badge>
            )}
            {skipped ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-lg px-2.5"
                disabled={saving}
                onClick={onSkip}
              >
                Undo skip
              </Button>
            ) : !complete ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 rounded-lg px-2.5 text-muted-foreground"
                disabled={saving}
                onClick={onSkip}
              >
                <CalendarDays />
                Skip today
              </Button>
            ) : null}
            {saving && (
              <span className="text-xs text-muted-foreground" role="status">
                Saving…
              </span>
            )}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={`Edit ${habit.name}`}
              title="Edit habit"
              onClick={onEdit}
            >
              <Pencil />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={`Archive ${habit.name}`}
              title="Archive habit"
              disabled={saving}
              onClick={onArchive}
            >
              <Archive />
            </Button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`border-b border-border/70 px-2 py-4 transition-colors last:border-b-0 sm:px-4 ${
        archived
          ? "bg-muted/30"
          : complete
            ? "bg-primary/[0.035]"
            : skipped
              ? "bg-muted/35"
              : "hover:bg-muted/20"
      }`}
    >
      <div className="flex items-start gap-4">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${color.icon}`}
          aria-hidden="true"
        >
          <HabitIcon value={habit.emoji || "sparkles"} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-heading text-sm font-semibold leading-tight tracking-tight break-words">
              {habit.name}
            </h3>
            {habit.type !== "yes_no" && (
              <Badge variant="secondary" className="h-5 text-[11px] capitalize">
                {habit.type.replace("_", " ")}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="capitalize">{habit.category}</span>
            {" · "}
            {scheduleLabel(habit)}
          </p>
          {habit.notes && (
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
              {habit.notes}
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {habit.startTime && (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-3.5" />
                {habit.startTime}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {dateRangeLabel(habit)}
            </span>
            {streak > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Flame className="size-3.5 text-primary" />
                {streak} day streak
              </span>
            )}
            {skipped && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <CalendarDays className="size-3.5" />
                Skipped today
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={`Edit ${habit.name}`}
            title="Edit habit"
            onClick={onEdit}
          >
            <Pencil />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={archived ? `Restore ${habit.name}` : `Archive ${habit.name}`}
            title={archived ? "Restore habit" : "Archive habit"}
            disabled={saving}
            onClick={onArchive}
          >
            {archived ? <ArchiveRestore /> : <Archive />}
          </Button>
        </div>
      </div>

      {isQuantified && (
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">
              {habit.type === "count" ? "Today’s count" : "Today’s progress"}
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {value} / {habit.targetValue}
              {habit.unit ? ` ${habit.unit}` : ""}
            </span>
          </div>
          <Progress
            value={percentage}
            aria-label={`${habit.name} progress`}
            className="w-full gap-0"
            indicatorClassName={color.progress}
          />
        </div>
      )}

      {!archived && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {habit.type === "count" && (
              <>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="h-12 min-w-32 rounded-xl bg-muted/40 px-4"
                  disabled={saving || complete}
                  onClick={() => onProgress(Math.min(habit.targetValue, value + 1))}
                >
                  {complete ? <Check /> : <Plus />}
                  {complete ? "Target reached" : "Add 1"}
                </Button>
                {value > 0 && (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-12 rounded-xl bg-muted/40"
                    aria-label={`Remove one from ${habit.name}`}
                    disabled={saving}
                    onClick={() => onProgress(Math.max(0, value - 1))}
                  >
                    <Minus />
                  </Button>
                )}
              </>
            )}
            {habit.type === "measure" && (
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={handleMeasureSubmit}
              >
                <Input
                  type="number"
                  min="0.1"
                  step="any"
                  aria-label={`${habit.name} progress`}
                  className="h-12 w-28 rounded-xl bg-muted/40 px-4"
                  placeholder={habit.unit || "Value"}
                  value={measureValue}
                  onChange={(event) => setMeasureValue(event.target.value)}
                  disabled={saving}
                />
                <Button type="submit" size="lg" className="h-12 rounded-xl px-5" disabled={saving}>
                  <Check />
                  Save progress
                </Button>
              </form>
            )}
            {(habit.type === "yes_no" || habit.type === "quit") && (
              <Button
                type="button"
                size="lg"
                variant={complete ? "secondary" : "outline"}
                className={`h-12 rounded-xl px-5 ${
                  complete
                    ? "bg-muted text-foreground"
                    : "bg-muted/40"
                }`}
                disabled={saving || skipped}
                aria-pressed={complete}
                onClick={onComplete}
              >
                {complete ? <Check /> : <CircleCheck />}
                {complete
                  ? habit.type === "quit"
                    ? "Stayed on track"
                    : "Completed"
                  : habit.type === "quit"
                    ? "Stayed on track"
                    : "Mark complete"}
              </Button>
            )}
            {complete && habit.type === "count" && (
              <Badge variant="secondary" className="h-8 px-3 text-xs">
                <Check />
                Complete
              </Badge>
            )}
            {skipped && (
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="h-12 rounded-xl bg-muted/40 px-5"
                disabled={saving}
                onClick={onSkip}
              >
                Undo skip
              </Button>
            )}
          </div>
          {!complete && !skipped && (
            <Button
              type="button"
              size="default"
              variant="ghost"
              className="h-10 rounded-xl px-4 text-muted-foreground"
              disabled={saving}
              onClick={onSkip}
            >
              <CalendarDays />
              Skip today
            </Button>
          )}
          {saving && (
            <span className="text-xs text-muted-foreground" role="status">
              Saving…
            </span>
          )}
        </div>
      )}
    </article>
  );
}

function HabitMonthGrid({
  habits,
  dates,
  today,
  monthLabel,
  canGoPrevious,
  canGoNext,
  onPreviousMonth,
  onNextMonth,
  onThisMonth,
  logs,
  savingIds,
  onToggle,
  onLogValue,
  onEdit,
}: {
  habits: Habit[];
  dates: string[];
  today: string;
  monthLabel: string;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onThisMonth: () => void;
  logs: HabitLog[];
  savingIds: Set<string>;
  onToggle: (habit: Habit, date: string, log?: HabitLog) => void;
  onLogValue: (
    habit: Habit,
    date: string,
    value: number,
    status: HabitLogStatus | null
  ) => void;
  onEdit: (habit: Habit) => void;
}) {
  const [editingValue, setEditingValue] = React.useState<{
    habit: Habit;
    date: string;
    value: string;
  } | null>(null);
  const logsByDate = React.useMemo(
    () => new Map(logs.map((log) => [`${log.habitId}:${log.completedOn}`, log])),
    [logs]
  );
  const editingValueLog = editingValue
    ? logsByDate.get(`${editingValue.habit.id}:${editingValue.date}`)
    : undefined;
  const editingValueSaving = editingValue
    ? savingIds.has(editingValue.habit.id)
    : false;
  const columns = dates.length
    ? `minmax(18rem, 22rem) repeat(${dates.length}, minmax(2.75rem, 1fr))`
    : "minmax(18rem, 22rem)";

  return (
    <section
      aria-label="Monthly habit log"
      className="overflow-hidden border-y border-border/80 bg-background"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <CalendarDays className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Habit tracker
            </p>
            <h2 className="mt-0.5 truncate font-heading text-lg font-semibold sm:text-xl">
              {monthLabel}
            </h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-9 rounded-lg"
              aria-label="Previous month"
              title="Previous month"
              disabled={!canGoPrevious}
              onClick={onPreviousMonth}
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-9 rounded-lg"
              aria-label="Next month"
              title="Next month"
              disabled={!canGoNext}
              onClick={onNextMonth}
            >
              <ChevronRight />
            </Button>
            {!canGoNext && (
              <Button
                type="button"
                variant="ghost"
                className="h-9 rounded-lg px-3"
                onClick={onThisMonth}
              >
                This month
              </Button>
            )}
          </div>
          <span className="hidden h-8 border-l sm:block" />
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="flex size-5 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Check className="size-3" />
              </span>
              Completed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="flex size-5 items-center justify-center rounded-md border border-primary/50 bg-primary/10 text-[9px] font-bold tabular-nums text-primary">
                1
              </span>
              In progress
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="flex size-5 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                <Minus className="size-3" />
              </span>
              Skipped
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="flex size-5 items-center justify-center rounded-md border-2 border-primary bg-background" />
              Today
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="flex size-1.5 rounded-full bg-muted-foreground/15" />
              Not scheduled
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto overscroll-x-contain">
        <div className="min-w-max">
          <div
            className="grid border-b bg-muted/35 text-center"
            style={{ gridTemplateColumns: columns }}
          >
            <div className="sticky left-0 z-20 flex items-center gap-3 border-r bg-muted/80 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
              <CalendarDays className="size-4" />
              Habit
            </div>
            {dates.map((date) => {
              const dateObject = localDate(date);
              const isToday = date === today;
              return (
                <div
                  key={date}
                  className={`flex flex-col items-center justify-center gap-1 border-r border-border/50 py-2 ${
                    isToday ? "bg-primary/10 text-primary" : ""
                  }`}
                  aria-label={dateObject.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                  title={dateObject.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                >
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {DAY_NAMES[dateObject.getDay()]}
                  </span>
                  <span className="text-xs font-semibold tabular-nums">
                    {dateObject.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          {habits.length ? (
            habits.map((habit) => {
              const color = COLOR_STYLES[habit.color];
              const rowLogs = dates.map((date) =>
                logsByDate.get(`${habit.id}:${date}`)
              );

              return (
                <div
                  key={habit.id}
                  className="grid border-b last:border-b-0 hover:bg-muted/15"
                  style={{ gridTemplateColumns: columns }}
                >
                  <div className="sticky left-0 z-10 flex min-w-0 items-center gap-2 border-r bg-background px-3 py-3 sm:gap-3 sm:px-4">
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${color.icon}`}
                      aria-hidden="true"
                    >
                      <HabitIcon value={habit.emoji || "sparkles"} className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold" title={habit.name}>
                        {habit.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {scheduleLabel(habit)}
                        {habit.type === "count" || habit.type === "measure"
                          ? ` · ${habit.targetValue} ${habit.unit}`.trim()
                          : ""}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        {dateRangeLabel(habit)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 shrink-0"
                      aria-label={`Edit ${habit.name}`}
                      title={`Edit ${habit.name}`}
                      onClick={() => onEdit(habit)}
                    >
                      <Pencil />
                    </Button>
                  </div>

                  {dates.map((date, index) => {
                    const log = rowLogs[index];
                    const scheduled = isScheduledOn(habit, date);
                    const future = date > today;
                    const completed = log?.status === "completed";
                    const skipped = log?.status === "skipped";
                    const inProgress = log?.status === "in_progress";
                    const isToday = date === today;
                    const disabled = !scheduled || future || savingIds.has(habit.id);
                    const labelDate = localDate(date).toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    });
                    const labelStatus = completed
                      ? habit.type === "count" || habit.type === "measure"
                        ? `completed: ${log.value}${habit.unit ? ` ${habit.unit}` : ""}`
                        : "completed"
                      : skipped
                        ? "skipped"
                        : inProgress
                          ? `in progress: ${log.value}${habit.unit ? ` ${habit.unit}` : ""}`
                          : "not completed";
                    const isQuantified =
                      habit.type === "count" || habit.type === "measure";
                    const actionLabel = isQuantified
                      ? `activate to ${log ? "edit" : "add"} ${
                          habit.type === "count" ? "count" : "value"
                        }`
                      : completed
                        ? "activate to undo completion"
                        : "activate to mark completed";

                    return (
                      <div
                        key={date}
                        className={`flex items-center justify-center border-r border-border/40 py-2 ${
                          date === today ? "bg-primary/[0.04]" : ""
                        }`}
                      >
                        {scheduled ? (
                          <button
                            type="button"
                            className={`flex size-8 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed ${
                              isToday
                                ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                                : ""
                            } ${
                              completed
                                ? `${color.progress} border-transparent text-primary-foreground`
                                : skipped
                                  ? "border-border bg-muted text-muted-foreground"
                                  : inProgress
                                    ? "border-primary/50 bg-primary/10 text-primary"
                                    : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-primary/5"
                            } ${future ? "opacity-45" : ""}`}
                            disabled={disabled}
                            aria-label={`${habit.name}, ${labelDate}: ${labelStatus}; ${actionLabel}${future ? ", upcoming" : ""}`}
                            aria-pressed={isQuantified ? undefined : completed}
                            title={`${labelDate}: ${labelStatus}`}
                            onClick={() => {
                              if (isQuantified) {
                                setEditingValue({
                                  habit,
                                  date,
                                  value:
                                    log && log.status !== "skipped"
                                      ? String(log.value)
                                      : "",
                                });
                              } else {
                                onToggle(habit, date, log);
                              }
                            }}
                          >
                            {completed ? (
                              isQuantified ? (
                                <span className="text-[9px] font-bold tabular-nums">
                                  {log.value}
                                </span>
                              ) : (
                                <Check className="size-4" />
                              )
                            ) : skipped ? (
                              <Minus className="size-4" />
                            ) : inProgress ? (
                              <span className="text-[9px] font-bold tabular-nums">
                                {log.value}
                              </span>
                            ) : isQuantified ? (
                              <Plus className="size-3" />
                            ) : null}
                          </button>
                        ) : (
                          <span
                            className="size-1.5 rounded-full bg-muted-foreground/15"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="font-medium">Your habit sheet is ready.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a habit to start filling in your monthly progress.
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/25 px-5 py-3 text-xs text-muted-foreground sm:px-6">
        <span>
          Quantified habits show their logged value; select a day to edit it.
          Only scheduled days count toward consistency.
        </span>
        <span>Scroll horizontally to see every day of the month.</span>
      </div>
      <Dialog
        open={editingValue !== null}
        onOpenChange={(open) => {
          if (!open) setEditingValue(null);
        }}
      >
        <DialogContent className="max-w-sm gap-0">
          {editingValue && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const amount = Number(editingValue.value);
                if (!editingValue.value.trim() || !Number.isFinite(amount) || amount < 0) {
                  toast.error("Enter a valid value of zero or more.");
                  return;
                }
                if (
                  editingValue.habit.type === "count" &&
                  !Number.isInteger(amount)
                ) {
                  toast.error("Count values must be whole numbers.");
                  return;
                }
                onLogValue(
                  editingValue.habit,
                  editingValue.date,
                  amount,
                  amount === 0
                    ? null
                    : amount >= editingValue.habit.targetValue
                      ? "completed"
                      : "in_progress"
                );
                setEditingValue(null);
              }}
            >
              <DialogHeader className="mb-4">
                <DialogTitle>
                  {editingValue.habit.type === "count"
                    ? "Update count"
                    : "Save progress"}
                </DialogTitle>
                <DialogDescription>
                  {editingValue.habit.name} ·{" "}
                  {localDate(editingValue.date).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {" · Target "}
                  {editingValue.habit.targetValue}
                  {editingValue.habit.unit
                    ? ` ${editingValue.habit.unit}`
                    : ""}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2 pb-5">
                <label
                  htmlFor="habit-log-value"
                  className="text-sm font-medium"
                >
                  {editingValue.habit.type === "count"
                    ? "Count"
                    : `Value${editingValue.habit.unit ? ` (${editingValue.habit.unit})` : ""}`}
                </label>
                <Input
                  id="habit-log-value"
                  type="number"
                  min="0"
                  step={editingValue.habit.type === "count" ? "1" : "any"}
                  autoFocus
                  value={editingValue.value}
                  onChange={(event) =>
                    setEditingValue((current) =>
                      current
                        ? { ...current, value: event.target.value }
                        : current
                    )
                  }
                  disabled={editingValueSaving}
                />
              </div>
              <DialogFooter className="border-t pt-4">
                {editingValueLog && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={editingValueSaving}
                    onClick={() => {
                      onLogValue(
                        editingValue.habit,
                        editingValue.date,
                        0,
                        null
                      );
                      setEditingValue(null);
                    }}
                  >
                    Clear log
                  </Button>
                )}
                <Button type="submit" disabled={editingValueSaving}>
                  Save value
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default function HabitsClientPage() {
  const { user } = useAuth();
  const today = useTodayKey();
  const {
    reportError,
    reportConfigurationError,
    schemaUnavailable,
  } = useSupabaseDataStatus();
  const reportHabitError = React.useCallback(
    (error: unknown) => {
      if (isMissingHabitDataSchemaError(error)) {
        toast.error(
          "Habit data is unavailable. Run supabase/schema.sql to create the habit tables."
        );
      } else {
        reportError(error);
      }
    },
    [reportError]
  );
  const [habits, setHabits] = React.useState<Habit[]>([]);
  const [logs, setLogs] = React.useState<HabitLog[]>([]);
  const [loadedUserId, setLoadedUserId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<HabitFilter>("all");
  const [selectedMonth, setSelectedMonth] = React.useState<string | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Habit | null>(null);
  const [savingIds, setSavingIds] = React.useState<Set<string>>(new Set());
  const [savingHabit, setSavingHabit] = React.useState(false);

  React.useEffect(() => {
    if (!user?.id || !isSupabaseConfigured || schemaUnavailable) return;
    let active = true;
    const userId = user.id;
    Promise.all([loadHabits(userId), loadHabitLogs(userId)])
      .then(([remoteHabits, remoteLogs]) => {
        if (!active) return;
        setHabits(remoteHabits);
        setLogs(remoteLogs);
        setLoadedUserId(userId);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setHabits([]);
        setLogs([]);
        reportHabitError(error);
        setLoadedUserId(userId);
      });

    return () => {
      active = false;
    };
  }, [reportHabitError, schemaUnavailable, user?.id]);

  const activeHabits = React.useMemo(
    () => habits.filter((habit) => !habit.archived),
    [habits]
  );
  const archivedHabits = React.useMemo(
    () => habits.filter((habit) => habit.archived),
    [habits]
  );
  const logsByHabit = React.useMemo(() => {
    const grouped = new Map<string, HabitLog[]>();
    for (const log of logs) {
      const current = grouped.get(log.habitId);
      if (current) current.push(log);
      else grouped.set(log.habitId, [log]);
    }
    return grouped;
  }, [logs]);
  const logByHabitToday = React.useMemo(
    () =>
      new Map(
        logs
          .filter((log) => log.completedOn === today)
          .map((log) => [log.habitId, log])
      ),
    [logs, today]
  );
  const completedLogKeys = React.useMemo(
    () =>
      new Set(
        logs
          .filter((log) => log.status === "completed")
          .map((log) => `${log.habitId}:${log.completedOn}`)
      ),
    [logs]
  );
  const todaysHabits = React.useMemo(
    () =>
      activeHabits.filter((habit) => today && isScheduledOn(habit, today)),
    [activeHabits, today]
  );
  const month = React.useMemo(() => datesForPeriod(today, 30), [today]);
  const currentMonth = today.slice(0, 7);
  const displayMonth = selectedMonth ?? currentMonth;
  const monthDates = React.useMemo(
    () => datesForMonth(displayMonth),
    [displayMonth]
  );
  const displayMonthLabel = displayMonth
    ? localDate(`${displayMonth}-01`).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : "";
  const todayCount = todaysHabits.filter(
    (habit) => logByHabitToday.get(habit.id)?.status === "completed"
  ).length;
  const strength = React.useMemo(() => {
    let scheduledCount = 0;
    let completeCount = 0;
    for (const habit of activeHabits) {
      for (const date of month) {
        if (!isScheduledOn(habit, date)) continue;
        scheduledCount++;
        if (completedLogKeys.has(`${habit.id}:${date}`)) {
          completeCount++;
        }
      }
    }
    return {
      scheduledCount,
      completeCount,
      percent: scheduledCount
        ? Math.round((completeCount / scheduledCount) * 100)
        : 0,
    };
  }, [activeHabits, month, completedLogKeys]);

  const streaksByHabit = React.useMemo(
    () =>
      new Map(
        activeHabits.map((habit) => [
          habit.id,
          streakFor(habit, logsByHabit.get(habit.id) ?? [], today),
        ])
      ),
    [activeHabits, logsByHabit, today]
  );
  const bestStreak = React.useMemo(
    () =>
      [...streaksByHabit.values()].reduce(
        (best, streak) => Math.max(best, streak.longest),
        0
      ),
    [streaksByHabit]
  );

  const filteredHabits = React.useMemo(
    () =>
      todaysHabits.filter((habit) => {
        const log = logByHabitToday.get(habit.id);
        const currentStreak = streaksByHabit.get(habit.id)?.current ?? 0;
        const isCompleted =
          log?.status === "completed" &&
          ((habit.type !== "count" && habit.type !== "measure") ||
            log.value >= habit.targetValue);
        if (filter === "remaining") {
          return !isCompleted && log?.status !== "skipped";
        }
        if (filter === "at-risk") {
          return !isCompleted && log?.status !== "skipped" && currentStreak > 0;
        }
        return true;
      }),
    [todaysHabits, logByHabitToday, streaksByHabit, filter]
  );
  const groupedHabits = React.useMemo(() => {
    const groups: { name: HabitGroup; habits: Habit[] }[] = [];
    for (const name of ["Morning", "Afternoon", "Evening", "Anytime"] as const) {
      const groupHabits = filteredHabits.filter(
        (habit) => habitGroup(habit) === name
      );
      if (groupHabits.length) groups.push({ name, habits: groupHabits });
    }
    return groups;
  }, [filteredHabits]);

  async function writeLog(
    habit: Habit,
    completedOn: string,
    value: number,
    status: HabitLogStatus | null
  ) {
    if (!user?.id) return;
    if (!today || !completedOn) {
      toast.error("Today's date is not available yet. Please try again.");
      return;
    }
    if (completedOn > today) {
      toast.error("Future days cannot be logged yet.");
      return;
    }
    if (!isSupabaseConfigured) {
      reportConfigurationError();
      return;
    }
    if (savingIds.has(habit.id)) return;
    setSavingIds((current) => new Set(current).add(habit.id));
    try {
      if (status) {
        await saveHabitLog(user.id, habit.id, completedOn, value, status);
        setLogs((current) => [
          ...current.filter(
            (log) => !(log.habitId === habit.id && log.completedOn === completedOn)
          ),
          {
            habitId: habit.id,
            completedOn,
            value,
            status,
            loggedAt: new Date().toISOString(),
          },
        ]);
        if (status === "completed") {
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate(12);
          }
          toast.success(
            completedOn === today
              ? "Habit saved for today."
              : `Habit saved for ${localDate(completedOn).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}.`
          );
        }
      } else {
        await removeHabitLog(user.id, habit.id, completedOn);
        setLogs((current) =>
          current.filter(
            (log) => !(log.habitId === habit.id && log.completedOn === completedOn)
          )
        );
      }
    } catch (error) {
      reportHabitError(error);
    } finally {
      setSavingIds((current) => {
        const next = new Set(current);
        next.delete(habit.id);
        return next;
      });
    }
  }

  async function saveHabit(values: HabitFormValues) {
    if (!user?.id || !today || savingHabit) return;
    if (!isSupabaseConfigured) {
      reportConfigurationError();
      return;
    }
    const habit: Habit = {
      id: editing?.id ?? crypto.randomUUID(),
      name: values.name.trim(),
      emoji: values.emoji,
      notes: values.notes?.trim() || "",
      category: values.category,
      type: values.type,
      frequency: values.frequency,
      scheduleDays:
        values.frequency === "custom" ? values.scheduleDays : [],
      startedOn: values.startedOn,
      endedOn: values.endedOn || null,
      startTime: values.startTime || null,
      targetValue: values.type === "yes_no" || values.type === "quit"
        ? 1
        : values.targetValue,
      unit: values.type === "count" || values.type === "measure"
        ? values.unit.trim()
        : "",
      color: values.color,
      archived: editing?.archived ?? false,
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    };

    setSavingHabit(true);
    try {
      await persistHabit(user.id, habit);
      setHabits((current) =>
        editing
          ? current.map((item) => (item.id === habit.id ? habit : item))
          : [...current, habit]
      );
      setEditorOpen(false);
      setEditing(null);
      toast.success(editing ? "Habit updated." : "Habit created.");
    } catch (error) {
      reportHabitError(error);
    } finally {
      setSavingHabit(false);
    }
  }

  async function toggleArchive(habit: Habit) {
    if (!user?.id) return;
    if (!isSupabaseConfigured) {
      reportConfigurationError();
      return;
    }
    setSavingIds((current) => new Set(current).add(habit.id));
    try {
      await setHabitArchived(user.id, habit.id, !habit.archived);
      setHabits((current) =>
        current.map((item) =>
          item.id === habit.id ? { ...item, archived: !item.archived } : item
        )
      );
      toast.success(habit.archived ? "Habit restored." : "Habit archived.");
    } catch (error) {
      reportHabitError(error);
    } finally {
      setSavingIds((current) => {
        const next = new Set(current);
        next.delete(habit.id);
        return next;
      });
    }
  }

  function openEditor(habit?: Habit) {
    setEditing(habit ?? null);
    setEditorOpen(true);
  }

  if (
    user?.id &&
    isSupabaseConfigured &&
    loadedUserId !== user.id &&
    !schemaUnavailable
  ) {
    return <PageLoadingSkeleton label="Loading your habits" variant="habits" />;
  }

  const todayPercent = todaysHabits.length
    ? Math.round((todayCount / todaysHabits.length) * 100)
    : 0;

  return (
    <div className="-mx-3 -my-4 flex min-h-dvh w-[calc(100%+1.5rem)] min-w-0 flex-col bg-background sm:-mx-4 sm:-my-6 sm:w-[calc(100%+2rem)] md:-mx-6 md:-my-8 md:w-[calc(100%+3rem)] lg:-mx-8 lg:-my-6 lg:w-[calc(100%+4rem)]">
      <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b bg-background px-3 py-3 sm:px-4 md:px-6 lg:px-8">
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
            Habits
          </h1>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            nativeButton={false}
            render={<Link href="/profile/analytics" />}
            variant="outline"
            className="h-9 rounded-lg px-3.5"
          >
            <BarChart3 />
            Analytics
          </Button>
          <Button
            type="button"
            size="default"
            className="h-9 rounded-lg px-3.5"
            onClick={() => openEditor()}
          >
            <Plus />
            New habit
          </Button>
        </div>
      </header>

      <HabitMonthGrid
        habits={activeHabits}
        dates={monthDates}
        today={today}
        monthLabel={displayMonthLabel}
        canGoPrevious={Boolean(displayMonth)}
        canGoNext={displayMonth < currentMonth}
        onPreviousMonth={() =>
          setSelectedMonth(shiftMonth(displayMonth, -1))
        }
        onNextMonth={() =>
          setSelectedMonth(shiftMonth(displayMonth, 1))
        }
        onThisMonth={() => setSelectedMonth(null)}
        logs={logs}
        savingIds={savingIds}
        onToggle={(habit, date, log) => {
          const status = log?.status === "completed" ? null : "completed";
          void writeLog(habit, date, 1, status);
        }}
        onLogValue={(habit, date, value, status) => {
          void writeLog(habit, date, value, status);
        }}
        onEdit={openEditor}
      />

      <section
        aria-label="Habit summary"
        className="grid grid-cols-3 border-b bg-background"
      >
        <div className="min-w-0 border-r px-2.5 py-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-start justify-between gap-1.5">
            <div>
              <p className="truncate text-xs text-muted-foreground sm:text-sm">Today</p>
              <p className="mt-1 font-heading text-lg font-semibold tabular-nums sm:text-xl">
                {todayCount}
                <span className="ml-1 text-xs font-medium text-muted-foreground sm:text-sm">
                  / {todaysHabits.length}
                </span>
              </p>
            </div>
            <span className="pt-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {todayPercent}%
            </span>
          </div>
          <Progress
            value={todayPercent}
            aria-label={`Today's completion ${todayPercent} percent`}
            className="mt-2.5 w-full gap-0"
          />
        </div>
        <div className="min-w-0 border-r px-2.5 py-3 sm:px-4 md:px-6 lg:px-8">
          <p className="truncate text-xs text-muted-foreground sm:text-sm">30-day consistency</p>
          <p className="mt-1 font-heading text-lg font-semibold tabular-nums sm:text-xl">
            {strength.percent}%
          </p>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground sm:text-xs">
            {strength.completeCount} of {strength.scheduledCount} scheduled check-ins
          </p>
        </div>
        <div className="min-w-0 px-2.5 py-3 sm:px-4 md:px-6 lg:px-8">
          <p className="truncate text-xs text-muted-foreground sm:text-sm">Best streak</p>
          <p className="mt-1 font-heading text-lg font-semibold tabular-nums sm:text-xl">
            {bestStreak}
            <span className="ml-1 text-xs font-medium text-muted-foreground sm:text-sm">
              days
            </span>
          </p>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground sm:text-xs">
            Skipped days keep your streak.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="todays-habits-heading"
      className="overflow-hidden border-y border-border/80 bg-background"
      >
        <div className="flex flex-col gap-4 border-b bg-muted/20 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6">
          <div>
            <h2
              id="todays-habits-heading"
              className="font-heading text-lg font-semibold sm:text-xl"
            >
              Today&apos;s routine
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep today&apos;s scheduled habits moving at your own pace.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter habits">
            {[
              { value: "all", label: "All" },
              { value: "remaining", label: "Remaining" },
              { value: "at-risk", label: "At risk" },
            ].map((option) => (
              <Button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={filter === option.value}
                variant={filter === option.value ? "secondary" : "outline"}
                className={`h-10 rounded-xl px-4 ${
                  filter === option.value
                    ? "bg-muted text-foreground"
                    : "bg-background"
                }`}
                onClick={() => setFilter(option.value as HabitFilter)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {groupedHabits.length ? (
          <div className="divide-y px-3 sm:px-6">
            {groupedHabits.map((group) => (
              <details key={group.name} open className="group">
                <summary className="flex cursor-pointer list-none items-center gap-2 py-3 text-sm font-semibold">
                  <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                  {group.name}
                  <span className="ml-auto text-xs font-medium text-muted-foreground">
                    {group.habits.length}{" "}
                    {group.habits.length === 1 ? "habit" : "habits"}
                  </span>
                </summary>
                <div className="divide-y">
                  {group.habits.map((habit) => (
                    <HabitCard
                      key={habitCardKey(habit, logByHabitToday.get(habit.id))}
                      habit={habit}
                      log={logByHabitToday.get(habit.id)}
                      streak={streaksByHabit.get(habit.id)?.current ?? 0}
                      saving={savingIds.has(habit.id)}
                      compact
                      onComplete={() => {
                        const log = logByHabitToday.get(habit.id);
                        void writeLog(
                          habit,
                          today,
                          1,
                          log?.status === "completed" ? null : "completed"
                        );
                      }}
                      onProgress={(value) => {
                        const status: HabitLogStatus =
                          value >= habit.targetValue ? "completed" : "in_progress";
                        void writeLog(habit, today, value, status);
                      }}
                      onSkip={() => {
                        const log = logByHabitToday.get(habit.id);
                        void writeLog(
                          habit,
                          today,
                          0,
                          log?.status === "skipped" ? null : "skipped"
                        );
                      }}
                      onEdit={() => openEditor(habit)}
                      onArchive={() => void toggleArchive(habit)}
                    />
                  ))}
                </div>
              </details>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center sm:px-8">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Activity className="size-6" />
            </span>
            <p className="text-base font-semibold">
              {todaysHabits.length
                ? filter === "at-risk"
                  ? "You’re keeping up with your streaks."
                  : "Your routine is clear for today."
                : activeHabits.length
                  ? "Nothing scheduled for today."
                  : "Start with a habit that matters to you."}
            </p>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              {activeHabits.length
                ? "Take the day at your own pace. Your other scheduled habits will appear here."
                : "Create a recurring routine, set a gentle target, and track it here—not in your tasks."}
            </p>
            {!activeHabits.length && (
              <Button
                type="button"
                size="lg"
                className="mt-2 h-12 rounded-xl px-5"
                onClick={() => openEditor()}
              >
                <Plus />
                Create your first habit
              </Button>
            )}
          </div>
        )}
        <div className="border-t px-5 py-4 text-sm text-muted-foreground sm:px-6">
          A missed day isn&apos;t failure. Skip a day when you need to, then return to your rhythm.
        </div>
      </section>

      {archivedHabits.length > 0 && (
        <details className="border-y border-border/80 bg-background px-3 sm:px-6">
          <summary className="flex cursor-pointer list-none items-center gap-3 py-4 text-sm font-semibold">
            <Archive className="size-4 text-muted-foreground" />
            Archived habits
            <Badge variant="secondary" className="ml-auto">
              {archivedHabits.length}
            </Badge>
            <ChevronDown className="size-4 text-muted-foreground" />
          </summary>
          <div className="divide-y border-t">
            {archivedHabits.map((habit) => (
              <HabitCard
                key={habitCardKey(habit, logByHabitToday.get(habit.id))}
                habit={habit}
                log={logByHabitToday.get(habit.id)}
                streak={streakFor(habit, logsByHabit.get(habit.id) ?? [], today).current}
                saving={savingIds.has(habit.id)}
                archived
                onComplete={() => {}}
                onProgress={() => {}}
                onSkip={() => {}}
                onEdit={() => openEditor(habit)}
                onArchive={() => void toggleArchive(habit)}
              />
            ))}
          </div>
        </details>
      )}

      <HabitEditorDialog
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setEditing(null);
        }}
        habit={editing}
        today={today}
        saving={savingHabit}
        onSave={(form) => void saveHabit(form)}
      />
    </div>
  );
}
