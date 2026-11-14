"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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
import { FadeIn, EASE } from "@/components/motion-fade";

const trendConfig = {
  completed: { label: "Completed", color: "var(--chart-1)" },
  created: { label: "Created", color: "var(--chart-3)" },
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <CalendarCheck className="size-4 text-primary" /> Streak calendar
          </CardTitle>
          {month && (
            <span className="text-xs font-medium text-muted-foreground sm:text-sm">
              {month.label}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="min-w-0">
        <div className="grid grid-cols-7 gap-1 text-center sm:gap-1.5">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((weekday) => (
            <span
              key={weekday}
              className="pb-1 text-[10px] font-medium text-muted-foreground sm:text-xs"
              aria-hidden="true"
            >
              {weekday}
            </span>
          ))}
          {month?.days.map((cell, index) => {
            if (!cell) {
              return <span key={`empty-${index}`} />;
            }
            const isStreakDay = activeDaySet.has(cell.date);
            const isToday = cell.date === today;
            return (
              <span
                key={cell.date}
                title={`${shortLabel(cell.date)}${isStreakDay ? " · Streak day" : ""}`}
                aria-label={`${shortLabel(cell.date)}${isStreakDay ? ", streak day" : ""}${isToday ? ", today" : ""}`}
                className={cn(
                  "mx-auto flex aspect-square w-full max-w-9 items-center justify-center rounded-md border text-xs tabular-nums",
                  isStreakDay
                    ? "border-primary bg-primary font-semibold text-primary-foreground"
                    : "border-border bg-muted/30 text-muted-foreground",
                  isToday && "ring-2 ring-primary ring-offset-2 ring-offset-card"
                )}
              >
                {cell.day}
              </span>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-3 rounded bg-primary" aria-hidden="true" />
          <span>Streak day</span>
        </div>
      </CardContent>
    </Card>
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
        created: allTasks.filter((task) => task.createdAt === key).length,
      };
    });
  }, [today, completionCountsByDate, allTasks]);
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
          <TrendingUp />
          Analytics
        </Button>
      </header>

      <div className="grid min-w-0 gap-4 lg:grid-cols-3 lg:gap-5">
        <FadeIn className="min-w-0">
          <Link
            href="/days"
            className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Card className="h-full border-primary/20 bg-primary/[0.03] transition-colors hover:bg-primary/[0.06]">
              <CardContent className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Flame className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium">
                  Daily streak
                </span>
                <span className="font-heading text-xl font-semibold tabular-nums">
                  {currentStreak}
                  <span className="ml-1 text-xs font-medium text-muted-foreground">
                    {currentStreak === 1 ? "day" : "days"}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </CardContent>
            </Card>
          </Link>
        </FadeIn>

        <FadeIn delay={0.04} className="min-w-0 lg:col-span-2">
          <div className="grid h-full grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {[
              { label: "Tracked tasks", value: activeStreaks },
              { label: "Best streak", value: `${longestStreak}d` },
              { label: "This week", value: `${weekDays}/7` },
              { label: "Completions", value: activity.length.toLocaleString() },
            ].map((stat) => (
              <Card key={stat.label} className="h-full">
                <CardContent className="flex h-full min-w-0 flex-col items-center justify-center gap-1 px-2 py-3 text-center sm:px-3 sm:py-4">
                  <p className="truncate text-xs text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="max-w-full truncate font-heading text-lg font-semibold tabular-nums sm:text-xl">
                    {stat.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </FadeIn>
      </div>

      <FadeIn delay={0.06}>
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {activeToday ? (
                <CheckCircle2 className="size-5" />
              ) : (
                <Flame className="size-5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
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
                size="sm"
              >
                {checkedInToday ? "View check-in" : "Check in"}
              </Button>
              <Button
                nativeButton={false}
                render={<Link href="/tasks" />}
                size="sm"
              >
                Add a task
              </Button>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-3 lg:gap-5">
        <FadeIn delay={0.08} className="min-w-0 lg:col-span-2">
          <StreakCalendar today={today} activeDays={activityStreaks.activeDays} />
        </FadeIn>

        <FadeIn delay={0.1} className="min-w-0">
          <Card className="flex flex-col">
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
            <CardContent className="min-h-0 flex-1 p-0">
              <div aria-label="Streaks by task" className="divide-y" role="list">
                {trackedTasks.length ? (
                  trackedTasks.map((task, index) => {
                    const taskActivity = activity.filter(
                      (completion) => completion.taskId === task.id
                    );
                    const taskStreak = getActivityStreaks(taskActivity, today);
                    return (
                      <motion.div
                        key={task.id}
                        role="listitem"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: index * 0.04,
                          ease: EASE,
                        }}
                        className="flex min-w-0 items-center gap-3 px-3 py-3 sm:px-4"
                      >
                        <p className="min-w-0 flex-1 truncate text-sm font-medium">
                          {task.title}
                        </p>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 text-[11px] tabular-nums sm:gap-2 sm:text-xs">
                          <span className="rounded-md bg-primary/10 px-2 py-1 font-medium text-primary">
                            {taskStreak.current}d current
                          </span>
                          <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">
                            {Math.max(task.longestStreak, taskStreak.longest)}d
                            best
                          </span>
                        </div>
                      </motion.div>
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
        </FadeIn>
      </div>

      <FadeIn delay={0.12}>
        <Card>
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
              <span className="flex items-center gap-1.5">
                <span className="w-3 border-t-2 border-dashed border-[var(--chart-3)]" />
                Created
              </span>
            </div>
            {activity.length || allTasks.length ? (
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
                  dataKey="created"
                  stroke="var(--chart-3)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
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
      </FadeIn>
    </div>
  );
}
