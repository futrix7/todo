"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Flame,
  TrendingUp,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { dateKey, shortLabel } from "@/lib/date-utils";
import type { DayEntry, Task, TaskCompletion } from "@/lib/types";
import { useTodayKey } from "@/lib/use-local-storage";
import {
  getActivityStreaks,
  getEngagementStreaks,
  getTaskActivity,
} from "@/lib/task-activity";
import {
  isSupabaseConfigured,
  isTaskDataSchemaUnavailable,
  loadCompletions,
  loadDayEntries,
  loadTasks,
} from "@/lib/supabase/task-data";
import { useAuth } from "@/lib/auth";
import { useSupabaseDataStatus } from "@/components/supabase-data-provider";
import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

const trendConfig = {
  completed: { label: "Completed", color: "var(--chart-1)" },
} satisfies ChartConfig;

function getMonthCalendar(today: string) {
  if (!today) return null;

  const month = new Date(`${today}T12:00:00`);
  month.setDate(1);
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const days: ({ date: string; day: number } | null)[] = Array.from(
    { length: (month.getDay() + 6) % 7 },
    () => null
  );

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthIndex, day, 12);
    days.push({ date: dateKey(date), day });
  }
  while (days.length % 7 !== 0) days.push(null);

  return {
    label: month.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    }),
    days,
  };
}

function StreakCalendar({
  today,
  activeDays,
}: {
  today: string;
  activeDays: string[];
}) {
  const month = getMonthCalendar(today);
  const activeDaySet = new Set(activeDays);
  const activeDaysThisMonth = activeDays.filter(
    (date) => date.slice(0, 7) === today.slice(0, 7)
  ).length;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-semibold sm:text-lg">{month?.label ?? "This month"}</p>
        <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary sm:text-sm">
          {activeDaysThisMonth} active {activeDaysThisMonth === 1 ? "day" : "days"}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center sm:gap-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((weekday) => (
          <span
            key={weekday}
            className="pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm"
            aria-hidden="true"
          >
            {weekday}
          </span>
        ))}
      </div>
      <div
        aria-label={`${month?.label ?? "Current month"} streak activity`}
        className="grid min-h-0 flex-1 auto-rows-fr grid-cols-7 gap-1.5 sm:gap-2"
      >
        {month?.days.map((cell, index) => {
          if (!cell) {
            return <span key={`empty-${index}`} aria-hidden="true" />;
          }
          const isStreakDay = activeDaySet.has(cell.date);
          const isToday = cell.date === today;
          return (
            <span
              key={cell.date}
              title={`${shortLabel(cell.date)}${isStreakDay ? " · Streak day" : ""}`}
              aria-label={`${shortLabel(cell.date)}${isStreakDay ? ", streak day" : ""}${isToday ? ", today" : ""}`}
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "flex h-full min-h-8 w-full items-center justify-center rounded-xl border text-base font-semibold leading-none tabular-nums transition-colors sm:text-lg",
                isStreakDay
                  ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "border-border/60 bg-muted/20 text-muted-foreground",
                isToday && "relative z-10 ring-2 ring-primary ring-offset-2 ring-offset-card"
              )}
            >
              {cell.day}
            </span>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border/70 pt-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded bg-primary" aria-hidden="true" />
          Streak day
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-md border-2 border-primary" aria-hidden="true" />
          Today
        </span>
      </div>
    </div>
  );
}

export default function StreakPage() {
  const { user } = useAuth();
  const { reportError, schemaUnavailable } = useSupabaseDataStatus();
  const today = useTodayKey();
  const [allTasks, setAllTasks] = React.useState<Task[]>([]);
  const [savedCompletions, setSavedCompletions] = React.useState<TaskCompletion[]>([]);
  const [dayEntries, setDayEntries] = React.useState<DayEntry[]>([]);
  const [loadedUserId, setLoadedUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isSupabaseConfigured || !user?.id || schemaUnavailable || isTaskDataSchemaUnavailable()) {
      return;
    }

    const userId = user.id;
    let active = true;
    Promise.all([
      loadTasks(userId),
      loadCompletions(userId),
      loadDayEntries(userId),
    ])
      .then(([remoteTasks, remoteCompletions, remoteEntries]) => {
        if (!active) return;
        setAllTasks(remoteTasks);
        setSavedCompletions(remoteCompletions);
        setDayEntries(remoteEntries);
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
  }, [user?.id, setAllTasks, setSavedCompletions, reportError, schemaUnavailable]);

  const activity = React.useMemo(
    () => getTaskActivity(allTasks, savedCompletions, today),
    [allTasks, savedCompletions, today]
  );
  const activityStreaks = React.useMemo(
    () =>
      getEngagementStreaks(
        activity,
        allTasks,
        dayEntries.map((entry) => entry.date),
        today
      ),
    [activity, allTasks, dayEntries, today]
  );
  const completionCountsByDate = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const completion of activity) {
      counts.set(
        completion.completedOn,
        (counts.get(completion.completedOn) ?? 0) + 1
      );
    }
    return counts;
  }, [activity]);
  const completionSeries = React.useMemo(() => {
    if (!today) return [];
    const currentDate = new Date(`${today}T12:00:00`);
    return Array.from({ length: 30 }, (_, index) => {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() - 29 + index);
      const key = dateKey(date);
      return {
        day: shortLabel(key),
        completed: completionCountsByDate.get(key) ?? 0,
      };
    });
  }, [today, completionCountsByDate]);
  const currentStreak = activityStreaks.current;
  const longestStreak = activityStreaks.longest;
  const weekStart = today ? new Date(`${today}T12:00:00`) : null;
  if (weekStart) weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekDays = weekStart
    ? activityStreaks.activeDays.filter(
      (day) => day >= dateKey(weekStart) && day <= today
    ).length
    : 0;
  const trackedTasks = allTasks.filter((task) => task.streakEnabled);
  const activeStreaks = trackedTasks.length;
  const checkedInToday = dayEntries.some((entry) => entry.date === today);
  const activeToday = activityStreaks.activeDays.includes(today);

  if (
    isSupabaseConfigured &&
    user?.id &&
    loadedUserId !== user.id &&
    !schemaUnavailable &&
    !isTaskDataSchemaUnavailable()
  ) {
    return (
      <PageLoadingSkeleton
        label="Loading streak activity"
        variant="streak"
      />
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 lg:gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <h1 className="font-heading text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
            Streaks
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            See your consistency over time and keep your routines going.
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<Link href="/profile/analytics" />}
          variant="outline"
          size="sm"
        >
          <TrendingUp /> Analytics
        </Button>
      </header>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[1.05fr_1.95fr] lg:gap-5">
        <Card className="h-full border-border/70 bg-card/80 shadow-sm transition-colors hover:bg-card">
          <CardContent className="flex items-center gap-4 p-5 sm:p-6">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 sm:size-14">
              <Flame className="size-6" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">Daily streak</p>
              <p className="mt-1 font-heading text-3xl font-semibold tabular-nums sm:text-4xl">
                {currentStreak}
                <span className="ml-1.5 text-sm font-medium text-muted-foreground">
                  {currentStreak === 1 ? "day" : "days"}
                </span>
              </p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </CardContent>
        </Card>

        <div className="grid h-full grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {[
            { label: "Tracked tasks", value: activeStreaks },
            { label: "Best streak", value: `${longestStreak}d` },
            { label: "This week", value: `${weekDays}/7` },
            { label: "Completions", value: activity.length.toLocaleString() },
          ].map((stat) => (
            <Card key={stat.label} className="h-full border-border/70 bg-card/80 shadow-sm">
              <CardContent className="w-full h-full flex items-center content-center justify-center flex-col">

                <p className="max-w-full font-heading text-2xl font-semibold leading-none tabular-nums sm:text-5xl">
                  {stat.value}
                </p>
                <p className="text-muted-foreground">
                  {stat.label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card className="border-border/70 bg-card/80 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            {activeToday ? (
              <CheckCircle2 className="size-5" />
            ) : (
              <Flame className="size-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg sm:text-2xl font-semibold">
              {checkedInToday
                ? "Today's check-in is saved"
                : activeToday
                  ? "Your streak is already safe today"
                  : "Keep your streak moving"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {checkedInToday
                ? "Your check-in counts toward your daily streak."
                : activeToday
                  ? "Adding a task or completing one counts too. A mood check-in is always optional."
                  : "Check in, add a task, or complete one today to continue your daily streak."}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              nativeButton={false}
              render={<Link href="/days" />}
              variant="outline"
              size="lg"
            >
              {checkedInToday ? "View check-in" : "Check in"}
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/tasks" />}
              size="lg"
            >
              Add a task
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid min-w-0 items-stretch gap-4 xl:grid-cols-[1.2fr_1.8fr] xl:gap-5">
        <Card className="flex h-full flex-col overflow-hidden border-border/70 bg-card/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Flame className="size-4 text-primary" /> Task streaks
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {trackedTasks.length
                ? `${trackedTasks.length} ${trackedTasks.length === 1 ? "task" : "tasks"} building a streak`
                : "Track a streak on any task to see it here"}
            </p>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <div aria-label="Streaks by task" className="app-scroll-region min-h-0 flex-1 divide-y divide-border/70" role="list">
              {trackedTasks.length ? (
                trackedTasks.map((task) => {
                  const taskActivity = activity.filter(
                    (completion) => completion.taskId === task.id
                  );
                  const taskStreak = getActivityStreaks(taskActivity, today);
                  return (
                    <div
                      key={task.id}
                      role="listitem"
                      className="flex min-w-0 items-center gap-3 px-3 py-3 sm:px-4"
                    >
                      <p className="min-w-0 flex-1 truncate text-sm font-medium">
                        {task.title}
                      </p>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 text-[11px] tabular-nums sm:gap-2 sm:text-xs">
                        <span className="rounded-md bg-primary/10 px-2 py-1 font-medium text-primary ring-1 ring-primary/20">
                          {taskStreak.current}d current
                        </span>
                        <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground ring-1 ring-border/70">
                          {Math.max(task.longestStreak, taskStreak.longest)}d
                          best
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center gap-2 p-8 text-center">
                  <p className="text-sm font-medium">No active task streaks</p>
                  <Link
                    href="/tasks"
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Set up a task streak
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col border-border/70 bg-card/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarCheck className="size-4 text-primary" /> Streak calendar
            </CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-[25rem] min-w-0 flex-1 flex-col p-4 sm:min-h-[28rem] sm:p-5">
            <StreakCalendar today={today} activeDays={activityStreaks.activeDays} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" /> Streak trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[var(--chart-1)]" />
              Completed
            </span>
          </div>
          {activity.length ? (
            <ChartContainer config={trendConfig} className="h-[210px] w-full sm:h-[260px]">
              <LineChart data={completionSeries} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                  minTickGap={16}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                  width={28}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--chart-1)" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[210px] items-center justify-center text-sm text-muted-foreground sm:h-[260px]">
              Complete tasks to build your streak trend.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
