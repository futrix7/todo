export type Priority = "low" | "medium" | "high";

export type Repeat = "none" | "daily" | "weekdays" | "weekly" | "monthly";

export interface Task {
  id: string;
  title: string;
  notes?: string;
  completed: boolean;
  priority: Priority;
  category: string;
  /** yyyy-MM-dd */
  dueDate?: string;
  /** HH:mm */
  startTime?: string;
  /** minutes */
  duration?: number;
  repeat: Repeat;
  reminder: boolean;
  streakEnabled: boolean;
  currentStreak: number;
  longestStreak: number;
  /** yyyy-MM-dd of the last day this task was completed */
  lastCompletedOn?: string;
  /** yyyy-MM-dd */
  createdAt: string;
}

export interface TaskCompletion {
  taskId: string;
  /** yyyy-MM-dd in the user's local timezone */
  completedOn: string;
  completedAt: string;
}

export type DayRating = "up" | "down";

export interface DayEntry {
  id: string;
  /** yyyy-MM-dd */
  date: string;
  /** 1 (awful) .. 5 (great) */
  mood: number;
  note: string;
  rating: DayRating;
  /** ISO timestamp of the most recent check-in save */
  checkedInAt?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  /** ISO timestamp */
  createdAt: string;
  bio?: string;
}
