"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  ChevronRight,
  CheckSquare,
  Flame,
  Loader2,
  ListTodo,
  MoreVertical,
  Pencil,
  Plus,
  Smile,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { dateKey, longDateLabel, shortLabel } from "@/lib/date-utils";
import { getActivityStreaks } from "@/lib/task-activity";
import { CATEGORIES, DURATIONS, REPEATS } from "@/lib/task-options";
import type {
  Priority,
  Repeat as RepeatType,
  Task,
  TaskCompletion,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/lib/supabase/task-data";
import { useSupabaseDataStatus } from "@/components/supabase-data-provider";


type Filter = "all" | "active" | "done";

interface FormState {
  title: string;
  notes: string;
  priority: Priority;
  category: string;
  dueDate: string;
  startTime: string;
  duration: number;
  repeat: RepeatType;
  reminder: boolean;
  streakEnabled: boolean;
}

const EMPTY_FORM: FormState = {
  title: "",
  notes: "",
  priority: "medium",
  category: "Work",
  dueDate: "",
  startTime: "",
  duration: 30,
  repeat: "none",
  reminder: false,
  streakEnabled: false,
};

function formFromTask(task: Task): FormState {
  return {
    title: task.title,
    notes: task.notes ?? "",
    priority: task.priority,
    category: task.category,
    dueDate: task.dueDate ?? "",
    startTime: task.startTime ?? "",
    duration: task.duration ?? 30,
    repeat: task.repeat,
    reminder: task.reminder,
    streakEnabled: task.streakEnabled,
  };
}

function toTask(form: FormState, existing?: Task): Task {
  return {
    id: existing?.id ?? `t${Date.now().toString(36)}`,
    title: form.title.trim(),
    notes: form.notes.trim() || undefined,
    completed: existing?.completed ?? false,
    priority: form.priority,
    category: form.category,
    dueDate: form.dueDate || undefined,
    startTime: form.startTime || undefined,
    duration: form.duration,
    repeat: form.repeat,
    reminder: form.reminder,
    streakEnabled: form.streakEnabled,
    currentStreak: existing?.currentStreak ?? 0,
    longestStreak: existing?.longestStreak ?? 0,
    lastCompletedOn: existing?.lastCompletedOn,
    createdAt: existing?.createdAt ?? dateKey(new Date()),
  };
}

function TaskForm({
  task,
  onSave,
  onCancel,
}: {
  task?: Task | null;
  onSave: (form: FormState) => void;
  onCancel: () => void;
}) {
  const isEditing = Boolean(task);
  const [tab, setTab] = React.useState<"simple" | "advanced">(
    task ? "advanced" : "simple"
  );
  const [form, setForm] = React.useState<FormState>(
    task ? formFromTask(task) : EMPTY_FORM
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) {
      toast.error("Give your task a title first.");
      return;
    }
    onSave(form);
  }

  return (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "simple" | "advanced")}>
            <TabsList variant="line" className="w-full">
              <TabsTrigger value="simple" className="flex-1">
                <CheckSquare /> Simple
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex-1">
                <CalendarClock /> Advanced
              </TabsTrigger>
            </TabsList>

            <TabsContent value="simple" className="flex flex-col gap-3 pt-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-title">Title</Label>
                <Input
                  id="task-title"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-notes">Notes</Label>
                <Textarea
                  id="task-notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="flex flex-col gap-3 pt-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-title-adv">Title</Label>
                <Input
                  id="task-title-adv"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="task-date">Due date</Label>
                  <Input
                    id="task-date"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => set("dueDate", e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="task-time">Start time</Label>
                  <Input
                    id="task-time"
                    type="time"
                    value={form.startTime}
                    onChange={(e) => set("startTime", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Duration</Label>
                  <Select
                    value={form.duration}
                    onValueChange={(v) => set("duration", Number(v))}
                    items={DURATIONS.map((d) => ({ value: d, label: `${d} min` }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATIONS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d} min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Repeat</Label>
                  <Select
                    value={form.repeat}
                    onValueChange={(v) => set("repeat", v as RepeatType)}
                    items={REPEATS.map((r) => ({ value: r.value, label: r.label }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REPEATS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Priority</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => set("priority", v as Priority)}
                    items={[
                      { value: "low", label: "Low" },
                      { value: "medium", label: "Medium" },
                      { value: "high", label: "High" },
                    ]}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => set("category", v as string)}
                    items={CATEGORIES.map((c) => ({ value: c, label: c }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-notes-adv">Notes</Label>
                <Textarea
                  id="task-notes-adv"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2.5 rounded-lg border bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Reminder</p>
                  </div>
                  <Switch
                    checked={form.reminder}
                    onCheckedChange={(v) => set("reminder", v)}
                  />
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <Flame className="size-3.5 text-primary" /> Track
                      streak
                    </p>
                  </div>
                  <Switch
                    checked={form.streakEnabled}
                    onCheckedChange={(v) => set("streakEnabled", v)}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              <Plus /> {isEditing ? "Save changes" : "Add task"}
            </Button>
          </DialogFooter>
        </form>
  );
}

function TaskDialog({
  open,
  onOpenChange,
  task,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  onSave: (form: FormState) => void;
}) {
  const [closingTask, setClosingTask] = React.useState(task);
  const [formResetKey, setFormResetKey] = React.useState(0);
  const displayedTask = open ? task : closingTask;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setClosingTask(task);
        onOpenChange(nextOpen);
      }}
      onOpenChangeComplete={(nextOpen) => {
        if (!nextOpen) {
          setClosingTask(null);
          setFormResetKey((current) => current + 1);
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{displayedTask ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription className="sr-only">
            {displayedTask ? "Edit task details." : "Create a task."}
          </DialogDescription>
        </DialogHeader>
        <TaskForm
          key={`${displayedTask?.id ?? "new"}-${formResetKey}`}
          task={displayedTask}
          onSave={(form) => {
            setClosingTask(displayedTask);
            onSave(form);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function TaskItem({
  task,
  onToggle,
  onEdit,
  onDelete,
  index,
}: {
  task: Task;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  index: number;
}) {
  const meta = [task.category, `${task.priority} priority`];
  if (task.startTime) {
    meta.push(
      `${task.startTime}${task.duration ? ` · ${task.duration}m` : ""}`
    );
  }
  if (task.dueDate) {
    meta.push(shortLabel(task.dueDate));
  }
  if (task.repeat !== "none") {
    const label = REPEATS.find((r) => r.value === task.repeat)?.label ?? task.repeat;
    meta.push(label);
  }
  if (task.streakEnabled) {
    meta.push(`${task.currentStreak} day streak`);
  }

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
        className={cn(
          "flex min-w-0 items-start gap-2.5 rounded-xl border bg-card p-2.5 transition-colors hover:border-primary/20 hover:bg-muted/20 sm:gap-3 sm:p-3",
          task.completed && "opacity-75"
        )}
      >
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => onToggle(task)}
          className="mt-0.5"
          aria-label={`Mark ${task.title} as ${task.completed ? "incomplete" : "complete"}`}
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-medium break-words leading-snug",
              task.completed && "text-muted-foreground line-through"
            )}
          >
            {task.title}
          </p>
          {task.notes && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground sm:line-clamp-2">
              {task.notes}
            </p>
          )}
          <p className="mt-1.5 truncate text-[11px] text-muted-foreground">
            {meta.join(" · ")}
          </p>
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
  const todayKey = useTodayKey();
  const [loadedUserId, setLoadedUserId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Task | null>(null);

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
  }, [user?.id, setTasks, setCompletions, reportError, schemaUnavailable]);

  const completedToday = new Set(
    completions
      .filter((completion) => completion.completedOn === todayKey)
      .map((completion) => completion.taskId)
  );
  const dailyTasks = tasks.map((task) => {
    const taskHistory = completions.filter((item) => item.taskId === task.id);
    const taskStreaks = getActivityStreaks(taskHistory, todayKey);
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
  });
  const visible = dailyTasks.filter((task) =>
    filter === "all" ? true : filter === "active" ? !task.completed : task.completed
  );
  const doneCount = dailyTasks.filter((task) => task.completed).length;
  const progress = dailyTasks.length ? (doneCount / dailyTasks.length) * 100 : 0;

  function handleCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  async function handleSave(form: FormState) {
    const task = editing ? toTask(form, editing) : toTask(form);
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
      await saveTask(user.id, task);
    } catch (error) {
      reportError(error);
      return;
    }

    if (editing) {
      setTasks((prev) => prev.map((item) => (item.id === editing.id ? task : item)));
      toast.success("Task updated.");
    } else {
      setTasks((prev) => [task, ...prev]);
      toast.success("Task added. Planning counts toward your daily streak.");
    }
    setDialogOpen(false);
    setEditing(null);
  }

  async function handleToggle(task: Task) {
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
    const completing = !task.completed;
    const today = todayKey;
    const taskHistory = completions.filter(
      (item) => item.taskId === task.id && item.completedOn !== today
    );
    const nextTaskHistory = completing
      ? [...taskHistory, {
          taskId: task.id,
          completedOn: today,
          completedAt: new Date().toISOString(),
        }]
      : taskHistory;
    const taskStreaks = getActivityStreaks(nextTaskHistory, today);
    const nextTask: Task = {
      ...task,
      completed: completing,
      currentStreak: taskStreaks.current,
      longestStreak: Math.max(task.longestStreak, taskStreaks.longest),
      lastCompletedOn:
        nextTaskHistory
          .map((item) => item.completedOn)
          .sort()
          .at(-1) || undefined,
    };
    const completion: TaskCompletion = {
      taskId: task.id,
      completedOn: today,
      completedAt: new Date().toISOString(),
    };

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
    } catch (error) {
      reportError(error);
      return;
    }
    setTasks((prev) => prev.map((item) => (item.id === task.id ? nextTask : item)));
    setCompletions((prev) =>
      completing
        ? [...prev.filter((item) => !(item.taskId === task.id && item.completedOn === today)), completion]
        : prev.filter((item) => !(item.taskId === task.id && item.completedOn === today))
    );
    if (completing) {
      toast.success(`Nice one — “${task.title}” done! 🎉`);
    }
  }

  async function handleDelete(task: Task) {
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
      await removeTask(user.id, task.id);
    } catch (error) {
      reportError(error);
      return;
    }
    setTasks((prev) => prev.filter((item) => item.id !== task.id));
    setCompletions((prev) => prev.filter((item) => item.taskId !== task.id));
    toast.info(`“${task.title}” deleted.`);
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
    return (
      <div className="flex min-h-48 items-center justify-center" role="status">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span className="sr-only">Loading tasks</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* How is your day? */}
      <FadeIn>
        <Link
          href="/days"
          className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Card className="transition-colors hover:border-primary/30 hover:bg-primary/[0.02]">
            <CardContent className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Smile className="size-5 text-primary" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-heading text-sm font-medium">
                  How is your day?
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {todayKey ? longDateLabel(todayKey) : ""}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </CardContent>
          </Card>
        </Link>
      </FadeIn>

      {/* Header + progress */}
      <FadeIn delay={0.06} className="flex flex-col gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Today&apos;s tasks
          </h2>
        </div>
        <Progress value={progress} className="[&_[data-slot=progress-track]]:h-3" />
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList variant="default" className="grid h-10 w-full grid-cols-3 rounded-xl">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="done">Done</TabsTrigger>
          </TabsList>
        </Tabs>
      </FadeIn>

      {/* Task list */}
      <FadeIn delay={0.12}>
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-14 text-center">
            <ListTodo className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">No tasks here</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a task to start building your daily list.
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex min-w-0 flex-col gap-2">
            <AnimatePresence mode="popLayout">
              {visible.map((task, i) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  index={i}
                  onToggle={handleToggle}
                  onEdit={(t) => {
                    setEditing(t);
                    setDialogOpen(true);
                  }}
                  onDelete={(taskToDelete) => setDeleteTarget(taskToDelete)}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </FadeIn>

      <Button
        onClick={handleCreate}
        className="fixed right-4 bottom-[calc(7rem+env(safe-area-inset-bottom))] z-30 h-11 rounded-full px-4 shadow-lg md:right-6 md:bottom-6"
      >
        <Plus /> Add task
      </Button>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        task={editing}
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
    </div>
  );
}
