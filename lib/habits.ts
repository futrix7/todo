export type HabitType = "yes_no" | "count" | "measure" | "quit";
export type HabitFrequency = "daily" | "weekdays" | "monthly" | "custom";
export type HabitColor = "gray" | "teal" | "blue" | "violet" | "amber" | "rose";
export type HabitLogStatus = "in_progress" | "completed" | "skipped";

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  notes: string;
  category: string;
  type: HabitType;
  frequency: HabitFrequency;
  scheduleDays: number[];
  startedOn: string;
  endedOn: string | null;
  startTime: string | null;
  targetValue: number;
  unit: string;
  color: HabitColor;
  archived: boolean;
  createdAt: string;
}

export interface HabitLog {
  habitId: string;
  completedOn: string;
  value: number;
  status: HabitLogStatus;
  loggedAt: string;
}
