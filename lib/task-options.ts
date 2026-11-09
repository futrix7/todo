export const MOODS = [
  { value: 1, emoji: "😡", label: "Awful" },
  { value: 2, emoji: "😕", label: "Bad" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
] as const;

export const CATEGORIES = [
  "Work",
  "Personal",
  "Health",
  "Learning",
  "Finance",
] as const;

export const DURATIONS = [15, 30, 45, 60, 90, 120, 180] as const;

export const REPEATS = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Every weekday" },
  { value: "weekly", label: "Every week" },
  { value: "monthly", label: "Every month" },
] as const;
