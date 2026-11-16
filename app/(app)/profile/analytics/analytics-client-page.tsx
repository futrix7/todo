"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock,
  Flame,
  Sprout,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import { useAuth } from "@/lib/auth";
import { dateKey, shortLabel } from "@/lib/date-utils";
import { getActivityStreaks } from "@/lib/task-activity";
import { getHabitConsistencySeries } from "@/lib/habit-analytics";
import type { Habit, HabitLog } from "@/lib/habits";
import {
  getDayRatingScore,
  type DayEntry,
  type Task,
  type TaskCompletion,
} from "@/lib/types";
import { useTodayKey } from "@/lib/use-local-storage";
import {
  isTaskDataSchemaUnavailable,
  isSupabaseConfigured,
  loadCompletions,
  loadDayEntries,
  loadTasks,
} from "@/lib/supabase/task-data";
import {
  isMissingHabitDataSchemaError,
  loadHabitLogs,
  loadHabits,
} from "@/lib/supabase/habit-data";
import { useSupabaseDataStatus } from "@/components/supabase-data-provider";
import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";
import { HabitIcon } from "@/components/habit-icon";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
];
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const activityConfig = {
  completed: { label: "Completed", color: "var(--chart-1)" },
} satisfies ChartConfig;

const weeklyConfig = {
  thisWeek: { label: "This week", color: "var(--chart-1)" },
  lastWeek: { label: "Last week", color: "var(--chart-2)" },
} satisfies ChartConfig;

const dayRatingConfig = {
  rating: { label: "Daily rating", color: "var(--chart-1)" },
} satisfies ChartConfig;

const habitConsistencyConfig = {
  consistency: { label: "Consistency", color: "var(--chart-1)" },
} satisfies ChartConfig;

const habitActivityConfig = {
  completed: { label: "Completed", color: "var(--chart-1)" },
} satisfies ChartConfig;

function getDateKeys(today: string, count: number) {
  if (!today) return [];
  const date = new Date(`${today}T12:00:00`);
  return Array.from({ length: count }, (_, index) => {
    const current = new Date(date);
    current.setDate(date.getDate() - (count - index - 1));
    return dateKey(current);
  });
}

function displayDuration(minutes: number) {
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
}

function EmptyChart({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[320px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export default function AnalyticsClientPage() {
  const { user } = useAuth();
  const { schemaUnavailable, reportError } = useSupabaseDataStatus();
  const today = useTodayKey();
  const [range, setRange] = React.useState("14");
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [completions, setCompletions] = React.useState<TaskCompletion[]>([]);
  const [dayEntries, setDayEntries] = React.useState<DayEntry[]>([]);
  const [habits, setHabits] = React.useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = React.useState<HabitLog[]>([]);
  const [habitSchemaUnavailable, setHabitSchemaUnavailable] =
    React.useState(false);
  const [loadedUserId, setLoadedUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!user?.id) return;
    if (!today) return;

    const userId = user.id;
    if (schemaUnavailable || isTaskDataSchemaUnavailable()) return;

    let active = true;
    Promise.allSettled([
      loadTasks(userId),
      loadCompletions(userId),
      loadDayEntries(userId),
      loadHabits(userId),
      loadHabitLogs(userId, getDateKeys(today, 30)[0]),
    ]).then((results) => {
      if (!active) return;
      const [taskResult, completionResult, dayResult, habitResult, logsResult] =
        results;
      setTasks([]);
      setCompletions([]);
      setDayEntries([]);
      setHabits([]);
      setHabitLogs([]);
      setHabitSchemaUnavailable(false);
      if (taskResult.status === "fulfilled") setTasks(taskResult.value);
      if (completionResult.status === "fulfilled") {
        setCompletions(completionResult.value);
      }
      if (dayResult.status === "fulfilled") setDayEntries(dayResult.value);
      if (habitResult.status === "fulfilled") setHabits(habitResult.value);
      if (logsResult.status === "fulfilled") setHabitLogs(logsResult.value);
      const taskFailure = results
        .slice(0, 3)
        .find((result) => result.status === "rejected");
      const habitFailure = results
        .slice(3)
        .find((result) => result.status === "rejected");
      if (taskFailure?.status === "rejected") {
        reportError(taskFailure.reason);
      } else if (habitFailure?.status === "rejected") {
        if (isMissingHabitDataSchemaError(habitFailure.reason)) {
          setHabitSchemaUnavailable(true);
        } else {
          reportError(habitFailure.reason);
        }
      }
      setLoadedUserId(userId);
    });

    return () => {
      active = false;
    };
  }, [user?.id, today, setTasks, setCompletions, setDayEntries, reportError, schemaUnavailable]);

  const rangeDays = Number(range);
  const dates = React.useMemo(
    () => getDateKeys(today, rangeDays),
    [today, rangeDays]
  );
  const dateSet = React.useMemo(() => new Set(dates), [dates]);
  const activeHabits = React.useMemo(
    () => habits.filter((habit) => !habit.archived),
    [habits]
  );
  const habitConsistencyData = React.useMemo(
    () => getHabitConsistencySeries(activeHabits, habitLogs, dates),
    [activeHabits, dates, habitLogs]
  );
  const habitScheduledCount = habitConsistencyData.reduce(
    (total, point) => total + point.scheduled,
    0
  );
  const habitCompletedCount = habitConsistencyData.reduce(
    (total, point) => total + point.completed,
    0
  );
  const habitConsistency = habitScheduledCount
    ? Math.round((habitCompletedCount / habitScheduledCount) * 100)
    : null;
  const habitBreakdown = React.useMemo(
    () =>
      activeHabits
        .map((habit) => {
          const series = getHabitConsistencySeries([habit], habitLogs, dates);
          const scheduled = series.reduce(
            (total, point) => total + point.scheduled,
            0
          );
          const completed = series.reduce(
            (total, point) => total + point.completed,
            0
          );
          return {
            habit,
            series,
            scheduled,
            completed,
            consistency: scheduled
              ? Math.round((completed / scheduled) * 100)
              : null,
          };
        })
        .sort((a, b) => {
          if (a.consistency === null) return 1;
          if (b.consistency === null) return -1;
          return b.consistency - a.consistency;
        }),
    [activeHabits, dates, habitLogs]
  );

  const allCompletions = React.useMemo(() => {
    const byKey = new Map(
      completions.map((completion) => [
        `${completion.taskId}:${completion.completedOn}`,
        completion,
      ])
    );
    for (const task of tasks) {
      const completedOn = task.lastCompletedOn;
      if (!completedOn) continue;
      const key = `${task.id}:${completedOn}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          taskId: task.id,
          completedOn,
          completedAt: `${completedOn}T12:00:00`,
        });
      }
    }
    return [...byKey.values()];
  }, [completions, tasks]);

  const rangeCompletions = React.useMemo(
    () => allCompletions.filter((completion) => dateSet.has(completion.completedOn)),
    [allCompletions, dateSet]
  );
  const completedToday = new Set(
    allCompletions
      .filter((completion) => completion.completedOn === today)
      .map((completion) => completion.taskId)
  );
  const taskById = React.useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks]
  );

  const activityData = React.useMemo(
    () =>
      dates.map((date) => ({
        day: shortLabel(date),
        completed: rangeCompletions.filter(
          (completion) => completion.completedOn === date
        ).length,
      })),
    [dates, rangeCompletions]
  );

  const categoryData = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const completion of rangeCompletions) {
      const task = taskById.get(completion.taskId);
      if (task) counts.set(task.category, (counts.get(task.category) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, value], index) => ({
      name,
      value,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [rangeCompletions, taskById]);

  const dayRatingData = React.useMemo(() => {
    const ratingByDate = new Map(
      dayEntries
        .filter((entry) => dateSet.has(entry.date))
        .map((entry) => [entry.date, getDayRatingScore(entry.rating)])
    );
    return dates.flatMap((date) => {
      const rating = ratingByDate.get(date);
      return rating
        ?         [{ date, day: shortLabel(date), rating }]
        : [];
    });
  }, [dates, dateSet, dayEntries]);

  const weeklyComparison = React.useMemo(() => {
    if (!today) return [];
    const todayDate = new Date(`${today}T12:00:00`);
    const mondayOffset = (todayDate.getDay() + 6) % 7;
    const startOfWeek = new Date(todayDate);
    startOfWeek.setDate(todayDate.getDate() - mondayOffset);

    return Array.from({ length: 7 }, (_, index) => {
      const thisDate = new Date(startOfWeek);
      thisDate.setDate(startOfWeek.getDate() + index);
      const lastDate = new Date(thisDate);
      lastDate.setDate(thisDate.getDate() - 7);
      const thisKey = dateKey(thisDate);
      const lastKey = dateKey(lastDate);
      return {
        day: thisDate.toLocaleDateString(undefined, { weekday: "short" }),
        thisWeek: allCompletions.filter((item) => item.completedOn === thisKey).length,
        lastWeek: allCompletions.filter((item) => item.completedOn === lastKey).length,
      };
    });
  }, [allCompletions, today]);

  const focusMinutes = rangeCompletions.reduce(
    (total, completion) =>
      total + (taskById.get(completion.taskId)?.duration ?? 0),
    0
  );
  const completionRate = tasks.length
    ? Math.round((completedToday.size / tasks.length) * 100)
    : 0;
  const currentStreak = Math.max(
    0,
    ...tasks.map((task) =>
      getActivityStreaks(
        allCompletions.filter((completion) => completion.taskId === task.id),
        today
      ).current
    )
  );
  const hasWeeklyCompletions = weeklyComparison.some(
    (day) => day.thisWeek > 0 || day.lastWeek > 0
  );
  const kpis = [
    {
      label: `Completed in last ${range} days`,
      value: String(rangeCompletions.length),
      detail: rangeCompletions.length
        ? "Recorded task completions"
        : "No completions recorded yet",
      icon: CheckCircle2,
    },
    {
      label: "Today's completion rate",
      value: `${completionRate}%`,
      detail: tasks.length
        ? `${completedToday.size} of ${tasks.length} tasks done today`
        : "Add tasks to start tracking",
      icon: TrendingUp,
    },
    {
      label: "Focus time completed",
      value: displayDuration(focusMinutes),
      detail: focusMinutes ? "Based on task duration" : "No focus time recorded yet",
      icon: Clock,
    },
    {
      label: "Best active streak",
      value: `${currentStreak}d`,
      detail: tasks.some((task) => task.streakEnabled)
        ? "Across tracked tasks"
        : "Enable streaks on a task to track",
      icon: Flame,
    },
    {
      label: "Habit consistency",
      value: habitConsistency === null ? "—" : `${habitConsistency}%`,
      detail: habitScheduledCount
        ? `${habitCompletedCount} of ${habitScheduledCount} scheduled check-ins`
        : "No scheduled habits in this range",
      icon: CheckCircle2,
    },
  ];

  if (isSupabaseConfigured && !user?.id) {
    return (
      <div
        className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        role="alert"
      >
        A valid Supabase session is required to load analytics.
      </div>
    );
  }

  if (
    isSupabaseConfigured &&
    loadedUserId !== user?.id &&
    !schemaUnavailable
  ) {
    return <PageLoadingSkeleton label="Loading analytics" variant="analytics" />;
  }

  return (
    <div className="-mx-3 -my-4 flex min-h-dvh w-[calc(100%+1.5rem)] min-w-0 flex-col sm:-mx-4 sm:-my-6 sm:w-[calc(100%+2rem)] md:-mx-6 md:-my-8 md:w-[calc(100%+3rem)] lg:-mx-8 lg:-my-6 lg:w-[calc(100%+4rem)]">
      <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b px-3 pb-3 pt-5 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            aria-label="Back to profile"
            className="inline-flex size-9 shrink-0 items-center justify-center border transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="font-heading text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
              Analytics
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              Task, habit, and mood trends.
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Select
            value={range}
            onValueChange={(value) => setRange(value ?? "14")}
            items={RANGE_OPTIONS}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <section
        aria-label="Analytics summary"
        className="grid grid-cols-2 border-b sm:grid-cols-5"
      >
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className={`flex min-h-24 items-start gap-3 px-3 py-3 sm:px-4 md:px-6 lg:px-8 ${
                index % 2 === 0 ? "border-r sm:border-r-0" : ""
              } ${index < 4 ? "border-b sm:border-b-0" : ""} ${
                index < 4 ? "sm:border-r" : ""
              }`}
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="mt-1 font-heading text-2xl font-semibold leading-tight tabular-nums">
                  {kpi.value}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                  {kpi.detail}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      {habitSchemaUnavailable && (
        <p
          className="border-b bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
          role="alert"
        >
          Habit analytics require the <code>habits</code> and{" "}
          <code>habit_logs</code> tables. Apply <code>supabase/schema.sql</code>{" "}
          in your Supabase project.
        </p>
      )}

      <div className="grid min-w-0 flex-1 grid-cols-1 sm:grid-cols-2">
        <section className="min-w-0 border-b px-3 py-3 sm:border-r sm:px-4 md:px-6 lg:px-8">
          <div className="mb-2 flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Task activity</h2>
            <span className="ml-auto text-xs text-muted-foreground">{range} days</span>
          </div>
            {rangeCompletions.length ? (
              <ChartContainer
                config={activityConfig}
                className="h-[320px] w-full sm:h-[360px]"
              >
                <AreaChart data={activityData} margin={{ left: 4, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="completed" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.14} strokeWidth={2.5} />
                </AreaChart>
              </ChartContainer>
            ) : (
              <EmptyChart>No task completions recorded in this date range.</EmptyChart>
            )}
        </section>

        <section className="min-w-0 border-b px-3 py-3 sm:px-4 md:px-6 lg:px-8">
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Day ratings</h2>
            <span className="ml-auto text-xs text-muted-foreground">{range} days</span>
          </div>
            {dayEntries.some((entry) => dateSet.has(entry.date)) ? (
              <ChartContainer
                config={dayRatingConfig}
                className="h-[320px] w-full sm:h-[360px]"
              >
                <BarChart
                  data={dayRatingData}
                  margin={{ left: 4, right: 8, top: 8 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={28}
                  />
                  <YAxis
                    allowDecimals={false}
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    tickLine={false}
                    axisLine={false}
                    width={38}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => [
                          `${Number(value)}/5`,
                          "Rating",
                        ]}
                      />
                    }
                  />
                  <Bar dataKey="rating" radius={[5, 5, 0, 0]} barSize={18}>
                    {dayRatingData.map((entry) => (
                      <Cell
                        key={entry.date}
                        fill={
                          entry.rating >= 3
                            ? "var(--chart-1)"
                            : "var(--chart-2)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChart>No day ratings recorded in this date range.</EmptyChart>
            )}
        </section>

        <section className="min-w-0 border-b px-3 py-3 sm:border-r sm:px-4 md:px-6 lg:px-8">
          <div className="mb-2 flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Completions by category</h2>
          </div>
              {categoryData.length ? (
                <ChartContainer
                  config={Object.fromEntries(
                    categoryData.map((item) => [
                      item.name,
                      { label: item.name, color: item.fill },
                    ])
                  )}
                  className="mx-auto h-[320px] w-full max-w-[420px] sm:h-[360px]"
                >
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                    <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={55} paddingAngle={4} stroke="none">
                      {categoryData.map((item) => (
                        <Cell key={item.name} fill={item.fill} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                  </PieChart>
                </ChartContainer>
              ) : (
                <EmptyChart>No categorized task completions in this date range.</EmptyChart>
              )}
        </section>

        <section className="min-w-0 border-b px-3 py-3 sm:col-span-1 sm:border-r sm:px-4 md:px-6 lg:px-8">
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle2 className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Habit consistency</h2>
            <span className="ml-auto text-xs text-muted-foreground">{range} days</span>
          </div>
          {habitScheduledCount ? (
            <ChartContainer
              config={habitConsistencyConfig}
              className="h-[320px] w-full sm:h-[360px]"
            >
              <AreaChart data={habitConsistencyData} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickLine={false} axisLine={false} width={34} unit="%" />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, _name, item) => {
                        const point = item.payload as (typeof habitConsistencyData)[number];
                        return [
                          `${Number(value)}% (${point.completed}/${point.scheduled})`,
                          "Consistency",
                        ];
                      }}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="consistency"
                  stroke="var(--chart-1)"
                  fill="var(--chart-1)"
                  fillOpacity={0.14}
                  connectNulls
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <EmptyChart>
              {activeHabits.length
                ? "No habits were scheduled in this date range."
                : "Create an active habit to start tracking consistency."}
            </EmptyChart>
          )}
        </section>

        <section className="min-w-0 border-b px-3 py-3 sm:border-r sm:px-4 md:px-6 lg:px-8">
          <div className="mb-2 flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Habit check-ins</h2>
            <span className="ml-auto text-xs text-muted-foreground">{range} days</span>
          </div>
          {habitScheduledCount ? (
            <ChartContainer
              config={habitActivityConfig}
              className="h-[320px] w-full sm:h-[360px]"
            >
              <BarChart data={habitConsistencyData} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="completed" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyChart>No scheduled habit check-ins in this date range.</EmptyChart>
          )}
        </section>

        <section className="min-w-0 border-b px-3 py-3 sm:px-4 md:px-6 lg:px-8">
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Weekly comparison</h2>
          </div>
          {hasWeeklyCompletions ? (
            <ChartContainer config={weeklyConfig} className="h-[320px] w-full sm:h-[360px]">
              <BarChart data={weeklyComparison} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="lastWeek" fill="var(--chart-2)" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="thisWeek" fill="var(--chart-1)" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyChart>No task completions recorded yet.</EmptyChart>
          )}
        </section>

        <section className="min-w-0 border-b px-3 py-3 sm:col-span-2 sm:px-4 md:px-6 lg:px-8">
          <div className="mb-2 flex items-center gap-2">
            <Sprout className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Consistency by habit</h2>
            <span className="ml-auto text-xs text-muted-foreground">
              {range} days
            </span>
            <Link
              href="/habits"
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Manage habits
            </Link>
          </div>
          {habitBreakdown.length ? (
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              {habitBreakdown.map(
                ({ habit, series, scheduled, completed, consistency }) => (
                  <article
                    key={habit.id}
                    className="min-w-0 rounded-xl border bg-card/40 p-3"
                  >
                    <div className="mb-2 flex items-center gap-2.5">
                      <span
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary"
                        aria-hidden="true"
                      >
                        <HabitIcon
                          value={habit.emoji || "sparkles"}
                          className="size-4"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3
                          className="truncate text-sm font-semibold"
                          title={habit.name}
                        >
                          {habit.name}
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          {completed} of {scheduled} scheduled check-ins
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {consistency === null ? "—" : `${consistency}%`}
                      </span>
                    </div>
                    {scheduled ? (
                      <ChartContainer
                        config={habitConsistencyConfig}
                        className="h-[200px] w-full"
                      >
                        <AreaChart
                          data={series}
                          margin={{ left: 0, right: 6, top: 4 }}
                        >
                          <CartesianGrid
                            vertical={false}
                            strokeDasharray="3 3"
                          />
                          <XAxis
                            dataKey="day"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={6}
                            minTickGap={24}
                          />
                          <YAxis
                            domain={[0, 100]}
                            ticks={[0, 50, 100]}
                            tickLine={false}
                            axisLine={false}
                            width={30}
                            unit="%"
                          />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                formatter={(value, _name, item) => {
                                  const point = item.payload as (typeof series)[number];
                                  return [
                                    `${Number(value)}% (${point.completed}/${point.scheduled})`,
                                    "Consistency",
                                  ];
                                }}
                              />
                            }
                          />
                          <Area
                            type="monotone"
                            dataKey="consistency"
                            stroke="var(--chart-1)"
                            fill="var(--chart-1)"
                            fillOpacity={0.14}
                            connectNulls
                          />
                        </AreaChart>
                      </ChartContainer>
                    ) : (
                      <div className="flex h-[200px] items-center justify-center px-3 text-center text-xs text-muted-foreground">
                        No scheduled days in this range.
                      </div>
                    )}
                  </article>
                )
              )}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              Create an active habit to see a consistency graph for it.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
