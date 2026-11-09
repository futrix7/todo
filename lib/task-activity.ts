import type { Task, TaskCompletion } from "@/lib/types";

export function getTaskActivity(
  tasks: Task[],
  completions: TaskCompletion[],
  today: string
): TaskCompletion[] {
  const activity = new Map<string, TaskCompletion>();
  for (const completion of completions) {
    activity.set(`${completion.taskId}:${completion.completedOn}`, completion);
  }
  for (const task of tasks) {
    const completedOn =
      task.lastCompletedOn && (!today || task.lastCompletedOn <= today)
        ? task.lastCompletedOn
        : "";
    if (!completedOn) continue;
    const key = `${task.id}:${completedOn}`;
    if (!activity.has(key)) {
      activity.set(key, {
        taskId: task.id,
        completedOn,
        completedAt: `${completedOn}T12:00:00`,
      });
    }
  }
  return [...activity.values()].sort((a, b) =>
    a.completedOn.localeCompare(b.completedOn)
  );
}

function dayDifference(previous: string, current: string): number {
  const previousDate = new Date(`${previous}T12:00:00`);
  const currentDate = new Date(`${current}T12:00:00`);
  return Math.round((currentDate.getTime() - previousDate.getTime()) / 86_400_000);
}

export function getActivityStreaks(
  completions: TaskCompletion[],
  today: string
): { current: number; longest: number } {
  return getStreaksFromDays(
    completions.map((item) => item.completedOn),
    today
  );
}

export function getEngagementStreaks(
  completions: TaskCompletion[],
  tasks: Task[],
  checkInDates: string[],
  today: string
): { current: number; longest: number; activeDays: string[] } {
  const streaks = getStreaksFromDays(
    [
      ...completions.map((item) => item.completedOn),
      ...tasks.map((task) => task.createdAt),
      ...checkInDates,
    ],
    today
  );

  return {
    current: streaks.current,
    longest: streaks.longest,
    activeDays: streaks.days,
  };
}

function getStreaksFromDays(
  dates: string[],
  today: string
): { current: number; longest: number; days: string[] } {
  const activeDays = [...new Set(dates)].sort();
  let longest = 0;
  let currentRun = 0;
  let previous = "";

  for (const day of activeDays) {
    currentRun =
      previous && dayDifference(previous, day) === 1 ? currentRun + 1 : 1;
    longest = Math.max(longest, currentRun);
    previous = day;
  }

  if (!today || !activeDays.length) {
    return { current: 0, longest, days: activeDays };
  }

  let current = 0;
  let cursor = activeDays.at(-1) ?? "";
  const difference = dayDifference(cursor, today);
  if (difference > 1 || difference < 0) {
    return { current: 0, longest, days: activeDays };
  }

  for (let index = activeDays.length - 1; index >= 0; index--) {
    const day = activeDays[index];
    if (cursor && dayDifference(day, cursor) !== 1 && day !== cursor) break;
    current++;
    cursor = day;
  }

  return { current, longest, days: activeDays };
}
