"use client";

import * as React from "react";
import {
  Check,
  CircleCheck,
  Flame,
  Hash,
  Ruler,
  X,
} from "lucide-react";
import { toast } from "sonner";

import type {
  Habit,
  HabitColor,
  HabitFrequency,
  HabitType,
} from "@/lib/habits";
import { HABIT_ICON_OPTIONS, HabitIcon } from "@/components/habit-icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface HabitFormValues {
  name: string;
  emoji: string;
  notes?: string;
  category: string;
  startedOn: string;
  endedOn: string;
  type: HabitType;
  frequency: HabitFrequency;
  scheduleDays: number[];
  startTime: string;
  targetValue: number;
  unit: string;
  color: HabitColor;
}

const DAYS = [
  { label: "Su", name: "Sunday", value: 0 },
  { label: "Mo", name: "Monday", value: 1 },
  { label: "Tu", name: "Tuesday", value: 2 },
  { label: "We", name: "Wednesday", value: 3 },
  { label: "Th", name: "Thursday", value: 4 },
  { label: "Fr", name: "Friday", value: 5 },
  { label: "Sa", name: "Saturday", value: 6 },
];

const TYPES: {
  value: HabitType;
  title: string;
  description: string;
  icon: typeof CircleCheck;
}[] = [
  {
    value: "yes_no",
    title: "Yes / No",
    description: "Mark it done each day",
    icon: CircleCheck,
  },
  {
    value: "count",
    title: "Count",
    description: "Track a number of repeats",
    icon: Hash,
  },
  {
    value: "measure",
    title: "Measure",
    description: "Track a value or duration",
    icon: Ruler,
  },
  {
    value: "quit",
    title: "Quit",
    description: "Record a day staying on track",
    icon: Flame,
  },
];

const COLORS: { value: HabitColor; label: string; className: string }[] = [
  { value: "gray", label: "Gray", className: "bg-slate-400" },
  { value: "teal", label: "Teal", className: "bg-teal-500" },
  { value: "blue", label: "Blue", className: "bg-blue-500" },
  { value: "violet", label: "Violet", className: "bg-violet-500" },
  { value: "amber", label: "Amber", className: "bg-amber-500" },
  { value: "rose", label: "Rose", className: "bg-rose-500" },
];

const FREQUENCY_OPTIONS: { value: HabitFrequency; label: string }[] = [
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Choose days" },
];

const CATEGORY_OPTIONS = [
  { value: "Personal", label: "Personal" },
  { value: "Health", label: "Health" },
  { value: "Learning", label: "Learning" },
  { value: "Work", label: "Work" },
  { value: "Fitness", label: "Fitness" },
  { value: "Other", label: "Other" },
];

const INITIAL_FORM: HabitFormValues = {
  name: "",
  emoji: "sparkles",
  notes: "",
  category: "Personal",
  startedOn: "",
  endedOn: "",
  type: "yes_no",
  frequency: "daily",
  scheduleDays: [],
  startTime: "",
  targetValue: 8,
  unit: "",
  color: "gray",
};

function formFromHabit(
  habit: Habit | null | undefined,
  today: string
): HabitFormValues {
  const initial = { ...INITIAL_FORM };
  if (!habit) return { ...initial, startedOn: today };
  return {
    name: habit.name,
    emoji: habit.emoji,
    notes: habit.notes ?? initial.notes,
    category: habit.category,
    startedOn: habit.startedOn,
    endedOn: habit.endedOn ?? "",
    type: habit.type,
    frequency: habit.frequency,
    scheduleDays: habit.scheduleDays,
    startTime: habit.startTime ?? "",
    targetValue: habit.targetValue,
    unit: habit.unit,
    color: habit.color,
  };
}

function HabitForm({
  habit,
  today,
  saving,
  onSave,
  onCancel,
}: {
  habit?: Habit | null;
  today: string;
  saving: boolean;
  onSave: (form: HabitFormValues) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = React.useState(() => formFromHabit(habit, today));

  function set<K extends keyof HabitFormValues>(
    key: K,
    value: HabitFormValues[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleDay(day: number) {
    setForm((current) => {
      const selected = current.scheduleDays.includes(day);
      return {
        ...current,
        scheduleDays: selected
          ? current.scheduleDays.filter((item) => item !== day)
          : [...current.scheduleDays, day].sort((a, b) => a - b),
      };
    });
  }

  function selectType(type: HabitType) {
    setForm((current) => ({
      ...current,
      type,
      unit:
        current.unit ||
        (type === "count" ? "times" : type === "measure" ? "minutes" : ""),
    }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Add a name for your habit.");
      return;
    }
    if (!form.startedOn) {
      toast.error("Choose when this habit starts.");
      return;
    }
    if (form.endedOn && form.endedOn < form.startedOn) {
      toast.error("The end date must be on or after the start date.");
      return;
    }
    if (form.frequency === "custom" && !form.scheduleDays.length) {
      toast.error("Choose at least one day for this schedule.");
      return;
    }
    if (
      (form.type === "count" || form.type === "measure") &&
      (!Number.isFinite(form.targetValue) || form.targetValue <= 0)
    ) {
      toast.error("Enter a target greater than zero.");
      return;
    }
    if (form.type === "count" && !Number.isInteger(form.targetValue)) {
      toast.error("Count targets must be whole numbers.");
      return;
    }
    onSave(form);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6 px-5 pb-5 sm:px-7 sm:pb-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="habit-name" className="text-sm font-medium">
            Habit name
          </Label>
          <Input
            id="habit-name"
            autoFocus
            maxLength={80}
            className="h-12 rounded-xl bg-muted/40 px-4"
            placeholder="e.g. Drink more water"
            value={form.name}
            onChange={(event) => set("name", event.target.value)}
          />
        </div>

        <fieldset className="flex flex-col gap-2 sm:col-span-2">
          <legend className="mb-1 text-sm font-medium">Choose an icon</legend>
          <div className="grid grid-cols-8 gap-2 sm:max-w-md">
            {HABIT_ICON_OPTIONS.map((option) => {
              const selected = form.emoji === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-label={option.label}
                  aria-pressed={selected}
                  title={option.label}
                  onClick={() => set("emoji", option.value)}
                  className={`flex size-10 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/40 hover:bg-muted/70"
                  }`}
                >
                  <HabitIcon value={option.value} className="size-5" />
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2 sm:col-span-2">
          <legend className="mb-2 text-sm font-medium">How you track it</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TYPES.map((type) => {
              const Icon = type.icon;
              const selected = form.type === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selectType(type.value)}
                  className={`flex min-h-28 flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors sm:min-h-32 sm:p-4 ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/40 hover:bg-muted/70"
                  }`}
                >
                  <Icon
                    className={`size-5 ${selected ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <span className="text-sm font-semibold">{type.title}</span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {type.description}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {(form.type === "count" || form.type === "measure") && (
          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="habit-target">Daily goal</Label>
              <Input
                id="habit-target"
                type="number"
                min="1"
                step="any"
                className="h-12 rounded-xl bg-muted/40 px-4"
                value={form.targetValue}
                onChange={(event) =>
                  set("targetValue", Number(event.target.value))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="habit-unit">Unit</Label>
              <Input
                id="habit-unit"
                maxLength={20}
                className="h-12 rounded-xl bg-muted/40 px-4"
                placeholder={form.type === "count" ? "glasses" : "minutes"}
                value={form.unit}
                onChange={(event) => set("unit", event.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="habit-frequency">Schedule</Label>
          <Select
            value={form.frequency}
            onValueChange={(value) => {
              const option = FREQUENCY_OPTIONS.find(
                (item) => item.value === value
              );
              if (option) set("frequency", option.value);
            }}
            items={FREQUENCY_OPTIONS}
          >
            <SelectTrigger
              id="habit-frequency"
              className="h-12 w-full rounded-xl bg-muted/40"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="habit-time">Time of day (optional)</Label>
          <Input
            id="habit-time"
            type="time"
            className="h-12 rounded-xl bg-muted/40 px-4"
            value={form.startTime}
            onChange={(event) => set("startTime", event.target.value)}
          />
        </div>

        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="habit-start-date">Start date</Label>
            <Input
              id="habit-start-date"
              type="date"
              className="h-12 rounded-xl bg-muted/40 px-4"
              value={form.startedOn}
              onChange={(event) => set("startedOn", event.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="habit-end-date">End date (optional)</Label>
            <Input
              id="habit-end-date"
              type="date"
              min={form.startedOn}
              className="h-12 rounded-xl bg-muted/40 px-4"
              value={form.endedOn}
              onChange={(event) => set("endedOn", event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank for an ongoing habit.
            </p>
          </div>
        </div>

        {form.frequency === "custom" && (
          <fieldset className="sm:col-span-2">
            <legend className="mb-3 text-sm font-medium">Repeat on</legend>
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((day) => {
                const selected = form.scheduleDays.includes(day.value);
                return (
                  <button
                    key={day.name}
                    type="button"
                    aria-label={day.name}
                    aria-pressed={selected}
                    onClick={() => toggleDay(day.value)}
                    className={`flex h-12 items-center justify-center rounded-xl border text-sm font-semibold transition-colors ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted/40 text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="habit-category">Category</Label>
          <Select
            value={form.category}
            onValueChange={(value) => {
              if (value !== null) set("category", value);
            }}
            items={CATEGORY_OPTIONS}
          >
            <SelectTrigger
              id="habit-category"
              className="h-12 w-full rounded-xl bg-muted/40"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Color</legend>
          <div className="flex h-12 items-center gap-3">
            {COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                aria-label={color.label}
                aria-pressed={form.color === color.value}
                onClick={() => set("color", color.value)}
                className={`flex size-9 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-shadow ${
                  form.color === color.value ? "ring-2 ring-primary" : ""
                }`}
              >
                <span className={`size-6 rounded-full ${color.className}`} />
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="habit-notes">Notes (optional)</Label>
          <Textarea
            id="habit-notes"
            rows={3}
            maxLength={500}
            className="resize-y rounded-xl bg-muted/40 px-4 py-3"
            placeholder="A little context to help you stay consistent"
            value={form.notes}
            onChange={(event) => set("notes", event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t pb-5 sm:flex-row sm:justify-end">
        <Button
          type="button"
          size="lg"
          variant="outline"
          disabled={saving}
          onClick={onCancel}
        >
          <X />
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={saving}>
          <Check />
          {saving ? "Saving…" : habit ? "Save habit" : "Create habit"}
        </Button>
      </div>
    </form>
  );
}

export function HabitEditorDialog({
  open,
  onOpenChange,
  habit,
  today,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit?: Habit | null;
  today: string;
  saving: boolean;
  onSave: (form: HabitFormValues) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-5 py-5 text-left sm:px-7 sm:py-6">
          <DialogTitle className="text-xl">
            {habit ? "Edit habit" : "Create a habit"}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm leading-relaxed">
            Keep the plan simple. You can adjust your routine any time.
          </DialogDescription>
        </DialogHeader>
        <HabitForm
          key={`${habit?.id ?? "new"}-${open}-${today}`}
          habit={habit}
          today={today}
          saving={saving}
          onSave={onSave}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
