"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListTodo,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { dateKey } from "@/lib/date-utils";
import type { Task, TaskCompletion } from "@/lib/types";
import {
  TaskEditorDialog,
  taskFromForm,
  type TaskFormValues,
} from "@/components/task-editor-dialog";
import {
  isSupabaseConfigured,
  loadCompletions,
  loadTasks,
  removeCompletion,
  saveCompletion,
  saveTask,
} from "@/lib/supabase/task-data";
import { useTodayKey } from "@/lib/use-local-storage";
import { useSupabaseDataStatus } from "@/components/supabase-data-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});
const DAY_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const PRIORITY_STYLES: Record<Task["priority"], string> = {
  high: "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-300",
  medium: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  low: "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-300",
};

function localDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function monthDates(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0, 12);
  const count = Math.ceil((offset + last.getDate()) / 7) * 7;
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function isScheduledOn(task: Task, date: string) {
  const anchor = task.dueDate ?? task.createdAt;
  if (date < anchor) return false;
  if (task.repeat === "none") return date === anchor;

  const day = localDate(date);
  const anchorDate = localDate(anchor);
  switch (task.repeat) {
    case "daily":
      return true;
    case "weekdays":
      return day.getDay() !== 0 && day.getDay() !== 6;
    case "weekly":
      return day.getDay() === anchorDate.getDay();
    case "monthly":
      return day.getDate() === anchorDate.getDate();
  }
}

export default function CalendarClientPage() {
  const { user } = useAuth();
  const todayKey = useTodayKey();
  const { reportError, schemaUnavailable } = useSupabaseDataStatus();
  const [month, setMonth] = React.useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = React.useState("");
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [completions, setCompletions] = React.useState<TaskCompletion[]>([]);
  const [loadedUserId, setLoadedUserId] = React.useState<string | null>(null);
  const [savingTaskId, setSavingTaskId] = React.useState<string | null>(null);
  const [addTaskDialogOpen, setAddTaskDialogOpen] = React.useState(false);
  const [savingNewTask, setSavingNewTask] = React.useState(false);
  const [openDayKey, setOpenDayKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user?.id || !isSupabaseConfigured || schemaUnavailable) {
      return;
    }
    let active = true;
    Promise.all([loadTasks(user.id), loadCompletions(user.id)])
      .then(([remoteTasks, remoteCompletions]) => {
        if (!active) return;
        setTasks(remoteTasks);
        setCompletions(remoteCompletions);
        setLoadedUserId(user.id);
      })
      .catch((error: unknown) => {
        if (!active) return;
        reportError(error);
        setLoadedUserId(user.id);
      });
    return () => {
      active = false;
    };
  }, [reportError, schemaUnavailable, user?.id]);

  const activeMonth = React.useMemo(
    () => month ?? (todayKey ? localDate(todayKey) : new Date(2000, 0, 1, 12)),
    [month, todayKey]
  );
  const activeDate = selectedDate || todayKey;
  const loaded = Boolean(user?.id && loadedUserId === user.id);
  const dates = React.useMemo(() => monthDates(activeMonth), [activeMonth]);
  const completionKeys = React.useMemo(
    () =>
      new Set(
        completions.map((item) => `${item.taskId}:${item.completedOn}`)
      ),
    [completions]
  );
  const tasksByDate = React.useMemo(() => {
    const byDate = new Map<string, Task[]>();
    for (const date of dates) {
      const key = dateKey(date);
      byDate.set(
        key,
        tasks.filter((task) => isScheduledOn(task, key))
      );
    }
    return byDate;
  }, [dates, tasks]);
  const isComplete = (task: Task, date: string) =>
    completionKeys.has(`${task.id}:${date}`) ||
    (task.repeat === "none" &&
      task.completed &&
      (task.lastCompletedOn === date || (!task.lastCompletedOn && task.dueDate === date)));

  function moveMonth(amount: number) {
    setOpenDayKey(null);
    setMonth((current) =>
      new Date(
        (current ?? activeMonth).getFullYear(),
        (current ?? activeMonth).getMonth() + amount,
        1,
        12
      )
    );
  }

  function goToToday() {
    if (!todayKey) return;
    setOpenDayKey(null);
    const today = localDate(todayKey);
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1, 12));
    setSelectedDate(todayKey);
  }

  async function toggleTask(task: Task, date: string) {
    if (!user?.id || !date || savingTaskId) return;
    const completed = isComplete(task, date);
    const nextCompleted = !completed;
    const previousCompletions = completions;
    const updatedTask: Task = {
      ...task,
      completed:
        task.repeat === "none" && (task.dueDate ?? task.createdAt) === date
          ? nextCompleted
          : task.completed,
      lastCompletedOn: nextCompleted ? date : task.lastCompletedOn,
    };

    setSavingTaskId(task.id);
    setCompletions((current) =>
      nextCompleted
        ? [
          ...current,
          {
            taskId: task.id,
            completedOn: date,
            completedAt: new Date().toISOString(),
          },
        ]
        : current.filter(
          (item) =>
            item.taskId !== task.id || item.completedOn !== date
        )
    );
    if (task.repeat === "none") {
      setTasks((current) =>
        current.map((item) => (item.id === task.id ? updatedTask : item))
      );
    }

    try {
      if (nextCompleted) {
        await saveCompletion(user.id, {
          taskId: task.id,
          completedOn: date,
          completedAt: new Date().toISOString(),
        });
      } else {
        await removeCompletion(user.id, task.id, date);
      }
      if (task.repeat === "none") await saveTask(user.id, updatedTask);
    } catch (error) {
      setCompletions(previousCompletions);
      reportError(error);
      try {
        const [freshTasks, freshCompletions] = await Promise.all([
          loadTasks(user.id),
          loadCompletions(user.id),
        ]);
        setTasks(freshTasks);
        setCompletions(freshCompletions);
      } catch (refreshError) {
        reportError(refreshError);
      }
    } finally {
      setSavingTaskId(null);
    }
  }

  async function addTask(form: TaskFormValues) {
    if (!user?.id || !activeDate || savingNewTask) return;
    if (schemaUnavailable) return;
    const task = taskFromForm(form);

    setSavingNewTask(true);
    try {
      if (!isSupabaseConfigured) {
        throw new Error("Supabase must be configured to save calendar tasks.");
      }
      await saveTask(user.id, task);
      setTasks((current) => [task, ...current]);
      setAddTaskDialogOpen(false);
      toast.success("Task added to your calendar.");
    } catch (error) {
      reportError(error);
    } finally {
      setSavingNewTask(false);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        Connect Supabase to load your calendar and tasks.
      </div>
    );
  }
  if (schemaUnavailable) {
    return (
      <div
        className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        role="alert"
      >
        Calendar data is unavailable. Check that the Supabase task migrations have
        been applied.
      </div>
    );
  }
  if (!loaded) {
    return <PageLoadingSkeleton label="Loading your calendar" variant="calendar" />;
  }

  const monthName = MONTH_FORMAT.format(activeMonth);

  let monthScheduledCount = 0;
  let monthCompletedCount = 0;
  for (const date of dates) {
    if (
      date.getMonth() !== activeMonth.getMonth() ||
      date.getFullYear() !== activeMonth.getFullYear()
    ) {
      continue;
    }
    const key = dateKey(date);
    const dayTasks = tasksByDate.get(key) ?? [];
    monthScheduledCount += dayTasks.length;
    monthCompletedCount += dayTasks.reduce(
      (count, task) => count + (isComplete(task, key) ? 1 : 0),
      0
    );
  }

  return (
    <section className="flex min-h-[calc(100dvh-5rem)] w-full min-w-0 flex-col bg-background lg:h-full lg:min-h-0 lg:overflow-hidden">
      <TaskEditorDialog
        open={addTaskDialogOpen}
        onOpenChange={setAddTaskDialogOpen}
        groups={[]}
        defaultDueDate={activeDate}
        onSave={addTask}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-full px-4 text-sm font-medium"
              onClick={goToToday}
            >
              Today
            </Button>
            <div className="flex items-center">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-9 rounded-full"
                aria-label="Previous month"
                onClick={() => moveMonth(-1)}
              >
                <ChevronLeft className="size-5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-9 rounded-full"
                aria-label="Next month"
                onClick={() => moveMonth(1)}
              >
                <ChevronRight className="size-5" />
              </Button>
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-heading text-xl font-normal sm:text-2xl">
                {monthName}
              </h2>
              <p className="hidden text-xs text-muted-foreground sm:block">
                {monthScheduledCount} scheduled
                <span aria-hidden="true"> · </span>
                {monthCompletedCount} done
              </p>
            </div>
          </div>
          <Button
            type="button"
            className="h-9 gap-1.5 rounded-full px-4 text-sm"
            disabled={!loaded}
            onClick={() => {
              setSelectedDate(activeDate);
              setAddTaskDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            Add task
          </Button>
        </div>

        {/* Calendar */}
        <div className="flex min-h-0 flex-1 flex-col border-t border-border/70">
          {/* Weekday labels */}
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
              >
                <span className="sm:hidden">{day.slice(0, 1)}</span>
                <span className="hidden sm:inline">{day.slice(0, 3)}</span>
              </div>
            ))}
          </div>

          {/* Days */}
          <div
            className="grid min-h-0 flex-1 grid-cols-7 overflow-y-auto border-l border-border/60 [grid-template-rows:repeat(var(--week-count),minmax(5.5rem,1fr))] lg:[grid-template-rows:repeat(var(--week-count),minmax(7.5rem,1fr))]"
            style={
              {
                "--week-count": Math.max(1, dates.length / 7),
              } as React.CSSProperties
            }
          >
            {dates.map((date) => {
              const key = dateKey(date);
              const dayTasks = tasksByDate.get(key) ?? [];
              const completedCount = dayTasks.reduce(
                (count, task) => count + (isComplete(task, key) ? 1 : 0),
                0
              );
              const isCurrentMonth = date.getMonth() === activeMonth.getMonth();
              const isToday = todayKey === key;
              const isSelected = activeDate === key;
              const label =
                date.getDate() === 1
                  ? `${date.toLocaleString("en", { month: "short" })} 1`
                  : date.getDate();

              return (
                <Popover
                  key={key}
                  open={openDayKey === key}
                  onOpenChange={(open) =>
                    setOpenDayKey((current) =>
                      open ? key : current === key ? null : current
                    )
                  }
                >
                  <PopoverTrigger
                    type="button"
                    aria-label={`${DAY_FORMAT.format(date)}, ${dayTasks.length} tasks`}
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedDate(key);
                      if (
                        date.getMonth() !== activeMonth.getMonth() ||
                        date.getFullYear() !== activeMonth.getFullYear()
                      ) {
                        setMonth(
                          new Date(date.getFullYear(), date.getMonth(), 1, 12)
                        );
                      }
                    }}
                    className={cn(
                      "group relative flex min-h-0 min-w-0 flex-col items-stretch gap-1 overflow-hidden border-b border-r border-border/60 p-1 text-left transition-colors hover:bg-muted/40 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:p-1.5",
                      !isCurrentMonth && "text-muted-foreground/50",
                      isSelected && !isToday && "bg-primary/[0.04]"
                    )}
                  >
                    {/* Date number */}
                    <span className="flex shrink-0 justify-center">
                      <span
                        className={cn(
                          "flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums sm:h-8 sm:min-w-8 sm:text-sm",
                          isToday &&
                          "bg-primary font-semibold text-primary-foreground",
                          isSelected &&
                          !isToday &&
                          "bg-primary/10 text-primary"
                        )}
                      >
                        {label}
                      </span>
                    </span>

                    {/* Desktop: event chips */}
                    <span className="hidden min-h-0 flex-1 flex-col gap-0.5 overflow-hidden md:flex">
                      {dayTasks.slice(0, 3).map((task) => {
                        const done = isComplete(task, key);
                        return (
                          <span
                            key={task.id}
                            title={task.title}
                            className={cn(
                              "flex shrink-0 items-center gap-1.5 overflow-hidden rounded px-1.5 py-0.5 text-xs leading-5 transition-colors",
                              done
                                ? "bg-muted/50 text-muted-foreground line-through"
                                : "bg-primary/10 text-foreground group-hover:bg-primary/15 dark:bg-primary/20 dark:group-hover:bg-primary/25"
                            )}
                          >
                            {task.startTime && !done && (
                              <span className="shrink-0 tabular-nums text-muted-foreground">
                                {task.startTime}
                              </span>
                            )}
                            <span className="min-w-0 truncate font-medium">{task.title}</span>
                          </span>
                        );
                      })}
                      {dayTasks.length > 3 && (
                        <span className="px-1.5 text-xs font-medium text-muted-foreground">
                          {dayTasks.length - 3} more
                        </span>
                      )}
                    </span>

                    {/* Mobile: dots */}
                    {dayTasks.length > 0 && (
                      <span
                        className="mt-auto flex shrink-0 justify-center gap-1 pb-1 md:hidden"
                        aria-hidden="true"
                      >
                        {dayTasks.slice(0, 3).map((task) => (
                          <span
                            key={task.id}
                            className={cn(
                              "size-1.5 rounded-full",
                              isComplete(task, key)
                                ? "bg-muted-foreground/40"
                                : "bg-primary"
                            )}
                          />
                        ))}
                      </span>
                    )}
                  </PopoverTrigger>

                  <PopoverContent
                    side="bottom"
                    align="center"
                    sideOffset={6}
                    className="w-[min(24rem,calc(100vw-1rem))] gap-0 overflow-hidden rounded-xl border border-border/70 bg-popover p-0 shadow-xl"
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold">
                          {DAY_FORMAT.format(date)}
                        </h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {completedCount} of {dayTasks.length}{" "}
                          {dayTasks.length === 1 ? "task" : "tasks"} done
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 shrink-0 gap-1 rounded-full px-3 text-xs"
                        disabled={!loaded}
                        onClick={() => {
                          setOpenDayKey(null);
                          setSelectedDate(key);
                          setAddTaskDialogOpen(true);
                        }}
                      >
                        <Plus className="size-3.5" />
                        Add
                      </Button>
                    </div>

                    {dayTasks.length > 0 ? (
                      <ul className="max-h-[min(60dvh,24rem)] overflow-y-auto overscroll-contain">
                        {dayTasks.map((task) => {
                          const completed = isComplete(task, key);
                          return (
                            <li
                              key={task.id}
                              className="flex items-start gap-3 border-b border-border/60 px-4 py-3 last:border-b-0"
                            >
                              <Checkbox
                                checked={completed}
                                disabled={savingTaskId === task.id}
                                onCheckedChange={() => void toggleTask(task, key)}
                                aria-label={`${completed ? "Uncomplete" : "Complete"} ${task.title}`}
                                className="mt-0.5"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p
                                    className={cn(
                                      "text-sm font-medium leading-5",
                                      completed &&
                                      "text-muted-foreground line-through"
                                    )}
                                  >
                                    {task.title}
                                  </p>
                                  {task.startTime && (
                                    <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground">
                                      <Clock3 className="size-3" />
                                      {task.startTime}
                                      {task.duration ? ` · ${task.duration}m` : ""}
                                    </span>
                                  )}
                                </div>
                                {task.notes && (
                                  <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                                    {task.notes}
                                  </p>
                                )}
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                                  <span
                                    className={cn(
                                      "rounded-full border px-2 py-0.5 font-medium capitalize",
                                      PRIORITY_STYLES[task.priority]
                                    )}
                                  >
                                    {task.priority}
                                  </span>
                                  {task.repeat !== "none" && (
                                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 capitalize text-muted-foreground">
                                      {task.repeat}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                        <ListTodo className="size-5 text-muted-foreground/60" />
                        <p className="text-sm text-muted-foreground">
                          Nothing planned for this day.
                        </p>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
