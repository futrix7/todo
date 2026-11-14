"use client";

import * as React from "react";
import {
  CalendarDays,
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
  const scheduledForDate = activeDate
    ? tasksByDate.get(activeDate) ?? []
    : [];
  const isComplete = (task: Task, date: string) =>
    completionKeys.has(`${task.id}:${date}`) ||
    (task.repeat === "none" &&
      task.completed &&
      (task.lastCompletedOn === date || (!task.lastCompletedOn && task.dueDate === date)));

  function moveMonth(amount: number) {
    setMonth((current) =>
      new Date(
        (current ?? activeMonth).getFullYear(),
        (current ?? activeMonth).getMonth() + amount,
        1,
        12
      )
    );
  }

  async function toggleTask(task: Task) {
    if (!user?.id || !activeDate || savingTaskId) return;
    const completed = isComplete(task, activeDate);
    const nextCompleted = !completed;
    const previousCompletions = completions;
    const updatedTask: Task = {
      ...task,
      completed:
        task.repeat === "none" && (task.dueDate ?? task.createdAt) === activeDate
          ? nextCompleted
          : task.completed,
      lastCompletedOn: nextCompleted ? activeDate : task.lastCompletedOn,
    };

    setSavingTaskId(task.id);
    setCompletions((current) =>
      nextCompleted
        ? [
            ...current,
            {
              taskId: task.id,
              completedOn: activeDate,
              completedAt: new Date().toISOString(),
            },
          ]
        : current.filter(
            (item) =>
              item.taskId !== task.id || item.completedOn !== activeDate
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
          completedOn: activeDate,
          completedAt: new Date().toISOString(),
        });
      } else {
        await removeCompletion(user.id, task.id, activeDate);
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

  const selectedDateTasks = scheduledForDate;
  const monthName = MONTH_FORMAT.format(activeMonth);

  return (
    <section className="flex min-h-[calc(100dvh-5rem)] w-full min-w-0 flex-col bg-background lg:h-full lg:min-h-0">
      <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/70 px-3 pb-3 pt-3 sm:min-h-16 sm:gap-3 sm:px-4 sm:pb-4 sm:pt-4 md:px-5 lg:min-h-16 lg:px-5 lg:pt-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
            <CalendarDays className="size-5" />
            Calendar
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Plan upcoming tasks and review completed days.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm"
          onClick={() => {
            if (!todayKey) return;
            const today = localDate(todayKey);
            setMonth(new Date(today.getFullYear(), today.getMonth(), 1, 12));
            setSelectedDate(todayKey);
          }}
        >
          Today
        </Button>
      </header>

      <TaskEditorDialog
        open={addTaskDialogOpen}
        onOpenChange={setAddTaskDialogOpen}
        groups={[]}
        defaultDueDate={activeDate}
        onSave={addTask}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-3 pb-4 pt-3 sm:px-4 sm:pb-5 sm:pt-4 md:px-5 lg:flex-row lg:gap-0 lg:px-5 lg:pb-5 lg:pt-4">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-card/10">
          <div className="flex min-h-12 items-center justify-between border-b border-border/70 px-2 sm:min-h-14 sm:px-3">
            <h2 className="text-sm font-semibold sm:text-base">{monthName}</h2>
            <div className="flex gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-9"
                aria-label="Previous month"
                onClick={() => moveMonth(-1)}
              >
                <ChevronLeft className="size-[18px]" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-9"
                aria-label="Next month"
                onClick={() => moveMonth(1)}
              >
                <ChevronRight className="size-[18px]" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-border/70">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-[10px] font-medium text-muted-foreground sm:text-xs"
              >
                <span className="sm:hidden">{day.slice(0, 1)}</span>
                <span className="hidden sm:inline">{day}</span>
              </div>
            ))}
          </div>

          <div
            className="grid min-h-0 flex-1 grid-cols-7 lg:[grid-template-rows:repeat(var(--week-count),minmax(0,1fr))]"
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
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={`${DAY_FORMAT.format(date)}, ${dayTasks.length} tasks`}
                  aria-pressed={activeDate === key}
                  onClick={() => {
                    setSelectedDate(key);
                    if (date.getMonth() !== activeMonth.getMonth()) {
                      setMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12));
                    }
                  }}
                  className={cn(
                    "group flex min-h-[52px] min-w-0 flex-col items-stretch border-b border-r border-border/60 px-1.5 py-1.5 text-left text-xs transition-colors hover:bg-muted/60 sm:min-h-[76px] sm:p-2 sm:text-sm lg:min-h-0 lg:overflow-hidden",
                    !isCurrentMonth && "bg-muted/20 text-muted-foreground/60",
                    activeDate === key && "bg-primary/[0.04]",
                    todayKey === key && "font-semibold"
                  )}
                >
                  <div className="flex w-full min-w-0 items-center justify-between gap-1">
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium tabular-nums sm:size-7 sm:text-xs",
                        todayKey === key &&
                          "bg-primary font-semibold text-primary-foreground"
                      )}
                    >
                      {date.getDate()}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="hidden shrink-0 text-[10px] tabular-nums text-muted-foreground lg:block">
                        {completedCount}/{dayTasks.length}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 hidden min-h-0 flex-1 flex-col gap-0.5 overflow-hidden lg:flex">
                    {dayTasks.slice(0, 3).map((task) => (
                      <span
                        key={task.id}
                        title={task.title}
                        className={cn(
                          "truncate rounded px-1 text-[11px] leading-[1.1rem]",
                          isComplete(task, key)
                            ? "bg-muted text-muted-foreground line-through"
                            : "bg-primary/10 text-foreground group-hover:bg-primary/15"
                        )}
                      >
                        {task.startTime ? `${task.startTime} ` : ""}
                        {task.title}
                      </span>
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="truncate px-1 text-[10px] text-muted-foreground">
                        +{dayTasks.length - 3} more
                      </span>
                    )}
                  </div>
                  {dayTasks.length > 0 && (
                    <span
                      className="mt-auto flex flex-wrap gap-0.5 lg:hidden"
                      aria-hidden="true"
                    >
                      {dayTasks.slice(0, 3).map((task) => (
                        <span
                          key={task.id}
                          className={cn(
                            "size-1 rounded-full bg-muted-foreground/50",
                            isComplete(task, key) && "bg-primary"
                          )}
                        />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          </div>
        </section>

        <aside
          className={cn(
            "flex min-h-56 w-full shrink-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card/40 lg:h-full lg:min-h-0 lg:w-80 lg:rounded-none lg:border-y-0 lg:border-l lg:border-r-0 xl:w-96",
            !selectedDate && "hidden lg:flex"
          )}
          aria-label="Selected day"
        >
        <div className="flex min-h-14 items-center justify-between border-b px-3 sm:px-4">
          <div>
            <h2 className="text-sm font-semibold sm:text-base">
              {activeDate ? DAY_FORMAT.format(localDate(activeDate)) : "Selected day"}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {selectedDateTasks.length} scheduled{" "}
              {selectedDateTasks.length === 1 ? "task" : "tasks"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Add task"
              disabled={!loaded || !activeDate}
              onClick={() => setAddTaskDialogOpen(true)}
            >
              <Plus />
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {selectedDateTasks.length ? (
          <ul className="divide-y">
            {selectedDateTasks.map((task) => {
              const completed = isComplete(task, activeDate);
              return (
                <li key={task.id} className="flex items-start gap-3 px-3 py-3 sm:px-5 sm:py-4">
                  <Checkbox
                    checked={completed}
                    disabled={savingTaskId === task.id}
                    onCheckedChange={() => void toggleTask(task)}
                    aria-label={`${completed ? "Uncomplete" : "Complete"} ${task.title}`}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-medium", completed && "text-muted-foreground line-through")}>
                      {task.title}
                    </p>
                    {task.notes && (
                      <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                        {task.notes}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="capitalize">{task.priority} priority</span>
                      {task.repeat !== "none" && (
                        <span className="capitalize">{task.repeat}</span>
                      )}
                    </div>
                  </div>
                  {task.startTime && (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="size-3.5" />
                      {task.startTime}
                      {task.duration ? ` · ${task.duration}m` : ""}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
            <ListTodo className="size-7 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              {loaded ? "No tasks scheduled for this day." : "Loading tasks…"}
            </p>
          </div>
        )}
        </div>
        </aside>
      </div>
    </section>
  );
}
