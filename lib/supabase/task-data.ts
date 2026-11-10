import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { DayEntry, Task, TaskCompletion, TaskGroup } from "@/lib/types";

type TaskRow = { data: unknown };
type CompletionRow = {
  task_id: string;
  completed_on: string;
  completed_at: string;
};
type DayEntryRow = {
  data: unknown;
  created_at: string;
  updated_at: string;
};
type TaskGroupRow = {
  id: string;
  name: string;
  icon?: string | null;
};

let taskDataSchemaUnavailable = false;

class MissingTaskDataSchemaError extends Error {
  readonly code = "PGRST205";

  constructor() {
    super("Taskflow data tables are unavailable.");
    this.name = "MissingTaskDataSchemaError";
  }
}

export function isMissingTaskDataSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const supabaseError = error as { code?: unknown; message?: unknown };
  const missingTable =
    supabaseError.code === "PGRST205" ||
    supabaseError.code === "42P01" ||
    (typeof supabaseError.message === "string" &&
      /could not find the table|relation .* does not exist/i.test(
        supabaseError.message
      ));

  if (missingTable) taskDataSchemaUnavailable = true;
  return missingTable;
}

export function isTaskDataSchemaUnavailable(): boolean {
  return taskDataSchemaUnavailable;
}

function requireSupabase() {
  if (taskDataSchemaUnavailable) {
    throw new MissingTaskDataSchemaError();
  }
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured. Add its URL and anon key to .env.local.");
  }
  return supabase;
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const task = value as Partial<Task>;
  return (
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    (task.notes === undefined || typeof task.notes === "string") &&
    (task.groupId === undefined || typeof task.groupId === "string") &&
    typeof task.completed === "boolean" &&
    (task.priority === "low" ||
      task.priority === "medium" ||
      task.priority === "high") &&
    typeof task.category === "string" &&
    (task.dueDate === undefined || typeof task.dueDate === "string") &&
    (task.startTime === undefined || typeof task.startTime === "string") &&
    (task.duration === undefined || typeof task.duration === "number") &&
    (task.repeat === "none" ||
      task.repeat === "daily" ||
      task.repeat === "weekdays" ||
      task.repeat === "weekly" ||
      task.repeat === "monthly") &&
    typeof task.reminder === "boolean" &&
    typeof task.streakEnabled === "boolean" &&
    typeof task.currentStreak === "number" &&
    typeof task.longestStreak === "number" &&
    (task.lastCompletedOn === undefined ||
      typeof task.lastCompletedOn === "string") &&
    typeof task.createdAt === "string"
  );
}

function isDayEntry(value: unknown): value is DayEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<DayEntry>;
  return (
    typeof entry.id === "string" &&
    typeof entry.date === "string" &&
    typeof entry.mood === "number" &&
    Number.isFinite(entry.mood) &&
    typeof entry.note === "string" &&
    ((typeof entry.rating === "number" &&
      Number.isInteger(entry.rating) &&
      entry.rating >= 1 &&
      entry.rating <= 5) ||
      entry.rating === "up" ||
      entry.rating === "down") &&
    (entry.checkedInAt === undefined ||
      typeof entry.checkedInAt === "string")
  );
}

export async function loadTasks(userId: string): Promise<Task[]> {
  const { data, error } = await requireSupabase()
    .from("tasks")
    .select("data")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) {
    isMissingTaskDataSchemaError(error);
    throw error;
  }

  const taskData = ((data ?? []) as TaskRow[]).map((row) => row.data);
  if (taskData.some((task) => !isTask(task))) {
    throw new Error("Supabase returned a task with an invalid data shape.");
  }
  return taskData.filter(isTask);
}

function isTaskGroup(value: unknown): value is TaskGroup {
  if (!value || typeof value !== "object") return false;
  const group = value as Partial<TaskGroup>;
  return (
    typeof group.id === "string" &&
    typeof group.name === "string" &&
    (group.icon === undefined || typeof group.icon === "string")
  );
}

export async function loadTaskGroups(userId: string): Promise<TaskGroup[]> {
  const { data, error } = await requireSupabase()
    .from("task_groups")
    .select("id,name,icon")
    .eq("user_id", userId)
    .order("name");
  if (error) {
    isMissingTaskDataSchemaError(error);
    throw error;
  }

  const groups = (data ?? []) as TaskGroupRow[];
  if (groups.some((group) => !isTaskGroup(group))) {
    throw new Error("Supabase returned a task group in an invalid format.");
  }
  return groups.map((group) => ({ ...group, icon: group.icon ?? "file" }));
}

export async function saveTaskGroup(
  userId: string,
  name: string,
  icon = "file"
): Promise<TaskGroup> {
  const { data, error } = await requireSupabase()
    .from("task_groups")
    .insert({ user_id: userId, name: name.trim(), icon })
    .select("id,name,icon")
    .single();
  if (error) {
    isMissingTaskDataSchemaError(error);
    throw error;
  }
  if (!isTaskGroup(data)) {
    throw new Error("Supabase returned a task group in an invalid format.");
  }
  return data;
}

export async function updateTaskGroup(
  userId: string,
  groupId: string,
  name: string,
  icon: string
): Promise<TaskGroup> {
  const { data, error } = await requireSupabase()
    .from("task_groups")
    .update({ name: name.trim(), icon })
    .eq("user_id", userId)
    .eq("id", groupId)
    .select("id,name,icon")
    .single();
  if (error) {
    isMissingTaskDataSchemaError(error);
    throw error;
  }
  if (!isTaskGroup(data)) {
    throw new Error("Supabase returned a task group in an invalid format.");
  }
  return data;
}

export async function removeTaskGroup(groupId: string): Promise<void> {
  const { error } = await requireSupabase().rpc("remove_task_group", {
    p_group_id: groupId,
  });
  if (error) {
    isMissingTaskDataSchemaError(error);
    throw error;
  }
}

export async function saveTask(userId: string, task: Task): Promise<void> {
  const { error } = await requireSupabase()
    .from("tasks")
    .upsert(
      { user_id: userId, id: task.id, data: task, updated_at: new Date().toISOString() },
      { onConflict: "user_id,id" }
    );
  if (error) {
    isMissingTaskDataSchemaError(error);
    throw error;
  }
}

export async function removeTask(userId: string, taskId: string): Promise<void> {
  const { error } = await requireSupabase()
    .from("tasks")
    .delete()
    .eq("user_id", userId)
    .eq("id", taskId);
  if (error) {
    isMissingTaskDataSchemaError(error);
    throw error;
  }
}

export async function loadCompletions(
  userId: string,
  fromDate?: string
): Promise<TaskCompletion[]> {
  let query = requireSupabase()
    .from("task_completions")
    .select("task_id, completed_on, completed_at")
    .eq("user_id", userId)
    .order("completed_on", { ascending: true });
  if (fromDate) query = query.gte("completed_on", fromDate);

  const { data, error } = await query;
  if (error) {
    isMissingTaskDataSchemaError(error);
    throw error;
  }

  return ((data ?? []) as CompletionRow[]).map((row) => ({
    taskId: row.task_id,
    completedOn: row.completed_on,
    completedAt: row.completed_at,
  }));
}

export async function saveCompletion(
  userId: string,
  completion: TaskCompletion
): Promise<void> {
  const { error } = await requireSupabase()
    .from("task_completions")
    .upsert(
      {
        user_id: userId,
        task_id: completion.taskId,
        completed_on: completion.completedOn,
        completed_at: completion.completedAt,
      },
      { onConflict: "user_id,task_id,completed_on" }
    );
  if (error) {
    isMissingTaskDataSchemaError(error);
    throw error;
  }
}

export async function removeCompletion(
  userId: string,
  taskId: string,
  completedOn: string
): Promise<void> {
  const { error } = await requireSupabase()
    .from("task_completions")
    .delete()
    .eq("user_id", userId)
    .eq("task_id", taskId)
    .eq("completed_on", completedOn);
  if (error) {
    isMissingTaskDataSchemaError(error);
    throw error;
  }
}

export async function loadDayEntries(userId: string): Promise<DayEntry[]> {
  const { data, error } = await requireSupabase()
    .from("day_entries")
    .select("data,created_at,updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) {
    isMissingTaskDataSchemaError(error);
    throw error;
  }

  const entries = ((data ?? []) as DayEntryRow[]).map((row) => {
    if (!isDayEntry(row.data)) return row.data;
    return {
      ...row.data,
      checkedInAt: row.data.checkedInAt || row.updated_at || row.created_at,
    };
  });
  if (entries.some((entry) => !isDayEntry(entry))) {
    throw new Error("Supabase returned a mood entry with an invalid data shape.");
  }
  return entries.filter(isDayEntry);
}

export async function saveDayEntry(
  userId: string,
  entry: DayEntry
): Promise<void> {
  const savedAt = new Date().toISOString();
  const { error } = await requireSupabase()
    .from("day_entries")
    .upsert(
      {
        user_id: userId,
        id: entry.id,
        data: { ...entry, checkedInAt: savedAt },
        updated_at: savedAt,
      },
      { onConflict: "user_id,id" }
    );
  if (error) {
    isMissingTaskDataSchemaError(error);
    throw error;
  }
}

export { isSupabaseConfigured };
