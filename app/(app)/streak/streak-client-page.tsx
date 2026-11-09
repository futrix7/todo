"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Flame,
  Loader2,
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
import { Badge } from "@/components/ui/badge";
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

const LEVELS = [
  "bg-muted",
  "bg-primary/25",
  "bg-primary/45",
  "bg-primary/65",
  "bg-primary/90",
];

function levelClass(count: number) {
  if (count === 0) return LEVELS[0];
  if (count <= 1) return LEVELS[1];
  if (count <= 3) return LEVELS[2];
  if (count <= 5) return LEVELS[3];
  return LEVELS[4];
}

function Heatmap({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  const [flashingDates, setFlashingDates] = React.useState<string[]>([]);
  const weeks: ({ date: string; count: number } | null)[][] = [];
  let current: ({ date: string; count: number } | null)[] = [];

  React.useEffect(() => {
    let finishTimeout: number | undefined;
    const startTimeout = window.setTimeout(() => {
      const shuffledDates = [...data]
        .sort(() => Math.random() - 0.5)
        .slice(0, 6)
        .map((cell) => cell.date);
      setFlashingDates(shuffledDates);
      finishTimeout = window.setTimeout(() => setFlashingDates([]), 2200);
    }, 0);
    return () => {
      window.clearTimeout(startTimeout);
      if (finishTimeout !== undefined) window.clearTimeout(finishTimeout);
    };
  }, [data]);

  // pad the first week so columns align to weekdays
  const firstDow = data[0]
    ? (new Date(`${data[0].date}T12:00:00`).getDay() + 6) % 7
    : 0;
  for (let i = 0; i < firstDow; i++) current.push(null);

  for (const cell of data) {
    const dow = (new Date(`${cell.date}T12:00:00`).getDay() + 6) % 7;
    if (dow === 0 && current.length) {
      weeks.push(current);
      current = [];
    }
    current.push(cell);
  }
  if (current.length) weeks.push(current);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="size-4 text-primary" /> Daily activity
            </CardTitle>
          </div>
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            26 weeks
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="min-w-0">
        {!data.some((cell) => cell.count > 0) && (
          <p className="mb-3 text-center text-xs text-muted-foreground">
            Your check-ins, new tasks, and completions will appear here.
          </p>
        )}
        <div className="flex w-full min-w-0 gap-1">
          <div className="flex w-4 shrink-0 flex-col justify-between py-[1px] text-[8px] text-muted-foreground sm:w-5 sm:text-[9px]">
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex min-w-0 flex-1 flex-col gap-px">
              {week.map((cell, ci) =>
                cell ? (
                  <motion.span
                    key={cell.date}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={
                      flashingDates.includes(cell.date)
                        ? { opacity: [1, 0.25, 1], scale: [1, 0.82, 1] }
                        : { opacity: 1, scale: 1 }
                    }
                    transition={{
                      duration: flashingDates.includes(cell.date) ? 0.7 : 0.3,
                      repeat: flashingDates.includes(cell.date) ? 2 : 0,
                      delay: Math.min((wi * 7 + ci) * 0.0015, 0.4),
                      ease: EASE,
                    }}
                    title={`${cell.count} activit${cell.count === 1 ? "y" : "ies"} · ${shortLabel(cell.date)}`}
                    className={cn(
                      "aspect-square w-full rounded-[2px]",
                      levelClass(cell.count)
                    )}
                  />
                ) : (
                  <span key={`pad-${ci}`} className="aspect-square w-full" />
                )
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-end gap-1 text-[9px] text-muted-foreground">
          <span className="mr-0.5">Fewer activities</span>
          {LEVELS.map((level) => (
            <span key={level} className={cn("size-2 rounded-[2px]", level)} />
          ))}
          <span className="ml-0.5">More activities</span>
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
  const activityByDate = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const completion of activity) {
      counts.set(
        completion.completedOn,
        (counts.get(completion.completedOn) ?? 0) + 1
      );
    }
    for (const task of allTasks) {
      counts.set(task.createdAt, (counts.get(task.createdAt) ?? 0) + 1);
    }
    for (const entry of dayEntries) {
      counts.set(entry.date, (counts.get(entry.date) ?? 0) + 1);
    }
    return counts;
  }, [activity, allTasks, dayEntries]);
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
  const heatmapData = React.useMemo(() => {
    if (!today) return [];
    const currentDate = new Date(`${today}T12:00:00`);
    return Array.from({ length: 182 }, (_, index) => {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() - 181 + index);
      const key = dateKey(date);
      return { date: key, count: activityByDate.get(key) ?? 0 };
    });
  }, [today, activityByDate]);
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
      <div className="flex min-h-48 items-center justify-center" role="status">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span className="sr-only">Loading streak activity</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <FadeIn>
        <Link
          href="/days"
          className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Card className="border-primary/20 bg-primary/[0.03] transition-colors hover:bg-primary/[0.06]">
            <CardContent className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <svg
                  className="streak-fire"
                  viewBox="0 0 32 32"
                  role="img"
                  aria-label="Fire"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="streak-fire-outer" x1="8" y1="27" x2="24" y2="4" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#F97316" />
                      <stop offset="0.55" stopColor="#FB923C" />
                      <stop offset="1" stopColor="#FACC15" />
                    </linearGradient>
                    <linearGradient id="streak-fire-inner" x1="13" y1="27" x2="19" y2="15" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FDE68A" />
                      <stop offset="1" stopColor="#FFF7CC" />
                    </linearGradient>
                  </defs>
                  <path
                    fill="url(#streak-fire-outer)"
                    d="M16 2.5c-1.6 4.1-4.1 6.2-6.3 9.4-2.1 3-3.5 5.7-3.5 8.7A9.8 9.8 0 0 0 16 30a9.8 9.8 0 0 0 9.8-9.4c0-5.3-3.3-9.8-7.5-14.2.1 3.2-.8 5-2.2 6.4.2-3.7.1-6.7-.1-10.3Z"
                  />
                  <path
                    fill="url(#streak-fire-inner)"
                    d="M16.2 15.1c-2.4 3.1-4.7 5.1-4.7 8a4.6 4.6 0 0 0 9.2 0c0-2.1-1.2-4.2-3.1-6.4-.1 1.7-.6 2.7-1.5 3.5.2-1.9.2-3.3.1-5.1Z"
                  />
                </svg>
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium">
                Daily streak
              </span>
              <span className="font-heading text-lg font-semibold tabular-nums">
                {currentStreak} days
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </CardContent>
          </Card>
        </Link>
      </FadeIn>

      <FadeIn delay={0.04}>
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

      {/* Streak overview */}
      <FadeIn delay={0.06}>
        <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
          {[
            { label: "Habits", value: activeStreaks },
            { label: "Best", value: `${longestStreak}d` },
            { label: "This week", value: `${weekDays}/7` },
            { label: "Done", value: activity.length.toLocaleString() },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex min-w-0 flex-col items-center justify-center gap-1 px-1.5 py-3 text-center sm:px-3 sm:py-4">
                <p className="truncate text-[10px] text-muted-foreground sm:text-xs">
                  {stat.label}
                </p>
                <p className="font-heading text-base font-semibold tabular-nums sm:text-xl">
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Heatmap data={heatmapData} />
      </FadeIn>

      {/* Task streaks */}
      <FadeIn delay={0.12}>
        <Card>
          <CardContent className="p-0">
            <div
              aria-label="Streaks by task"
              className="divide-y"
              role="list"
            >
              {trackedTasks.length ? trackedTasks.map((task, index) => {
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
                  transition={{ duration: 0.3, delay: index * 0.04, ease: EASE }}
                  className="flex min-w-0 items-center gap-3 px-3 py-3 sm:px-4"
                >
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">
                    {task.title}
                  </p>
                  <div className="flex shrink-0 items-center gap-2 text-xs tabular-nums sm:gap-4">
                    <span className="font-medium">{taskStreak.current}d current</span>
                    <span className="text-muted-foreground">
                      {Math.max(task.longestStreak, taskStreak.longest)}d best
                    </span>
                  </div>
                </motion.div>
                );
              }) : (
                <div className="flex flex-col items-center gap-2 p-8 text-center">
                  <p className="text-sm font-medium">No active task streaks</p>
                  <Link href="/tasks" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                    Set up a task streak
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Trend chart */}
      <FadeIn delay={0.16}>
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
