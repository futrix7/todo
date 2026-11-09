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
  Smile,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import { useAuth } from "@/lib/auth";
import { dateKey, shortLabel } from "@/lib/date-utils";
import { getActivityStreaks } from "@/lib/task-activity";
import type { DayEntry, Task, TaskCompletion } from "@/lib/types";
import { useTodayKey } from "@/lib/use-local-storage";
import {
  isTaskDataSchemaUnavailable,
  isSupabaseConfigured,
  loadCompletions,
  loadDayEntries,
  loadTasks,
} from "@/lib/supabase/task-data";
import { useSupabaseDataStatus } from "@/components/supabase-data-provider";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { FadeIn } from "@/components/motion-fade";
import { MetricCard } from "@/components/metric-card";

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
  created: { label: "Created", color: "var(--chart-2)" },
} satisfies ChartConfig;

const hourlyConfig = {
  minutes: { label: "Focus minutes", color: "var(--chart-1)" },
} satisfies ChartConfig;

const weeklyConfig = {
  thisWeek: { label: "This week", color: "var(--chart-1)" },
  lastWeek: { label: "Last week", color: "var(--chart-2)" },
} satisfies ChartConfig;

const moodConfig = {
  mood: { label: "Mood", color: "var(--chart-1)" },
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
    <div className="flex h-[210px] items-center justify-center px-4 text-center text-sm text-muted-foreground sm:h-[260px]">
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
  const [loadedUserId, setLoadedUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!user?.id) return;

    const userId = user.id;
    if (schemaUnavailable || isTaskDataSchemaUnavailable()) return;

    let active = true;
    loadTasks(userId)
      .then(async (remoteTasks) => {
        if (!active) return;
        setTasks(remoteTasks);
        const remoteCompletions = await loadCompletions(userId);
        if (!active) return;
        setCompletions(remoteCompletions);
        const remoteDayEntries = await loadDayEntries(userId);
        if (!active) return;
        setDayEntries(remoteDayEntries);
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
  }, [user?.id, setTasks, setCompletions, setDayEntries, reportError, schemaUnavailable]);

  const rangeDays = Number(range);
  const dates = React.useMemo(
    () => getDateKeys(today, rangeDays),
    [today, rangeDays]
  );
  const dateSet = React.useMemo(() => new Set(dates), [dates]);

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
        created: tasks.filter((task) => task.createdAt === date).length,
      })),
    [dates, rangeCompletions, tasks]
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

  const moodData = React.useMemo(
    () =>
      dayEntries
        .filter((entry) => dateSet.has(entry.date))
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((entry) => ({ day: shortLabel(entry.date), mood: entry.mood })),
    [dayEntries, dateSet]
  );

  const focusData = React.useMemo(() => {
    const hours = new Map<number, number>();
    for (const completion of rangeCompletions) {
      const task = taskById.get(completion.taskId);
      if (!task?.startTime) continue;
      const hour = Number(task.startTime.split(":")[0]);
      if (!Number.isFinite(hour)) continue;
      hours.set(hour, (hours.get(hour) ?? 0) + (task.duration ?? 0));
    }
    return [...hours.entries()]
      .sort(([a], [b]) => a - b)
      .map(([hour, minutes]) => ({
        hour: new Date(2000, 0, 1, hour).toLocaleTimeString(undefined, {
          hour: "numeric",
        }),
        minutes,
      }));
  }, [rangeCompletions, taskById]);

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
      label: `Completed in ${range} days`,
      value: String(rangeCompletions.length),
      detail: rangeCompletions.length
        ? "Recorded task completions"
        : "No completions recorded yet",
      icon: CheckCircle2,
    },
    {
      label: "Current completion rate",
      value: `${completionRate}%`,
      detail: tasks.length
        ? `${completedToday.size} of ${tasks.length} tasks done today`
        : "Add tasks to start tracking",
      icon: TrendingUp,
    },
    {
      label: "Completed focus time",
      value: displayDuration(focusMinutes),
      detail: focusMinutes ? "Based on task duration" : "No focus time recorded yet",
      icon: Clock,
    },
    {
      label: "Best current streak",
      value: `${currentStreak}d`,
      detail: tasks.some((task) => task.streakEnabled)
        ? "Across tracked tasks"
        : "Enable streaks on a task to track",
      icon: Flame,
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
    return (
      <div className="flex min-h-48 items-center justify-center" role="status">
        <Activity className="size-6 animate-pulse text-primary" />
        <span className="sr-only">Loading analytics</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <FadeIn className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            aria-label="Back to profile"
            className="inline-flex size-9 items-center justify-center rounded-xl border transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Analytics
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 className="hidden size-4 text-muted-foreground sm:block" />
          <Select
            value={range}
            onValueChange={(value) => setRange(value ?? "14")}
            items={RANGE_OPTIONS}
          >
            <SelectTrigger className="w-40">
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
      </FadeIn>

      <div className="grid min-w-0 grid-cols-2 items-stretch gap-2.5 sm:gap-4 lg:grid-cols-4">
        {kpis.map((kpi, index) => {
          return (
            <MetricCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              detail={kpi.detail}
              icon={kpi.icon}
              delay={index * 0.05}
            />
          );
        })}
      </div>

      <FadeIn delay={0.1} className="min-w-0">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-4 text-primary" /> Task activity
              </CardTitle>
              <Badge variant="outline">Last {range} days</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {rangeCompletions.length || tasks.some((task) => dates.includes(task.createdAt)) ? (
              <ChartContainer
                config={activityConfig}
                className="h-[210px] w-full sm:h-[280px]"
              >
                <AreaChart data={activityData} margin={{ left: 4, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area type="monotone" dataKey="completed" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.14} strokeWidth={2.5} />
                  <Area type="monotone" dataKey="created" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.08} strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            ) : (
              <EmptyChart>No task activity recorded in this date range.</EmptyChart>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-3">
        <FadeIn delay={0.12} className="min-w-0">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Completions by category</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length ? (
                <ChartContainer
                  config={Object.fromEntries(
                    categoryData.map((item) => [
                      item.name,
                      { label: item.name, color: item.fill },
                    ])
                  )}
                  className="mx-auto aspect-square max-h-[220px] w-full sm:max-h-[260px]"
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
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.16} className="min-w-0 lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smile className="size-4 text-primary" /> Mood check-ins
              </CardTitle>
            </CardHeader>
            <CardContent>
              {moodData.length ? (
                <ChartContainer config={moodConfig} className="h-[210px] w-full sm:h-[260px]">
                  <LineChart data={moodData} margin={{ left: 4, right: 8, top: 8 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                    <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tickLine={false} axisLine={false} width={28} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="mood" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--chart-1)" }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ChartContainer>
              ) : (
                <EmptyChart>No mood check-ins recorded in this date range.</EmptyChart>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2">
        <FadeIn delay={0.14} className="min-w-0">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-4 text-primary" /> Completed focus time by hour
              </CardTitle>
            </CardHeader>
            <CardContent>
              {focusData.length ? (
                <ChartContainer config={hourlyConfig} className="h-[200px] w-full sm:h-[240px]">
                  <BarChart data={focusData} margin={{ left: 4, right: 8, top: 8 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="minutes" fill="var(--chart-1)" radius={[6, 6, 0, 0]} barSize={18} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <EmptyChart>No completed tasks with a scheduled time in this date range.</EmptyChart>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.18} className="min-w-0">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" /> Weekly comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasWeeklyCompletions ? (
                <ChartContainer config={weeklyConfig} className="h-[200px] w-full sm:h-[240px]">
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
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}
