import { shortLabel } from "@/lib/date-utils";
import type { Habit, HabitLog } from "@/lib/habits";

function localDate(key: string) {
  return new Date(`${key}T12:00:00`);
}

export function isHabitScheduledOn(habit: Habit, date: string) {
  if (
    date < habit.startedOn ||
    (habit.endedOn !== null && date > habit.endedOn)
  ) {
    return false;
  }

  const day = localDate(date).getDay();
  if (habit.frequency === "daily") return true;
  if (habit.frequency === "weekdays") return day > 0 && day < 6;
  if (habit.frequency === "monthly") {
    const [year, month] = date.split("-").map(Number);
    const monthLength = new Date(year, month, 0).getDate();
    const startDay = localDate(habit.startedOn).getDate();
    return localDate(date).getDate() === Math.min(startDay, monthLength);
  }
  return habit.scheduleDays.includes(day);
}

export interface HabitConsistencyPoint {
  date: string;
  day: string;
  completed: number;
  scheduled: number;
  consistency: number | null;
}

export function getHabitConsistencySeries(
  habits: Habit[],
  logs: HabitLog[],
  dates: string[]
): HabitConsistencyPoint[] {
  const logsByDate = new Map(
    logs.map((log) => [`${log.habitId}:${log.completedOn}`, log])
  );

  return dates.map((date) => {
    let scheduled = 0;
    let completed = 0;

    for (const habit of habits) {
      if (!isHabitScheduledOn(habit, date)) continue;
      scheduled++;
      if (
        logsByDate.get(`${habit.id}:${date}`)?.status === "completed"
      ) {
        completed++;
      }
    }

    return {
      date,
      day: shortLabel(date),
      completed,
      scheduled,
      consistency: scheduled ? Math.round((completed / scheduled) * 100) : null,
    };
  });
}

export interface HabitProgressPoint {
  date: string;
  day: string;
  value: number | null;
  target: number;
}

export function getHabitProgressSeries(
  habit: Habit,
  logs: HabitLog[],
  dates: string[]
): HabitProgressPoint[] {
  const logsByDate = new Map(
    logs
      .filter((log) => log.habitId === habit.id)
      .map((log) => [log.completedOn, log])
  );
  const target =
    habit.type === "count" || habit.type === "measure"
      ? habit.targetValue
      : 1;

  return dates.map((date) => {
    const log = logsByDate.get(date);
    const isScheduled = isHabitScheduledOn(habit, date);
    const value =
      log?.status === "completed" || log?.status === "in_progress"
        ? log.value
        : 0;
    return {
      date,
      day: shortLabel(date),
      value: isScheduled ? Math.min(target, value) : null,
      target,
    };
  });
}
