"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock,
  FolderPlus,
  ListTodo,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { formatMinutes, shortLabel } from "@/lib/date-utils";
import { getActivityStreaks } from "@/lib/task-activity";
import { REPEATS } from "@/lib/task-options";
import type {
  Task,
  TaskCompletion,
  TaskGroup,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { TaskCheckbox } from "@/components/task-checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { EASE, FadeIn } from "@/components/motion-fade";
import { useTodayKey } from "@/lib/use-local-storage";
import {
  isTaskDataSchemaUnavailable,
  isSupabaseConfigured,
  loadCompletions,
  loadTasks,
  removeCompletion,
  removeTask,
  saveCompletion,
  saveTask,
  loadTaskGroups,
  removeTaskGroup,
} from "@/lib/supabase/task-data";
import { useSupabaseDataStatus } from "@/components/supabase-data-provider";
import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";
import { TaskEditorDialog, taskFromForm, type TaskFormValues } from "@/components/task-editor-dialog";
import { isHabitScheduledOn } from "@/lib/habit-analytics";
import type { Habit, HabitLog } from "@/lib/habits";
import {
  isMissingHabitDataSchemaError,
  loadHabitLogs,
  loadHabits,
  removeHabitLog,
  saveHabitLog,
} from "@/lib/supabase/habit-data";


type Filter = "all" | "active" | "done";

const COMPLETED_TASK_LIST_RETENTION_MS = 8 * 60 * 60 * 1000;

function scheduleLabel(task: Task) {
  if (!task.startTime) return task.endTime ? `by ${task.endTime}` : null;
  if (task.endTime) return `${task.startTime} – ${task.endTime}`;
  return task.duration ? `${task.startTime} · ${task.duration}m` : task.startTime;
}

function habitScheduleLabel(habit: Habit) {
  if (habit.frequency === "daily") return "Every day";
  if (habit.frequency === "weekdays") return "Weekdays";
  if (habit.frequency === "monthly") return "Monthly";
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    habit.scheduleDays.map((day) => names[day]).filter(Boolean).join(" · ") ||
    "Custom schedule"
  );
}

function overdueLabel(task: Task, todayKey: string, now: number) {
  if (!task.endTime || task.completed) return null;
  const date = task.dueDate ?? todayKey;
  if (!date || date !== todayKey) return null;
  const deadline = new Date(`${date}T${task.endTime}:00`);
  if (Number.isNaN(deadline.getTime())) return null;
  if (task.startTime && task.endTime <= task.startTime) {
    deadline.setDate(deadline.getDate() + 1);
  }
  const diff = now - deadline.getTime();
  if (diff <= 0) return null;
  return `${formatMinutes(diff / 60000)} exceeded`;
}

const TaskItem = React.memo(function TaskItem({
  task,
  onToggle,
  onEdit,
  onDelete,
  onSelect,
  selected,
  index,
  animate,
  now,
  todayKey,
}: {
  task: Task;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onSelect: (task: Task) => void;
  selected: boolean;
  index: number;
  animate: boolean;
  now: number;
  todayKey: string;
}) {
  const schedule = scheduleLabel(task);
  const overdue = overdueLabel(task, todayKey, now);
  const priorityClass =
    task.priority === "high"
      ? "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300"
      : task.priority === "low"
        ? "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300"
        : null;

  return (
    <motion.li
      layout={animate ? "position" : false}
      initial={animate ? { opacity: 0, y: 6 } : false}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      exit={animate ? { opacity: 0, x: -12 } : undefined}
      transition={{
        duration: 0.2,
        delay: animate ? Math.min(index * 0.008, 0.08) : 0,
        ease: EASE,
      }}
      className="group"
    >
      <div
        onClick={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest('button, [role="checkbox"], [role="menuitem"]')
          ) {
            return;
          }
          onSelect(task);
        }}
        className={cn(
          "flex min-w-0 cursor-pointer items-center gap-2.5 rounded-xl px-3 py-3 transition-colors hover:bg-muted/50 sm:gap-3",
          selected && "bg-primary/10",
          task.completed && "opacity-75"
        )}
      >
        <TaskCheckbox
          checked={task.completed}
          onCheckedChange={() => onToggle(task)}
          aria-label={`Mark ${task.title} as ${task.completed ? "incomplete" : "complete"}`}
        />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onSelect(task)}
            className={cn(
              "flex flex-wrap items-center gap-x-2 gap-y-1 text-left text-sm font-medium leading-snug focus-visible:outline-none focus-visible:underline",
              task.completed && "text-muted-foreground line-through"
            )}
          >
            <span>{task.title}</span>
          </button>
          {task.notes && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground sm:line-clamp-2">
              {task.notes}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="rounded-full border bg-muted/50 px-2 py-0.5 text-muted-foreground">
              {task.category}
            </span>
            {priorityClass && (
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 font-medium capitalize",
                  priorityClass
                )}
              >
                {task.priority} priority
              </span>
            )}
            {schedule && (
              <span className="rounded-full border bg-muted/50 px-2 py-0.5 tabular-nums text-muted-foreground">
                {schedule}
              </span>
            )}
            {overdue && (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-medium tabular-nums text-rose-700 dark:text-rose-300">
                <Clock className="size-3" />
                {overdue}
              </span>
            )}
            {task.dueDate && (
              <span className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-muted-foreground">
                <CalendarDays className="size-3" />
                {shortLabel(task.dueDate)}
              </span>
            )}
            {task.repeat !== "none" && (
              <span className="rounded-full border bg-muted/50 px-2 py-0.5 text-muted-foreground">
                {REPEATS.find((r) => r.value === task.repeat)?.label ?? task.repeat}
              </span>
            )}
            {task.streakEnabled && task.currentStreak > 0 && (
              <span
                className="inline-flex items-center gap-1 text-xs font-medium tabular-nums text-muted-foreground"
                aria-label={`${task.currentStreak} day streak`}
                title={`${task.currentStreak} day streak`}
              >
                <span aria-hidden="true" className="text-sm leading-none">
                  🔥
                </span>
                {task.currentStreak}
              </span>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground/60 hover:text-muted-foreground"
                aria-label="Task actions"
              >
                <MoreVertical />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Pencil /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(task)}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.li>
  );
});

function TaskDetails({
  task,
  group,
  width,
  now,
  todayKey,
  onResizeStart,
  onResize,
  onResizeEnd,
  onResizeWidth,
  onClose,
  onToggle,
  onEdit,
  onDelete,
  onEditGroup,
  onDeleteGroup,
  presentation = "panel",
}: {
  task?: Task;
  group?: TaskGroup;
  width: number;
  now: number;
  todayKey: string;
  onResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void;
  onResize: (event: React.PointerEvent<HTMLDivElement>) => void;
  onResizeEnd: (event: React.PointerEvent<HTMLDivElement>) => void;
  onResizeWidth?: (amount: number) => void;
  onClose: () => void;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onEditGroup: (group: TaskGroup) => void;
  onDeleteGroup: (group: TaskGroup) => void;
  presentation?: "panel" | "drawer";
}) {
  const hasContent = Boolean(task || group);
  const schedule = task ? scheduleLabel(task) : null;
  const overdue = task ? overdueLabel(task, todayKey, now) : null;
  return (
    <aside
      className={cn(
        presentation === "drawer"
          ? "relative flex min-h-0 min-w-0 flex-1 flex-col"
          : "relative hidden min-h-72 min-w-0 shrink-0 flex-col border-t lg:flex lg:min-h-0 lg:border-l lg:border-t-0",
        presentation === "drawer"
          ? "w-full"
          : "w-full lg:w-[var(--task-details-width)]"
      )}
      style={
        presentation === "drawer"
          ? undefined
          : ({ "--task-details-width": `${width}px` } as React.CSSProperties)
      }
      aria-label="Task details"
    >
      <div
        role="separator"
        aria-label="Resize task details panel"
        aria-orientation="vertical"
        aria-valuenow={width}
        aria-valuemin={280}
        aria-valuemax={560}
        tabIndex={0}
        onPointerDown={onResizeStart}
        onPointerMove={onResize}
        onPointerUp={onResizeEnd}
        onPointerCancel={onResizeEnd}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            const direction = event.key === "ArrowLeft" ? -1 : 1;
            onResizeWidth?.(direction * 16);
          }
        }}
        className={cn(
          "absolute inset-y-0 -left-1 z-10 hidden w-2 cursor-col-resize touch-none bg-transparent outline-none transition-colors hover:bg-foreground/10 focus-visible:bg-foreground/15",
          presentation === "panel" && "lg:block"
        )}
      />
      {hasContent ? (
        <>
          {presentation === "panel" && (
            <div className="flex min-h-12 items-center justify-between border-b px-4">
              <span className="truncate text-xs text-muted-foreground">
                {task
                  ? task.dueDate
                    ? shortLabel(task.dueDate)
                    : "No due date"
                  : "Task group"}
              </span>
              {task && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close task details"
                  onClick={onClose}
                >
                  <X />
                </Button>
              )}
            </div>
          )}
          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            {group && (
              <section className="border-b pb-4">
                <p className="text-xs text-muted-foreground">Group</p>
                <h2 className="mt-1 break-words text-base font-semibold">{group.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tasks in this group will be moved to Ungrouped if you delete it.
                </p>
              </section>
            )}
            {task ? (
              <>
            <div className="space-y-2">
              {presentation === "panel" && (
                <div className="flex items-start gap-2">
                  <TaskCheckbox
                    checked={task.completed}
                    onCheckedChange={() => onToggle(task)}
                    aria-label={`Mark ${task.title} as ${task.completed ? "incomplete" : "complete"}`}
                    className="mt-1"
                  />
                  <h2 className={cn("min-w-0 flex-1 break-words text-lg font-semibold leading-snug", task.completed && "text-muted-foreground line-through")}>
                    {task.title}
                  </h2>
                </div>
              )}
              {task.notes ? (
                <p
                  className={cn(
                    "whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground",
                    presentation === "panel" && "pl-6"
                  )}
                >
                  {task.notes}
                </p>
              ) : (
                <p
                  className={cn(
                    "text-xs text-muted-foreground",
                    presentation === "panel" && "pl-6"
                  )}
                >
                  Add notes to keep details for this task.
                </p>
              )}
            </div>
            <dl className="divide-y rounded-lg border px-3">
              <div className="flex items-center justify-between gap-3 py-3 text-sm">
                <dt className="text-muted-foreground">Priority</dt>
                <dd className="font-medium capitalize">{task.priority}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-3 text-sm">
                <dt className="text-muted-foreground">List</dt>
                <dd className="max-w-40 truncate font-medium">
                  {task.category}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-3 text-sm">
                <dt className="text-muted-foreground">Due date</dt>
                <dd className="font-medium">
                  {task.dueDate ? shortLabel(task.dueDate) : "Not set"}
                </dd>
              </div>
              {schedule && (
                <div className="flex items-center justify-between gap-3 py-3 text-sm">
                  <dt className="text-muted-foreground">Schedule</dt>
                  <dd className="text-right font-medium tabular-nums">
                    {schedule}
                    {overdue && (
                      <span className="mt-1 block text-xs font-medium text-rose-600 dark:text-rose-400">
                        {overdue}
                      </span>
                    )}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 py-3 text-sm">
                <dt className="text-muted-foreground">Repeat</dt>
                <dd className="font-medium">
                  {REPEATS.find((repeat) => repeat.value === task.repeat)?.label ?? "Does not repeat"}
                </dd>
              </div>
              {task.streakEnabled && (
                <div className="flex items-center justify-between gap-3 py-3 text-sm">
                  <dt className="text-muted-foreground">Streak</dt>
                  <dd className="font-medium">{task.currentStreak} days 🔥</dd>
                </div>
              )}
            </dl>
              </>
            ) : (
              <div className="flex min-h-32 flex-col items-center justify-center gap-2 text-center">
                <ListTodo className="size-8 text-muted-foreground/60" />
                <p className="text-sm font-medium">Group details</p>
                <p className="text-xs text-muted-foreground">
                  Select a task to view its notes, schedule, and progress.
                </p>
              </div>
            )}
          </div>
          {group && (
            <div className="flex gap-2 border-t p-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onEditGroup(group)}
                className="flex-1 justify-start gap-2"
              >
                <Pencil />
                Edit group
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onDeleteGroup(group)}
                className="flex-1 justify-start gap-2"
              >
                <Trash2 />
                Delete
              </Button>
            </div>
          )}
          {task && (
            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 border-t p-3",
                presentation === "drawer" &&
                  "w-full flex-nowrap gap-0 border-t p-0"
              )}
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => onDelete(task)}
                className={cn(
                  "gap-2",
                  presentation === "drawer" &&
                    "h-12 w-1/2 justify-center rounded-none border-0"
                )}
              >
                <Trash2 />
                Delete task
              </Button>
              <Button
                type="button"
                onClick={() => onEdit(task)}
                className={cn(
                  presentation === "drawer" &&
                    "h-12 w-1/2 justify-center rounded-none"
                )}
              >
                <Pencil />
                Edit task
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <ListTodo className="size-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">Task details</p>
          <p className="text-xs text-muted-foreground">
            Select a task to view its notes, schedule, and progress.
          </p>
        </div>
      )}
    </aside>
  );
}

export default function TasksClientPage() {
  const { user } = useAuth();
  const {
    schemaUnavailable,
    reportError,
    reportSchemaUnavailable,
    reportConfigurationError,
  } = useSupabaseDataStatus();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [completions, setCompletions] = React.useState<TaskCompletion[]>([]);
  const [taskGroups, setTaskGroups] = React.useState<TaskGroup[]>([]);
  const todayKey = useTodayKey();
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  const [loadedUserId, setLoadedUserId] = React.useState<string | null>(null);
  const [habits, setHabits] = React.useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = React.useState<HabitLog[]>([]);
  const [habitSavingIds, setHabitSavingIds] = React.useState<Set<string>>(
    new Set()
  );
  const habitsRef = React.useRef<HTMLDivElement>(null);
  const taskListScrollRef = React.useRef<HTMLDivElement>(null);
  const [habitsInView, setHabitsInView] = React.useState(false);
  const pendingHabitToggleIds = React.useRef<Set<string>>(new Set());
  const [filter, setFilter] = React.useState<Filter>("all");
  const [isFilterPending, startFilterTransition] = React.useTransition();
  const [selectedGroupId, setSelectedGroupId] = React.useState("all");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Task | null>(null);
  const [deleteGroupTarget, setDeleteGroupTarget] = React.useState<TaskGroup | null>(null);
  const [taskSearch, setTaskSearch] = React.useState("");
  const deferredTaskSearch = React.useDeferredValue(taskSearch);
  const [taskListLimit, setTaskListLimit] = React.useState(100);
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null);
  const [mobileDetailsOpen, setMobileDetailsOpen] = React.useState(false);
  const [taskDetailsWidth, setTaskDetailsWidth] = React.useState(320);
  const [resizingDetails, setResizingDetails] = React.useState(false);
  const listDetailsRef = React.useRef<HTMLDivElement>(null);
  const taskSaveInProgressRef = React.useRef(false);
  const nextTaskSubmissionAtRef = React.useRef(0);

  function getMaxTaskDetailsWidth() {
    const paneWidth = listDetailsRef.current?.clientWidth ?? window.innerWidth;
    return Math.max(280, Math.min(560, paneWidth - 300));
  }

  function resizeTaskDetails(event: React.PointerEvent<HTMLDivElement>) {
    if (!resizingDetails || !listDetailsRef.current) return;
    const rightEdge = listDetailsRef.current.getBoundingClientRect().right;
    setTaskDetailsWidth(
      Math.round(
        Math.min(getMaxTaskDetailsWidth(), Math.max(280, rightEdge - event.clientX))
      )
    );
  }

  function startResizingTaskDetails(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizingDetails(true);
    const rightEdge = listDetailsRef.current?.getBoundingClientRect().right;
    if (rightEdge !== undefined) {
      setTaskDetailsWidth(
        Math.round(
          Math.min(getMaxTaskDetailsWidth(), Math.max(280, rightEdge - event.clientX))
        )
      );
    }
  }

  function stopResizingTaskDetails(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setResizingDetails(false);
  }

  React.useEffect(() => {
    function syncGroupFromHash() {
      const groupId = new URLSearchParams(window.location.hash.slice(1)).get("group");
      startFilterTransition(() => setSelectedGroupId(groupId ?? "all"));
      setTaskListLimit(100);
    }

    function handleGroupSelection(event: Event) {
      if (!(event instanceof CustomEvent)) return;
      if (typeof event.detail !== "string") return;
      startFilterTransition(() => setSelectedGroupId(event.detail));
      setTaskListLimit(100);
    }

    syncGroupFromHash();
    window.addEventListener("hashchange", syncGroupFromHash);
    window.addEventListener("popstate", syncGroupFromHash);
    window.addEventListener("task-group-selected", handleGroupSelection);
    return () => {
      window.removeEventListener("hashchange", syncGroupFromHash);
      window.removeEventListener("popstate", syncGroupFromHash);
      window.removeEventListener("task-group-selected", handleGroupSelection);
    };
  }, []);

  React.useEffect(() => {
    function handleGroupCreated(event: Event) {
      if (!(event instanceof CustomEvent)) return;
      const group = event.detail as TaskGroup | undefined;
      if (!group?.id || typeof group.name !== "string") return;
      setTaskGroups((current) =>
        [...current.filter((item) => item.id !== group.id), group].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      startFilterTransition(() => setSelectedGroupId(group.id));
      setTaskListLimit(100);
    }

    window.addEventListener("task-group-created", handleGroupCreated);
    return () => window.removeEventListener("task-group-created", handleGroupCreated);
  }, []);

  React.useEffect(() => {
    function handleGroupUpdated(event: Event) {
      if (!(event instanceof CustomEvent)) return;
      const group = event.detail as TaskGroup | undefined;
      if (!group?.id || typeof group.name !== "string") return;
      setTaskGroups((current) =>
        [...current.filter((item) => item.id !== group.id), group].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
    }

    window.addEventListener("task-group-updated", handleGroupUpdated);
    return () =>
      window.removeEventListener("task-group-updated", handleGroupUpdated);
  }, []);

  React.useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!user?.id) return;

    const userId = user.id;
    if (schemaUnavailable || isTaskDataSchemaUnavailable()) return;

    let active = true;
    Promise.all([
      loadTasks(userId),
      loadCompletions(userId),
      loadTaskGroups(userId),
    ])
      .then(([remoteTasks, remoteCompletions, remoteGroups]) => {
        if (!active) return;
        setTasks(remoteTasks);
        setCompletions(remoteCompletions);
        setTaskGroups(remoteGroups);
        setSelectedGroupId((current) =>
          current === "all" ||
          current === "ungrouped" ||
          remoteGroups.some((group) => group.id === current)
            ? current
            : "all"
        );
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
  }, [user?.id, reportError, schemaUnavailable]);

  React.useEffect(() => {
    if (!isSupabaseConfigured || !user?.id || !todayKey) return;
    if (schemaUnavailable || isTaskDataSchemaUnavailable()) return;

    const userId = user.id;
    let active = true;
    Promise.all([loadHabits(userId), loadHabitLogs(userId, todayKey)])
      .then(([remoteHabits, remoteLogs]) => {
        if (!active) return;
        setHabits(remoteHabits);
        setHabitLogs(remoteLogs);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (!isMissingHabitDataSchemaError(error)) reportError(error);
      });

    return () => {
      active = false;
    };
  }, [reportError, schemaUnavailable, todayKey, user?.id]);

  const completionsByTask = React.useMemo(() => {
    const indexed = new Map<string, TaskCompletion[]>();
    for (const completion of completions) {
      const history = indexed.get(completion.taskId);
      if (history) history.push(completion);
      else indexed.set(completion.taskId, [completion]);
    }
    return indexed;
  }, [completions]);
  const completedToday = React.useMemo(() => {
    const completed = new Set<string>();
    for (const completion of completions) {
      if (completion.completedOn === todayKey) completed.add(completion.taskId);
    }
    return completed;
  }, [completions, todayKey]);
  const todaysHabits = React.useMemo(
    () =>
      habits
        .filter(
          (habit) =>
            !habit.archived &&
            Boolean(todayKey) &&
            isHabitScheduledOn(habit, todayKey)
        )
        .sort((a, b) => {
          const aTime = a.startTime ?? "99:99";
          const bTime = b.startTime ?? "99:99";
          return aTime.localeCompare(bTime) || a.name.localeCompare(b.name);
        }),
    [habits, todayKey]
  );
  const habitLogTodayByHabit = React.useMemo(
    () =>
      new Map(
        habitLogs
          .filter((log) => log.completedOn === todayKey)
          .map((log) => [log.habitId, log])
      ),
    [habitLogs, todayKey]
  );
  const completedHabitCount = todaysHabits.filter(
    (habit) => habitLogTodayByHabit.get(habit.id)?.status === "completed"
  ).length;
  const dailyTasks = React.useMemo(
    () =>
      tasks.map((task) => {
        const taskStreaks = getActivityStreaks(
          completionsByTask.get(task.id) ?? [],
          todayKey
        );
        return {
          ...task,
          completed:
            task.repeat === "none"
              ? task.completed
              : completedToday.has(task.id) ||
                Boolean(todayKey && task.lastCompletedOn === todayKey),
          currentStreak: taskStreaks.current,
          longestStreak: Math.max(task.longestStreak, taskStreaks.longest),
        };
      }),
    [tasks, completionsByTask, completedToday, todayKey]
  );
  const expiredCompletedTaskIds = React.useMemo(() => {
    const expired = new Set<string>();
    for (const task of dailyTasks) {
      if (!task.completed) continue;
      const history = completionsByTask.get(task.id) ?? [];
      const latestCompletion = history.reduce<TaskCompletion | undefined>(
        (latest, completion) => {
          if (
            task.repeat !== "none" &&
            completion.completedOn !== todayKey
          ) {
            return latest;
          }
          return !latest || completion.completedAt > latest.completedAt
            ? completion
            : latest;
        },
        undefined
      );
      if (!latestCompletion) continue;

      const completedAt = Date.parse(latestCompletion.completedAt);
      if (
        Number.isFinite(completedAt) &&
        now - completedAt >= COMPLETED_TASK_LIST_RETENTION_MS
      ) {
        expired.add(task.id);
      }
    }
    return expired;
  }, [completionsByTask, dailyTasks, now, todayKey]);
  const searchTextByTaskId = React.useMemo(
    () =>
      new Map(
        dailyTasks.map((task) => [
          task.id,
          `${task.title}\n${task.notes ?? ""}`.toLocaleLowerCase(),
        ])
      ),
    [dailyTasks]
  );
  const normalizedSearch = deferredTaskSearch.trim().toLocaleLowerCase();
  const {
    visible,
    groupedTaskCount,
    doneCount,
    hiddenCompletedCount,
  } =
    React.useMemo(() => {
      const visible: Task[] = [];
      let groupedTaskCount = 0;
      let doneCount = 0;
      let hiddenCompletedCount = 0;

      for (const task of dailyTasks) {
        if (
          normalizedSearch &&
          !searchTextByTaskId.get(task.id)?.includes(normalizedSearch)
        ) {
          continue;
        }

        const matchesGroup =
          selectedGroupId === "all" ||
          (selectedGroupId === "ungrouped"
            ? !task.groupId
            : task.groupId === selectedGroupId);
        if (!matchesGroup) continue;

        groupedTaskCount++;
        if (task.completed) doneCount++;
        if (expiredCompletedTaskIds.has(task.id)) {
          hiddenCompletedCount++;
          continue;
        }
        if (filter === "active" && task.completed) continue;
        if (filter === "done" && !task.completed) continue;

        visible.push(task);
      }

      return {
        visible,
        groupedTaskCount,
        doneCount,
        hiddenCompletedCount,
      };
    }, [
      dailyTasks,
      expiredCompletedTaskIds,
      filter,
      normalizedSearch,
      searchTextByTaskId,
      selectedGroupId,
    ]);
  const displayedTasks = visible.slice(0, taskListLimit);
  const hasMoreTasks = displayedTasks.length < visible.length;
  const taskDetailsCandidates = React.useMemo(
    () =>
      dailyTasks.filter((task) => {
        if (expiredCompletedTaskIds.has(task.id)) return false;
        if (
          normalizedSearch &&
          !searchTextByTaskId.get(task.id)?.includes(normalizedSearch)
        ) {
          return false;
        }
        return (
          selectedGroupId === "all" ||
          (selectedGroupId === "ungrouped"
            ? !task.groupId
            : task.groupId === selectedGroupId)
        );
      }),
    [
      dailyTasks,
      expiredCompletedTaskIds,
      normalizedSearch,
      searchTextByTaskId,
      selectedGroupId,
    ]
  );
  const selectedTask = taskDetailsCandidates.find(
    (task) => task.id === selectedTaskId
  );
  const progress = groupedTaskCount
    ? (doneCount / groupedTaskCount) * 100
    : 0;
  const selectedGroupName =
    selectedGroupId === "all"
      ? "All tasks"
      : selectedGroupId === "ungrouped"
        ? "Ungrouped tasks"
        : taskGroups.find((group) => group.id === selectedGroupId)?.name ??
          "All tasks";
  const selectedGroup = taskGroups.find((group) => group.id === selectedGroupId);

  const handleCreate = React.useCallback(() => {
    setEditing(null);
    setDialogOpen(true);
  }, []);

  const handleScrollToHabits = React.useCallback(() => {
    const container = taskListScrollRef.current;
    const target = habitsRef.current;
    if (!target) return;

    if (container && container.scrollHeight > container.clientHeight + 1) {
      const top =
        target.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop -
        8;
      container.scrollTo({ top, behavior: "smooth" });
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  React.useEffect(() => {
    const target = habitsRef.current;
    if (!target || todaysHabits.length === 0) {
      setHabitsInView(false);
      return;
    }

    let frame = 0;
    const updateVisibility = () => {
      frame = 0;
      const rect = target.getBoundingClientRect();
      const container = taskListScrollRef.current;
      const overflowY = container
        ? window.getComputedStyle(container).overflowY
        : "visible";
      const containerRect =
        container && (overflowY === "auto" || overflowY === "scroll")
          ? container.getBoundingClientRect()
          : null;
      const viewportTop = Math.max(0, containerRect?.top ?? 0);
      const viewportBottom = Math.min(
        window.innerHeight - (window.innerWidth < 768 ? 80 : 0),
        containerRect?.bottom ?? window.innerHeight
      );
      const visibleHeight = Math.max(
        0,
        Math.min(rect.bottom, viewportBottom) - Math.max(rect.top, viewportTop)
      );
      const visible = visibleHeight >= Math.min(96, Math.max(rect.height, 1));
      setHabitsInView((current) => (current === visible ? current : visible));
    };
    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateVisibility);
    };

    const container = taskListScrollRef.current;
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(target);
    if (container) resizeObserver.observe(container);
    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    container?.addEventListener("scroll", scheduleUpdate, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      container?.removeEventListener("scroll", scheduleUpdate);
    };
  }, [todaysHabits.length, displayedTasks.length]);

  React.useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (
        event.key.toLowerCase() !== "a" ||
        !event.shiftKey ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.repeat ||
        event.defaultPrevented ||
        dialogOpen ||
        deleteTarget
      ) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest(
            'input, textarea, select, [role="combobox"], [role="textbox"]'
          ))
      ) {
        return;
      }

      event.preventDefault();
      handleCreate();
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [deleteTarget, dialogOpen, handleCreate]);

  const handleSave = React.useCallback(async (form: TaskFormValues) => {
    if (taskSaveInProgressRef.current) return;
    if (isTaskDataSchemaUnavailable()) {
      reportSchemaUnavailable();
      return;
    }
    if (!isSupabaseConfigured) {
      reportConfigurationError();
      return;
    }
    if (
      !editing &&
      Date.now() < nextTaskSubmissionAtRef.current
    ) {
      toast.info("Please wait a second before adding another task.");
      return;
    }

    const task = taskFromForm(form, editing ?? undefined);
    taskSaveInProgressRef.current = true;
    try {
      if (!user?.id) throw new Error("A valid Supabase session is required.");
      await saveTask(user.id, task);
    } catch (error) {
      reportError(error);
      return;
    } finally {
      taskSaveInProgressRef.current = false;
    }

    if (editing) {
      setTasks((prev) => prev.map((item) => (item.id === editing.id ? task : item)));
      toast.success("Task updated.");
    } else {
      nextTaskSubmissionAtRef.current = Date.now() + 1000;
      setTasks((prev) => [task, ...prev]);
      toast.success("Task added. Planning counts toward your daily streak.");
    }
    setSelectedTaskId(task.id);
    setDialogOpen(false);
    setEditing(null);
  }, [
    editing,
    reportConfigurationError,
    reportError,
    reportSchemaUnavailable,
    user,
  ]);

  const pendingToggleIds = React.useRef<Set<string>>(new Set());
  const completionsByTaskRef = React.useRef(completionsByTask);
  React.useEffect(() => {
    completionsByTaskRef.current = completionsByTask;
  }, [completionsByTask]);

  const handleToggle = React.useCallback(async (task: Task) => {
    setSelectedTaskId(task.id);
    if (!todayKey) {
      toast.error("Today's date is not available yet. Please try again.");
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
    // Only one save per task at a time: rapid extra clicks are ignored until
    // the in-flight operation settles.
    if (pendingToggleIds.current.has(task.id)) return;

    const completing = !task.completed;
    const today = todayKey;
    const taskHistory = (
      completionsByTaskRef.current.get(task.id) ?? []
    ).filter(
      (item) => item.completedOn !== today
    );
    const nextTaskHistory = completing
      ? [...taskHistory, {
          taskId: task.id,
          completedOn: today,
          completedAt: new Date().toISOString(),
        }]
      : taskHistory;
    const taskStreaks = getActivityStreaks(nextTaskHistory, today);
    const previousLastCompletedOn = taskHistory.reduce(
      (latest, item) => item.completedOn > latest ? item.completedOn : latest,
      ""
    );
    const nextTask: Task = {
      ...task,
      completed: completing,
      currentStreak: taskStreaks.current,
      longestStreak: Math.max(task.longestStreak, taskStreaks.longest),
      lastCompletedOn: completing
        ? today > previousLastCompletedOn
          ? today
          : previousLastCompletedOn || undefined
        : previousLastCompletedOn || undefined,
    };
    const completion: TaskCompletion = {
      taskId: task.id,
      completedOn: today,
      completedAt: new Date().toISOString(),
    };

    // Optimistic: paint the new state first, then persist in the background.
    setTasks((prev) =>
      prev.map((item) => (item.id === task.id ? nextTask : item))
    );
    setCompletions((prev) =>
      completing
        ? [
            ...prev.filter(
              (item) => !(item.taskId === task.id && item.completedOn === today)
            ),
            completion,
          ]
        : prev.filter(
            (item) => !(item.taskId === task.id && item.completedOn === today)
          )
    );

    pendingToggleIds.current.add(task.id);
    try {
      if (!user?.id) throw new Error("A valid Supabase session is required.");
      if (completing) {
        await Promise.all([
          saveTask(user.id, nextTask),
          saveCompletion(user.id, completion),
        ]);
      } else {
        await Promise.all([
          saveTask(user.id, nextTask),
          removeCompletion(user.id, task.id, today),
        ]);
      }
      if (completing) {
        toast.success(`Nice one — “${task.title}” done! 🎉`);
      }
    } catch (error) {
      setTasks((prev) => prev.map((item) => (item.id === task.id ? task : item)));
      setCompletions((prev) =>
        completing
          ? prev.filter(
              (item) => !(item.taskId === task.id && item.completedOn === today)
            )
          : [...prev, completion]
      );
      reportError(error);
    } finally {
      pendingToggleIds.current.delete(task.id);
    }
  }, [
    reportConfigurationError,
    reportError,
    reportSchemaUnavailable,
    todayKey,
    user,
  ]);

  const handleToggleHabit = React.useCallback(
    async (habit: Habit) => {
      if (!user?.id || !todayKey) return;
      if (!isSupabaseConfigured) {
        reportConfigurationError();
        return;
      }
      if (pendingHabitToggleIds.current.has(habit.id)) return;

      const currentLog = habitLogs.find(
        (log) => log.habitId === habit.id && log.completedOn === todayKey
      );
      const wasComplete = currentLog?.status === "completed";
      const value =
        habit.type === "count" || habit.type === "measure"
          ? habit.targetValue
          : 1;
      const previousLogs = habitLogs;

      pendingHabitToggleIds.current.add(habit.id);
      setHabitSavingIds((current) => new Set(current).add(habit.id));
      setHabitLogs((current) =>
        wasComplete
          ? current.filter(
              (log) =>
                !(log.habitId === habit.id && log.completedOn === todayKey)
            )
          : [
              ...current.filter(
                (log) =>
                  !(log.habitId === habit.id && log.completedOn === todayKey)
              ),
              {
                habitId: habit.id,
                completedOn: todayKey,
                value,
                status: "completed",
                loggedAt: new Date().toISOString(),
              },
            ]
      );

      try {
        if (wasComplete) {
          await removeHabitLog(user.id, habit.id, todayKey);
        } else {
          await saveHabitLog(user.id, habit.id, todayKey, value, "completed");
          toast.success(`“${habit.name}” done for today.`);
        }
      } catch (error) {
        setHabitLogs(previousLogs);
        if (isMissingHabitDataSchemaError(error)) {
          toast.error(
            "Habit data is unavailable. Run supabase/schema.sql to create the habit tables."
          );
        } else {
          reportError(error);
        }
      } finally {
        pendingHabitToggleIds.current.delete(habit.id);
        setHabitSavingIds((current) => {
          const next = new Set(current);
          next.delete(habit.id);
          return next;
        });
      }
    },
    [habitLogs, reportConfigurationError, reportError, todayKey, user]
  );

  const handleDelete = React.useCallback(async (task: Task) => {
    if (isTaskDataSchemaUnavailable()) {
      reportSchemaUnavailable();
      return;
    }
    if (!isSupabaseConfigured) {
      reportConfigurationError();
      return;
    }
    const removedCompletions = completionsByTaskRef.current.get(task.id) ?? [];

    // Optimistic: drop it from the list right away, restore if the delete fails.
    setMobileDetailsOpen(false);
    setTasks((prev) => prev.filter((item) => item.id !== task.id));
    setCompletions((prev) => prev.filter((item) => item.taskId !== task.id));
    setSelectedTaskId((current) => (current === task.id ? null : current));

    try {
      if (!user?.id) throw new Error("A valid Supabase session is required.");
      await removeTask(user.id, task.id);
    } catch (error) {
      setTasks((prev) =>
        prev.some((item) => item.id === task.id) ? prev : [task, ...prev]
      );
      setCompletions((prev) => [...prev, ...removedCompletions]);
      reportError(error);
      return;
    }
    toast.info(`“${task.title}” deleted.`);
  }, [
    reportConfigurationError,
    reportError,
    reportSchemaUnavailable,
    user,
  ]);

  const handleSelectTask = React.useCallback(
    (task: Task) => setSelectedTaskId(task.id),
    []
  );
  const handleEditTask = React.useCallback((task: Task) => {
    setMobileDetailsOpen(false);
    setEditing(task);
    setDialogOpen(true);
  }, []);
  const handleRequestDelete = React.useCallback((task: Task) => {
    // Close the details drawer first so the delete confirmation dialog is
    // presented on its own instead of stacked over an open drawer.
    setMobileDetailsOpen(false);
    setDeleteTarget(task);
  }, []);

  async function handleDeleteGroup(group: TaskGroup) {
    if (isTaskDataSchemaUnavailable()) {
      reportSchemaUnavailable();
      return;
    }
    if (!isSupabaseConfigured) {
      reportConfigurationError();
      return;
    }

    try {
      if (!user?.id) throw new Error("A valid Supabase session is required.");
      const groupTasks = tasks.filter((task) => task.groupId === group.id);
      const ungroupedTasks = groupTasks.map((task) => ({
        ...task,
        groupId: undefined,
      }));
      await removeTaskGroup(group.id);
      const ungroupedById = new Map(ungroupedTasks.map((task) => [task.id, task]));
      setTasks((current) =>
        current.map((task) => ungroupedById.get(task.id) ?? task)
      );
      setTaskGroups((current) => current.filter((item) => item.id !== group.id));
      setSelectedGroupId("all");
      window.location.hash = "group=all";
      window.dispatchEvent(new Event("task-groups-updated"));
      setDeleteGroupTarget(null);
      toast.success(`“${group.name}” deleted. Its tasks are now ungrouped.`);
    } catch (error) {
      reportError(error);
    }
  }

  if (isSupabaseConfigured && !user?.id) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
        A valid Supabase session is required to load your tasks.
      </div>
    );
  }

  if (
    isSupabaseConfigured &&
    loadedUserId !== user?.id &&
    !schemaUnavailable
  ) {
    return <PageLoadingSkeleton label="Loading tasks" variant="tasks" />;
  }

  return (
    <div
      ref={listDetailsRef}
      className="flex w-full min-w-0 flex-col items-stretch gap-4 lg:h-full lg:min-h-0 lg:flex-row lg:gap-0"
    >
      <section className="flex min-w-0 flex-1 flex-col gap-2 px-1 pt-0 pb-2 sm:px-2 sm:gap-4 lg:min-h-0 lg:gap-6 lg:overflow-hidden lg:py-4 lg:pl-2 lg:pr-5">
      {/* Header + progress */}
      <FadeIn delay={0.06} className="flex flex-col gap-2 sm:gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="hidden font-heading text-xl font-semibold tracking-tight lg:block">
              {selectedGroupName}
            </h2>
            <p className="text-xs text-muted-foreground lg:mt-1 lg:text-sm">
              {groupedTaskCount} {groupedTaskCount === 1 ? "task" : "tasks"}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleCreate}
            aria-keyshortcuts="Shift+A"
            title="Add task (Shift+A)"
            className="hidden md:inline-flex"
          >
            <Plus />
            Add task
            <kbd className="hidden rounded-md border border-primary-foreground/20 bg-primary-foreground/10 px-1.5 py-0.5 text-xs font-medium lg:inline-flex">
              Shift + A
            </kbd>
          </Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={taskSearch}
            onChange={(event) => {
              setTaskSearch(event.target.value);
              setTaskListLimit(100);
            }}
            placeholder="Search tasks"
            aria-label="Search tasks by title or notes"
            className="h-9 pl-9"
          />
        </div>
        <Progress
        value={progress}
        className="[&_[data-slot=progress-track]]:h-1.5 lg:[&_[data-slot=progress-track]]:h-3"
        />
        <Tabs
          value={filter}
          onValueChange={(value) => {
            setTaskListLimit(100);
            startFilterTransition(() => setFilter(value as Filter));
          }}
        >
        <TabsList variant="default" className="grid h-8 w-full grid-cols-3 rounded-xl lg:h-10">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="done">Done</TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="text-right text-xs text-muted-foreground" aria-live="polite">
          {visible.length} {visible.length === 1 ? "match" : "matches"}
        </p>
      </FadeIn>

      {/* Task list */}
      <div
        ref={taskListScrollRef}
        className={cn(
          "min-w-0 pb-2 transition-opacity duration-150 ease-out lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1",
          (isFilterPending || deferredTaskSearch !== taskSearch) &&
            "opacity-60"
        )}
        data-resizing={resizingDetails || undefined}
        aria-busy={isFilterPending || deferredTaskSearch !== taskSearch}
      >
      <FadeIn delay={0.12} className="min-w-0">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-14 text-center">
            <ListTodo className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {hiddenCompletedCount > 0
                  ? "Completed tasks are hidden"
                  : "No tasks here"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {hiddenCompletedCount > 0
                  ? "Completed tasks leave this list after 8 hours. Their history is kept for your progress."
                  : selectedGroupId === "all"
                    ? "Add a task to start building your daily list."
                    : `Add a task to ${selectedGroupName.toLowerCase()}.`}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {displayedTasks.length > 0 && (
              <ul className="flex min-w-0 flex-col gap-2">
                {displayedTasks.length <= 30 ? (
                  <AnimatePresence mode="popLayout">
                    {displayedTasks.map((task, i) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        index={i}
                        animate
                        selected={selectedTask?.id === task.id}
                        now={
                          task.endTime &&
                          !task.completed &&
                          (task.dueDate ?? todayKey) === todayKey
                            ? now
                            : 0
                        }
                        todayKey={todayKey}
                        onToggle={handleToggle}
                        onSelect={handleSelectTask}
                        onEdit={handleEditTask}
                        onDelete={handleRequestDelete}
                      />
                    ))}
                  </AnimatePresence>
                ) : (
                  displayedTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      index={0}
                      animate={false}
                      selected={selectedTask?.id === task.id}
                      now={
                        task.endTime &&
                        !task.completed &&
                        (task.dueDate ?? todayKey) === todayKey
                          ? now
                          : 0
                      }
                      todayKey={todayKey}
                      onToggle={handleToggle}
                      onSelect={handleSelectTask}
                      onEdit={handleEditTask}
                      onDelete={handleRequestDelete}
                    />
                  ))
                )}
              </ul>
            )}
            {hasMoreTasks && (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setTaskListLimit((current) => current + 100)
                  }
                >
                  Show more tasks (
                  {visible.length - displayedTasks.length} remaining)
                </Button>
              </div>
            )}
          </div>
        )}
      </FadeIn>

      {todaysHabits.length > 0 && (
      <FadeIn delay={0.18} className="mt-6 min-w-0">
      <div ref={habitsRef} className="scroll-mt-4">
        <div className="flex items-center justify-between gap-3 px-3 pb-1">
          <div className="min-w-0">
            <h3 className="font-heading text-sm font-semibold tracking-tight">
              Habits
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {completedHabitCount} of {todaysHabits.length} done today
            </p>
          </div>
          <Link
            href="/habits"
            className="shrink-0 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
          </Link>
        </div>

          <ul className="flex flex-col gap-1">
            {todaysHabits.map((habit) => {
              const log = habitLogTodayByHabit.get(habit.id);
              const complete = log?.status === "completed";
              const isQuantified =
                habit.type === "count" || habit.type === "measure";

              return (
                <li
                  key={habit.id}
                  className={cn(
                    "flex min-w-0 items-center gap-3 rounded-xl px-3 py-4 transition-colors",
                    complete ? "bg-primary/[0.05]" : "hover:bg-muted/50"
                  )}
                >
                  <TaskCheckbox
                    checked={complete}
                    disabled={habitSavingIds.has(habit.id)}
                    onCheckedChange={() => void handleToggleHabit(habit)}
                    aria-label={`Mark ${habit.name} as ${complete ? "incomplete" : "complete"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-base font-medium leading-snug",
                        complete && "text-muted-foreground line-through"
                      )}
                    >
                      {habit.name}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="rounded-full border bg-muted/50 px-2 py-0.5">
                        {habitScheduleLabel(habit)}
                      </span>
                      <span className="rounded-full border bg-muted/50 px-2 py-0.5 capitalize">
                        {habit.category}
                      </span>
                      {isQuantified && (
                        <span className="rounded-full border bg-muted/50 px-2 py-0.5 tabular-nums">
                          {log?.value ?? 0}/{habit.targetValue}
                          {habit.unit ? ` ${habit.unit}` : ""}
                        </span>
                      )}
                      {habit.startTime && (
                        <span className="rounded-full border bg-muted/50 px-2 py-0.5 tabular-nums">
                          {habit.startTime}
                        </span>
                      )}
                    </div>
                  </div>
                  {habitSavingIds.has(habit.id) && (
                    <span className="shrink-0 text-xs text-muted-foreground" role="status">
                      Saving…
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
      </div>
      </FadeIn>
      )}
      </div>

      </section>
      <TaskDetails
        task={selectedTask}
        group={selectedGroup}
        width={taskDetailsWidth}
        now={now}
        todayKey={todayKey}
        onResizeStart={startResizingTaskDetails}
        onResize={resizeTaskDetails}
        onResizeEnd={stopResizingTaskDetails}
        onResizeWidth={(delta) =>
          setTaskDetailsWidth((current) =>
            Math.min(getMaxTaskDetailsWidth(), Math.max(280, current + delta))
          )
        }
        onClose={() => setSelectedTaskId(null)}
        onToggle={handleToggle}
        onEdit={handleEditTask}
        onDelete={handleRequestDelete}
        onEditGroup={(group) =>
          window.dispatchEvent(
            new CustomEvent("task-group-edit-requested", { detail: group })
          )
        }
        onDeleteGroup={(group) => setDeleteGroupTarget(group)}
      />

      <AnimatePresence>
        {todaysHabits.length > 0 && !habitsInView && (
          <motion.button
            key="habits-fab"
            type="button"
            onClick={handleScrollToHabits}
            initial={{ opacity: 0, y: 16, x: "-50%", scale: 0.92 }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: 16, x: "-50%", scale: 0.92 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex items-center gap-2.5 rounded-full border border-border/70 bg-background/90 px-6 py-3.5 text-base font-semibold text-foreground shadow-lg shadow-black/10 backdrop-blur-xl transition-colors hover:bg-background md:bottom-6"
            aria-label="Scroll to habits"
          >
            <span>Habits</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium tabular-nums text-primary">
              {completedHabitCount}/{todaysHabits.length}
            </span>
            <ChevronDown className="size-4" />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="fixed inset-x-2 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] z-30 flex items-end justify-end gap-2 md:hidden">
        <AnimatePresence initial={false}>
          {selectedTask && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{
                duration: 0.42,
                ease: [0.22, 1, 0.36, 1],
                opacity: { duration: 0.32 },
              }}
              className="min-w-0 flex-1"
            >
              <div className="flex min-w-0 items-center gap-1 rounded-2xl border border-border/50 bg-background/70 p-1 shadow-xl shadow-black/10 backdrop-blur-xl">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Close task preview"
                  onClick={() => setSelectedTaskId(null)}
                  className="size-8 shrink-0 rounded-xl"
                >
                  <X />
                </Button>
                <button
                  type="button"
                  aria-label={`More information for ${selectedTask.title}`}
                  onClick={() => setMobileDetailsOpen(true)}
                  className="min-w-0 flex-1 py-1 text-left"
                >
                  <span className="block truncate text-sm font-medium">
                    {selectedTask.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Tap for more information
                  </span>
                </button>
                <ChevronUp className="mr-2 size-4 shrink-0" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex shrink-0 flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            onClick={() =>
              window.dispatchEvent(new Event("task-group-create-requested"))
            }
            aria-label="Create group"
            className="size-12 rounded-2xl border-border/50 bg-background/70 p-0 shadow-xl shadow-black/10 backdrop-blur-xl hover:bg-background/85"
          >
            <FolderPlus className="size-5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            onClick={handleCreate}
            aria-label="Add task"
            className="size-12 rounded-2xl border-border/50 bg-background/70 p-0 shadow-xl shadow-black/10 backdrop-blur-xl hover:bg-background/85"
          >
            <Plus className="size-5" />
          </Button>
        </div>
      </div>

      <Drawer
        open={mobileDetailsOpen && Boolean(selectedTask)}
        onOpenChange={setMobileDetailsOpen}
        swipeDirection="down"
      >
        <DrawerContent className="h-[min(80dvh,36rem)] max-h-[min(80dvh,36rem)]">
          <DrawerHeader className="flex-row items-start gap-3">
            {selectedTask && (
              <TaskCheckbox
                checked={selectedTask.completed}
                onCheckedChange={() => handleToggle(selectedTask)}
                aria-label={`Mark ${selectedTask.title} as ${selectedTask.completed ? "incomplete" : "complete"}`}
                className="mt-0.5 shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <DrawerTitle className="break-words text-base">
                {selectedTask?.title ?? "Task details"}
              </DrawerTitle>
              <DrawerDescription className="mt-1">
                {selectedTask
                  ? `${selectedTask.category} · ${selectedTask.dueDate ? shortLabel(selectedTask.dueDate) : "No due date"}`
                  : "Review the task details, schedule, and progress."}
              </DrawerDescription>
            </div>
            {selectedTask && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Close task details"
                onClick={() => setMobileDetailsOpen(false)}
                className="shrink-0"
              >
                <X />
              </Button>
            )}
          </DrawerHeader>
          {selectedTask && (
            <TaskDetails
              task={selectedTask}
              width={taskDetailsWidth}
              now={now}
              todayKey={todayKey}
              onResizeStart={startResizingTaskDetails}
              onResize={resizeTaskDetails}
              onResizeEnd={stopResizingTaskDetails}
              onClose={() => {
                setSelectedTaskId(null);
                setMobileDetailsOpen(false);
              }}
              onToggle={handleToggle}
              onEdit={handleEditTask}
              onDelete={handleRequestDelete}
              onEditGroup={(group) =>
                window.dispatchEvent(
                  new CustomEvent("task-group-edit-requested", { detail: group })
                )
              }
              onDeleteGroup={(group) => setDeleteGroupTarget(group)}
              presentation="drawer"
            />
          )}
        </DrawerContent>
      </Drawer>

      <TaskEditorDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        task={editing}
        groups={taskGroups}
        defaultGroupId=        {selectedGroupId !== "all" && selectedGroupId !== "ungrouped"
          ? selectedGroupId
          : undefined}
        onSave={handleSave}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this task?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `“${deleteTarget.title}” and its completion history will be permanently deleted.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteTarget) return;
                void handleDelete(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Delete task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteGroupTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteGroupTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this group?</DialogTitle>
            <DialogDescription>
              {deleteGroupTarget
                ? `“${deleteGroupTarget.name}” will be deleted. Its tasks will be moved to Ungrouped.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteGroupTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteGroupTarget) void handleDeleteGroup(deleteGroupTarget);
              }}
            >
              Delete group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
