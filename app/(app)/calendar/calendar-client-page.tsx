"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
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

  const activeMonth =
    month ?? (todayKey ? localDate(todayKey) : new Date(2000, 0, 1, 12));
  const activeDate = selectedDate || todayKey;
  const loaded = Boolean(user?.id && loadedUserId === user.id);
  const dates = monthDates(activeMonth);
  const completionKeys = new Set(
    completions.map((item) => `${item.taskId}:${item.completedOn}`)
  );
  const scheduledForDate = activeDate
    ? tasks.filter((task) => isScheduledOn(task, activeDate))
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

  const selectedDateTasks = scheduledForDate;
  const monthName = MONTH_FORMAT.format(activeMonth);

  return (
    <section className="flex min-h-[calc(100dvh-5rem)] w-full min-w-0 flex-col bg-background">
      <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-1 py-3 sm:px-2">
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
          variant="outline"
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

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-4",
          selectedDate && "lg:flex-row"
        )}
      >
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-14 items-center justify-between border-b px-1 sm:px-3">
            <h2 className="text-sm font-semibold sm:text-base">{monthName}</h2>
            <div className="flex gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Previous month"
                onClick={() => moveMonth(-1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Next month"
                onClick={() => moveMonth(1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>

        <div className="grid grid-cols-7 border-b">
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

        <div className="grid flex-1 grid-cols-7 content-stretch">
          {dates.map((date) => {
            const key = dateKey(date);
            const dayTasks = tasks.filter((task) => isScheduledOn(task, key));
            const completedCount = dayTasks.filter((task) => isComplete(task, key)).length;
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
                  "flex min-h-[58px] flex-col items-start border-b border-r border-border/60 px-1.5 py-1.5 text-left text-xs transition-colors hover:bg-muted/60 sm:min-h-[82px] sm:p-2",
                  !isCurrentMonth && "text-muted-foreground/50",
                  activeDate === key && "bg-muted",
                  todayKey === key && "font-semibold"
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center sm:size-7",
                    todayKey === key && "bg-primary text-primary-foreground"
                  )}
                >
                  {date.getDate()}
                </span>
                <span className="mt-1 hidden w-full truncate text-left text-[10px] text-muted-foreground sm:block">
                  {dayTasks.length > 0
                    ? `${completedCount}/${dayTasks.length} tasks`
                    : "\u00a0"}
                </span>
                {dayTasks.length > 0 && (
                  <span className="mt-1 flex gap-0.5 sm:hidden" aria-hidden="true">
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
        </section>

        <AnimatePresence initial={false}>
        {selectedDate && (
        <motion.aside
          key="selected-date-panel"
          initial={{ opacity: 0, x: 20, width: 0 }}
          animate={{ opacity: 1, x: 0, width: "min(100%, 24rem)" }}
          exit={{ opacity: 0, x: 20, width: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="flex min-h-72 w-full shrink-0 flex-col overflow-hidden border-t border-border/70 bg-card/40 lg:min-h-0 lg:border-l lg:border-t-0"
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
              variant="ghost"
              aria-label="Add task"
              disabled={!loaded || !activeDate}
              onClick={() => setAddTaskDialogOpen(true)}
            >
              <Plus />
            </Button>
            <ListTodo className="mr-1 size-5 text-muted-foreground" />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
        {!loaded ? (
          <div className="space-y-3 p-4" aria-label="Loading tasks">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-10 animate-pulse bg-muted" />
            ))}
          </div>
        ) : selectedDateTasks.length ? (
          <ul className="divide-y">
            {selectedDateTasks.map((task) => {
              const completed = isComplete(task, activeDate);
              return (
                <li key={task.id} className="flex items-start gap-3 px-4 py-4 sm:px-5">
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
          <p className="p-5 text-sm text-muted-foreground">
            {loaded ? "No tasks scheduled for this day." : "Loading tasks…"}
          </p>
        )}
        </div>
        </motion.aside>
        )}
        </AnimatePresence>
      </div>
    </section>
  );
}
