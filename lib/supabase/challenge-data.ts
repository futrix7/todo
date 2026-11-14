import { getSupabase } from "@/lib/supabase/client";
import {
  CHALLENGE_CATEGORIES,
  type ChallengeCategory,
  type ChallengeDefinition,
} from "@/lib/challenges";

export interface ChallengeParticipation {
  challenge_id: string;
  joined_on: string;
}

export interface ChallengeStats {
  challenge_id: string;
  participant_count: number;
}

export interface ChallengeSnapshot {
  participations: ChallengeParticipation[];
  stats: ChallengeStats[];
}

export interface VisibleChallengeParticipant {
  displayName: string;
  username: string;
}

export interface ChallengeLeaderboardParticipant {
  userId: string;
  displayName: string;
  username: string;
  completedDays: number;
  targetDays: number;
  joinedOn: string;
}

interface VisibleChallengeParticipantRow {
  display_name: string;
  username: string;
}

interface ChallengeLeaderboardRow {
  user_id: string;
  display_name: string;
  username: string;
  completed_days: number;
  target_days: number;
  joined_on: string;
}

interface ChallengeRow {
  id: string;
  name: string;
  category: string;
  target_days: number;
  description: string;
  creator_id: string | null;
}

function getClient() {
  const client = getSupabase();
  if (!client) {
    throw new Error(
      "Supabase is not configured. Add its URL and anon key to .env.local."
    );
  }
  return client;
}

function isChallengeStats(value: unknown): value is ChallengeStats {
  if (!value || typeof value !== "object") return false;
  const stats = value as Partial<ChallengeStats>;
  return (
    typeof stats.challenge_id === "string" &&
    typeof stats.participant_count === "number" &&
    Number.isSafeInteger(stats.participant_count)
  );
}

function isChallengeCategory(value: string): value is ChallengeCategory {
  return CHALLENGE_CATEGORIES.includes(value as ChallengeCategory);
}

function isVisibleChallengeParticipantRow(
  value: unknown
): value is VisibleChallengeParticipantRow {
  if (!value || typeof value !== "object") return false;
  const participant = value as Partial<VisibleChallengeParticipantRow>;
  return (
    typeof participant.display_name === "string" &&
    typeof participant.username === "string"
  );
}

function isChallengeLeaderboardRow(
  value: unknown
): value is ChallengeLeaderboardRow {
  if (!value || typeof value !== "object") return false;
  const participant = value as Partial<ChallengeLeaderboardRow>;
  return (
    typeof participant.user_id === "string" &&
    typeof participant.display_name === "string" &&
    typeof participant.username === "string" &&
    typeof participant.completed_days === "number" &&
    Number.isSafeInteger(participant.completed_days) &&
    participant.completed_days >= 0 &&
    typeof participant.target_days === "number" &&
    Number.isSafeInteger(participant.target_days) &&
    participant.target_days >= 1 &&
    typeof participant.joined_on === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(participant.joined_on)
  );
}

function isChallengeRow(value: unknown): value is ChallengeRow {
  if (!value || typeof value !== "object") return false;
  const challenge = value as Partial<ChallengeRow>;
  return (
    typeof challenge.id === "string" &&
    typeof challenge.name === "string" &&
    typeof challenge.category === "string" &&
    isChallengeCategory(challenge.category) &&
    typeof challenge.target_days === "number" &&
    Number.isSafeInteger(challenge.target_days) &&
    challenge.target_days >= 1 &&
    challenge.target_days <= 365 &&
    typeof challenge.description === "string" &&
    (typeof challenge.creator_id === "string" ||
      challenge.creator_id === null)
  );
}

export async function createCommunityChallenge(
  input: Omit<ChallengeDefinition, "createdBy">
): Promise<ChallengeDefinition> {
  const name = input.name.trim();
  const description = input.description.trim();
  if (!/^[a-z0-9-]{1,80}$/.test(input.id)) {
    throw new Error("Challenge IDs must use lowercase letters, numbers, and hyphens.");
  }
  if (!isChallengeCategory(input.category)) {
    throw new Error("Choose a valid challenge category.");
  }
  if (name.length < 1 || name.length > 100) {
    throw new Error("Challenge names must be 1-100 characters.");
  }
  if (description.length < 1 || description.length > 1000) {
    throw new Error("Challenge descriptions must be 1-1000 characters.");
  }
  if (
    !Number.isSafeInteger(input.targetDays) ||
    input.targetDays < 1 ||
    input.targetDays > 365
  ) {
    throw new Error("Challenge duration must be between 1 and 365 days.");
  }

  const client = getClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("You must be signed in to create a challenge.");

  const { data, error } = await client
    .from("challenge_catalog")
    .insert({
      id: input.id,
      name,
      category: input.category,
      target_days: input.targetDays,
      description,
      creator_id: authData.user.id,
    })
    .select("id,name,category,target_days,description,creator_id")
    .single();
  if (error) throw error;
  if (!isChallengeRow(data)) {
    throw new Error("Supabase returned the created challenge in an invalid format.");
  }

  return {
    id: data.id,
    name: data.name,
    category: data.category as ChallengeCategory,
    targetDays: data.target_days,
    description: data.description,
    createdBy: data.creator_id,
  };
}

export async function loadChallengeCatalog(): Promise<ChallengeDefinition[]> {
  const { data, error } = await getClient()
    .from("challenge_catalog")
    .select("id,name,category,target_days,description,creator_id")
    .eq("is_active", true)
    .order("category")
    .order("name")
    .returns<ChallengeRow[]>();

  if (error) throw error;
  if (!data.every(isChallengeRow)) {
    throw new Error("Supabase returned challenges in an invalid format.");
  }

  return data.map((challenge) => ({
    id: challenge.id,
    name: challenge.name,
    category: challenge.category as ChallengeCategory,
    targetDays: challenge.target_days,
    description: challenge.description,
    createdBy: challenge.creator_id,
  }));
}

export async function loadChallengeSnapshot(
  userId: string,
  challengeIds: string[]
): Promise<ChallengeSnapshot> {
  if (!challengeIds.length) {
    return { participations: [], stats: [] };
  }

  const client = getClient();
  const [participationsResult, statsResult] = await Promise.all([
    client
      .from("challenge_participants")
      .select("challenge_id,joined_on")
      .eq("user_id", userId)
      .in("challenge_id", challengeIds)
      .returns<ChallengeParticipation[]>(),
    client.rpc("get_challenge_stats", { p_challenge_ids: challengeIds }),
  ]);

  if (participationsResult.error) throw participationsResult.error;
  if (statsResult.error) throw statsResult.error;
  if (
    !Array.isArray(statsResult.data) ||
    !statsResult.data.every(isChallengeStats)
  ) {
    throw new Error("Supabase returned challenge stats in an invalid format.");
  }

  return {
    participations: participationsResult.data,
    stats: statsResult.data,
  };
}

export async function loadVisibleChallengeParticipants(
  challengeId: string
): Promise<VisibleChallengeParticipant[]> {
  const { data, error } = await getClient().rpc(
    "get_visible_challenge_participants",
    { p_challenge_id: challengeId }
  );
  if (error) throw error;
  if (
    !Array.isArray(data) ||
    data.length > 100 ||
    !data.every(isVisibleChallengeParticipantRow)
  ) {
    throw new Error(
      "Supabase returned challenge participants in an invalid format."
    );
  }
  return data.map((participant: VisibleChallengeParticipantRow) => ({
    displayName: participant.display_name,
    username: participant.username,
  }));
}

export async function loadChallengeLeaderboard(
  challengeId: string
): Promise<ChallengeLeaderboardParticipant[]> {
  const { data, error } = await getClient().rpc("get_challenge_leaderboard", {
    p_challenge_id: challengeId,
  });
  if (error) throw error;
  if (
    !Array.isArray(data) ||
    data.length > 100 ||
    !data.every(isChallengeLeaderboardRow)
  ) {
    throw new Error(
      "Supabase returned challenge leaderboard data in an invalid format."
    );
  }
  return data.map((participant) => ({
    userId: participant.user_id,
    displayName: participant.display_name,
    username: participant.username,
    completedDays: participant.completed_days,
    targetDays: participant.target_days,
    joinedOn: participant.joined_on,
  }));
}

export async function joinChallenge(
  challengeId: string,
  joinedOn: string
): Promise<void> {
  const { error } = await getClient().rpc("join_challenge_and_create_task", {
    p_challenge_id: challengeId,
    p_joined_on: joinedOn,
  });
  if (error) throw error;
}
