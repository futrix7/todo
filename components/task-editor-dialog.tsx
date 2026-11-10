"use client";

import * as React from "react";
import { CalendarClock, CheckSquare, Flame, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, DURATIONS, REPEATS } from "@/lib/task-options";
import { dateKey } from "@/lib/date-utils";
import type { Priority, Repeat, Task, TaskGroup } from "@/lib/types";

export interface TaskFormValues {
  title: string;
  notes: string;
  groupId: string;
  priority: Priority;
  category: string;
  dueDate: string;
  startTime: string;
  duration: number;
  repeat: Repeat;
  reminder: boolean;
  streakEnabled: boolean;
}

const EMPTY_FORM: TaskFormValues = {
  title: "",
  notes: "",
  groupId: "",
  priority: "medium",
  category: "Work",
  dueDate: "",
  startTime: "",
  duration: 30,
  repeat: "none",
  reminder: false,
  streakEnabled: false,
};

function formFromTask(task: Task): TaskFormValues {
  return {
    title: task.title,
    notes: task.notes ?? "",
    groupId: task.groupId ?? "",
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

export function taskFromForm(
  form: TaskFormValues,
  existing?: Task
): Task {
  return {
    id: existing?.id ?? `t${Date.now().toString(36)}`,
    title: form.title.trim(),
    notes: form.notes.trim() || undefined,
    groupId: form.groupId || undefined,
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
  groups,
  defaultGroupId,
  defaultDueDate,
  onSave,
  onCancel,
}: {
  task?: Task | null;
  groups: TaskGroup[];
  defaultGroupId?: string;
  defaultDueDate?: string;
  onSave: (form: TaskFormValues) => void;
  onCancel: () => void;
}) {
  const isEditing = Boolean(task);
  const [tab, setTab] = React.useState<"simple" | "advanced">(
    task ? "advanced" : "simple"
  );
  const [form, setForm] = React.useState<TaskFormValues>(() =>
    task
      ? formFromTask(task)
      : {
          ...EMPTY_FORM,
          groupId: defaultGroupId ?? "",
          dueDate: defaultDueDate ?? "",
        }
  );

  const set = <K extends keyof TaskFormValues>(
    key: K,
    value: TaskFormValues[K]
  ) => setForm((previous) => ({ ...previous, [key]: value }));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) {
      toast.error("Give your task a title first.");
      return;
    }
    onSave(form);
  }

  function advanceOnEnter(event: React.KeyboardEvent<HTMLFormElement>) {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing ||
      (!(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement))
    ) {
      return;
    }

    const fields = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), [data-slot="select-trigger"]:not([aria-disabled="true"]), [data-slot="switch"]:not([data-disabled="true"])'
      )
    ).filter((field) => field.getClientRects().length > 0);
    const currentIndex = fields.indexOf(event.target);
    if (currentIndex === -1) return;

    event.preventDefault();
    const nextField = fields[currentIndex + 1];
    if (nextField) nextField.focus();
    else event.currentTarget.requestSubmit();
  }

  return (
    <form
      onSubmit={submit}
      onKeyDown={advanceOnEnter}
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5"
    >
      <Tabs value={tab} onValueChange={(value) => setTab(value as "simple" | "advanced")}>
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
              onChange={(event) => set("title", event.target.value)}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-notes">Notes</Label>
            <Textarea
              id="task-notes"
              rows={3}
              value={form.notes}
              onChange={(event) => set("notes", event.target.value)}
            />
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="flex flex-col gap-3 pt-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title-adv">Title</Label>
            <Input
              id="task-title-adv"
              value={form.title}
              onChange={(event) => set("title", event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-date">Due date</Label>
              <Input
                id="task-date"
                type="date"
                value={form.dueDate}
                onChange={(event) => set("dueDate", event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-time">Start time</Label>
              <Input
                id="task-time"
                type="time"
                value={form.startTime}
                onChange={(event) => set("startTime", event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Duration</Label>
              <Select
                value={form.duration}
                onValueChange={(value) => set("duration", Number(value))}
                items={DURATIONS.map((duration) => ({
                  value: duration,
                  label: `${duration} min`,
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((duration) => (
                    <SelectItem key={duration} value={duration}>
                      {duration} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Repeat</Label>
              <Select
                value={form.repeat}
                onValueChange={(value) => set("repeat", value as Repeat)}
                items={REPEATS.map((repeat) => ({
                  value: repeat.value,
                  label: repeat.label,
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPEATS.map((repeat) => (
                    <SelectItem key={repeat.value} value={repeat.value}>
                      {repeat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>Task group</Label>
              <Select
                value={form.groupId || "none"}
                onValueChange={(value) =>
                  set("groupId", value === null || value === "none" ? "" : value)
                }
                items={[
                  { value: "none", label: "No group" },
                  ...groups.map((group) => ({
                    value: group.id,
                    label: group.name,
                  })),
                ]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No group</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(value) => set("priority", value as Priority)}
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
                onValueChange={(value) =>
                  set("category", value ?? form.category)
                }
                items={CATEGORIES.map((category) => ({
                  value: category,
                  label: category,
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
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
              onChange={(event) => set("notes", event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2.5 rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Reminder</p>
              <Switch
                checked={form.reminder}
                onCheckedChange={(value) => set("reminder", value)}
              />
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Flame className="size-3.5 text-primary" /> Track streak
              </p>
              <Switch
                checked={form.streakEnabled}
                onCheckedChange={(value) => set("streakEnabled", value)}
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

export function TaskEditorDialog({
  open,
  onOpenChange,
  task,
  groups,
  defaultGroupId,
  defaultDueDate,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  groups: TaskGroup[];
  defaultGroupId?: string;
  defaultDueDate?: string;
  onSave: (form: TaskFormValues) => void;
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
      <DialogContent className="max-h-[calc(100dvh-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{displayedTask ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription className="sr-only">
            {displayedTask ? "Edit task details." : "Create a task."}
          </DialogDescription>
        </DialogHeader>
        <TaskForm
          key={`${displayedTask?.id ?? "new"}-${defaultGroupId ?? "none"}-${defaultDueDate ?? "undated"}-${formResetKey}`}
          task={displayedTask}
          groups={groups}
          defaultGroupId={defaultGroupId}
          defaultDueDate={defaultDueDate}
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
