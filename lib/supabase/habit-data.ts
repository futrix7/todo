import { getSupabase } from "@/lib/supabase/client";
import type {
  Habit,
  HabitColor,
  HabitFrequency,
  HabitLog,
  HabitLogStatus,
  HabitType,
} from "@/lib/habits";

type HabitRow = {
  id: string;
  name: string;
  emoji: string;
  notes: string;
  category: string;
  habit_type: HabitType;
  frequency: HabitFrequency;
  schedule_days: number[];
  started_on: string;
  end_on: string | null;
  start_time: string | null;
  target_value: number;
  unit: string;
  color: HabitColor;
  archived: boolean;
  created_at: string;
};

type HabitLogRow = {
  habit_id: string;
  completed_on: string;
  value: number;
  status: HabitLogStatus;
  logged_at: string;
};

const HABIT_COLUMNS =
  "id,name,emoji,notes,category,habit_type,frequency,schedule_days,started_on,end_on,start_time,target_value,unit,color,archived,created_at";

export function isMissingHabitDataSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const supabaseError = error as { code?: unknown; message?: unknown };
  return (
    supabaseError.code === "PGRST205" ||
    supabaseError.code === "42P01" ||
    supabaseError.code === "PGRST204" ||
    supabaseError.code === "42703" ||
    (typeof supabaseError.message === "string" &&
      /could not find the table|could not find the .* column|relation .* does not exist|column .* does not exist/i.test(
        supabaseError.message
      ))
  );
}

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Add its URL and anon key to .env.local."
    );
  }
  return supabase;
}

function isHabitRow(value: unknown): value is HabitRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<HabitRow>;
  return (
    typeof row.id === "string" &&
    typeof row.name === "string" &&
    typeof row.emoji === "string" &&
    typeof row.notes === "string" &&
    typeof row.category === "string" &&
    (row.habit_type === "yes_no" ||
      row.habit_type === "count" ||
      row.habit_type === "measure" ||
      row.habit_type === "quit") &&
    (row.frequency === "daily" ||
      row.frequency === "weekdays" ||
      row.frequency === "monthly" ||
      row.frequency === "custom") &&
    Array.isArray(row.schedule_days) &&
    row.schedule_days.every(
      (day) => Number.isInteger(day) && day >= 0 && day <= 6
    ) &&
    typeof row.started_on === "string" &&
    (row.end_on === null ||
      (typeof row.end_on === "string" && row.end_on >= row.started_on)) &&
    (row.start_time === null || typeof row.start_time === "string") &&
    typeof row.target_value === "number" &&
    Number.isFinite(row.target_value) &&
    typeof row.unit === "string" &&
    (row.color === "gray" ||
      row.color === "teal" ||
      row.color === "blue" ||
      row.color === "violet" ||
      row.color === "amber" ||
      row.color === "rose") &&
    typeof row.archived === "boolean" &&
    typeof row.created_at === "string"
  );
}

function toHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    notes: row.notes,
    category: row.category,
    type: row.habit_type,
    frequency: row.frequency,
    scheduleDays: row.schedule_days,
    startedOn: row.started_on,
    endedOn: row.end_on,
    startTime: row.start_time,
    targetValue: row.target_value,
    unit: row.unit,
    color: row.color,
    archived: row.archived,
    createdAt: row.created_at,
  };
}

function isHabitLogRow(value: unknown): value is HabitLogRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<HabitLogRow>;
  return (
    typeof row.habit_id === "string" &&
    typeof row.completed_on === "string" &&
    typeof row.value === "number" &&
    Number.isFinite(row.value) &&
    (row.status === "in_progress" ||
      row.status === "completed" ||
      row.status === "skipped") &&
    typeof row.logged_at === "string"
  );
}

export async function loadHabits(userId: string): Promise<Habit[]> {
  const { data, error } = await requireSupabase()
    .from("habits")
    .select(HABIT_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .returns<HabitRow[]>();
  if (error) throw error;
  if (!Array.isArray(data) || !data.every(isHabitRow)) {
    throw new Error("Supabase returned habits in an invalid format.");
  }
  return data.map(toHabit);
}

export async function loadHabitLogs(
  userId: string,
  fromDate?: string
): Promise<HabitLog[]> {
  let query = requireSupabase()
    .from("habit_logs")
    .select("habit_id,completed_on,value,status,logged_at")
    .eq("user_id", userId);
  if (fromDate) query = query.gte("completed_on", fromDate);
  const { data, error } = await query
    .order("completed_on", { ascending: true })
    .returns<HabitLogRow[]>();
  if (error) throw error;
  if (!Array.isArray(data) || !data.every(isHabitLogRow)) {
    throw new Error("Supabase returned habit logs in an invalid format.");
  }
  return data.map((row) => ({
    habitId: row.habit_id,
    completedOn: row.completed_on,
    value: row.value,
    status: row.status,
    loggedAt: row.logged_at,
  }));
}

export async function saveHabit(userId: string, habit: Habit): Promise<void> {
  const { error } = await requireSupabase()
    .from("habits")
    .upsert(
      {
        user_id: userId,
        id: habit.id,
        name: habit.name.trim(),
        emoji: habit.emoji,
        notes: habit.notes.trim(),
        category: habit.category,
        habit_type: habit.type,
        frequency: habit.frequency,
        schedule_days: habit.scheduleDays,
        started_on: habit.startedOn,
        end_on: habit.endedOn,
        start_time: habit.startTime,
        target_value: habit.targetValue,
        unit: habit.unit.trim(),
        color: habit.color,
        archived: habit.archived,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,id" }
    );
  if (error) throw error;
}

export async function setHabitArchived(
  userId: string,
  habitId: string,
  archived: boolean
): Promise<void> {
  const { data, error } = await requireSupabase()
    .from("habits")
    .update({ archived, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", habitId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("This habit could not be updated.");
}

export async function saveHabitLog(
  userId: string,
  habitId: string,
  completedOn: string,
  value: number,
  status: HabitLogStatus
): Promise<void> {
  const { error } = await requireSupabase()
    .from("habit_logs")
    .upsert(
      {
        user_id: userId,
        habit_id: habitId,
        completed_on: completedOn,
        value,
        status,
        logged_at: new Date().toISOString(),
      },
      { onConflict: "user_id,habit_id,completed_on" }
    );
  if (error) throw error;
}

export async function removeHabitLog(
  userId: string,
  habitId: string,
  completedOn: string
): Promise<void> {
  const { error } = await requireSupabase()
    .from("habit_logs")
    .delete()
    .eq("user_id", userId)
    .eq("habit_id", habitId)
    .eq("completed_on", completedOn);
  if (error) throw error;
}
