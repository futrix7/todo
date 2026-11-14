"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
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


type Filter = "all" | "active" | "done";

const COMPLETED_TASK_LIST_RETENTION_MS = 8 * 60 * 60 * 1000;

function scheduleLabel(task: Task) {
  if (!task.startTime) return task.endTime ? `by ${task.endTime}` : null;
  if (task.endTime) return `${task.startTime} – ${task.endTime}`;
  return task.duration ? `${task.startTime} · ${task.duration}m` : task.startTime;
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
  now: number;
  todayKey: string;
}) {
  const schedule = scheduleLabel(task);
  const overdue = overdueLabel(task, todayKey, now);
  const isChallenge = task.category === "Challenge";
  const priorityClass =
    task.priority === "high"
      ? "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300"
      : task.priority === "low"
        ? "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300"
        : null;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.24), ease: EASE }}
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
            {isChallenge && (
              <span className="inline-flex shrink-0 items-center rounded-full border border-yellow-500/30 bg-yellow-400/15 px-2 py-0.5 text-[10px] font-semibold leading-none text-yellow-800 dark:text-yellow-300">
                Challenge
              </span>
            )}
          </button>
          {task.notes && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground sm:line-clamp-2">
              {task.notes}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
            {!isChallenge && (
              <span className="rounded-full border bg-muted/50 px-2 py-0.5 text-muted-foreground">
                {task.category}
              </span>
            )}
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
                  {task.category === "Challenge" ? "Challenges" : task.category}
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
  const [filter, setFilter] = React.useState<Filter>("all");
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
      setSelectedGroupId(groupId ?? "all");
    }

    function handleGroupSelection(event: Event) {
      if (!(event instanceof CustomEvent)) return;
      if (typeof event.detail !== "string") return;
      setSelectedGroupId(event.detail);
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
      setSelectedGroupId(group.id);
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
          current === "challenges" ||
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
      if (!task.completed || task.category === "Challenge") continue;
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

        const isChallenge = task.category === "Challenge";
        const matchesGroup =
          selectedGroupId === "all" ||
          (selectedGroupId === "challenges"
            ? isChallenge
            : selectedGroupId === "ungrouped"
              ? !task.groupId && !isChallenge
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
        const isChallenge = task.category === "Challenge";
        return (
          selectedGroupId === "all" ||
          (selectedGroupId === "challenges"
            ? isChallenge
            : selectedGroupId === "ungrouped"
              ? !task.groupId && !isChallenge
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
        : selectedGroupId === "challenges"
          ? "Challenge tasks"
          : taskGroups.find((group) => group.id === selectedGroupId)?.name ??
            "All tasks";
  const selectedGroup = taskGroups.find((group) => group.id === selectedGroupId);

  const handleCreate = React.useCallback(() => {
    setEditing(null);
    setDialogOpen(true);
  }, []);

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
      className="flex h-full min-h-0 w-full min-w-0 flex-col items-stretch gap-4 lg:flex-row lg:gap-0"
    >
      <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden px-1 pt-0 pb-2 sm:px-2 sm:gap-4 lg:gap-6 lg:py-4 lg:pl-2 lg:pr-5">
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
            onChange={(event) => setTaskSearch(event.target.value)}
            placeholder="Search tasks"
            aria-label="Search tasks by title or notes"
            className="h-9 pl-9"
          />
        </div>
        <Progress
        value={progress}
        className="[&_[data-slot=progress-track]]:h-1.5 lg:[&_[data-slot=progress-track]]:h-3"
        />
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList variant="default" className="grid h-8 w-full grid-cols-3 rounded-xl lg:h-10">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="done">Done</TabsTrigger>
          </TabsList>
        </Tabs>
      </FadeIn>

      {/* Task list */}
      <div
        className="min-h-0 min-w-0 flex-1 overflow-y-auto lg:pr-1"
        data-resizing={resizingDetails || undefined}
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
                <AnimatePresence mode="popLayout">
                  {displayedTasks.map((task, i) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      index={i}
                      selected={selectedTask?.id === task.id}
                      now={now}
                      todayKey={todayKey}
                      onToggle={handleToggle}
                      onSelect={handleSelectTask}
                      onEdit={handleEditTask}
                      onDelete={handleRequestDelete}
                    />
                  ))}
                </AnimatePresence>
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
                  ? `${selectedTask.category === "Challenge" ? "Challenge" : selectedTask.category} · ${selectedTask.dueDate ? shortLabel(selectedTask.dueDate) : "No due date"}`
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
        defaultGroupId={
          selectedGroupId !== "all" &&
          selectedGroupId !== "ungrouped" &&
          selectedGroupId !== "challenges"
            ? selectedGroupId
            : undefined
        }
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
