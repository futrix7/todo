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

interface ChallengeRow {
  id: string;
  name: string;
  category: string;
  target_days: number;
  description: string;
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
    challenge.target_days > 0 &&
    typeof challenge.description === "string"
  );
}

export async function loadChallengeCatalog(): Promise<ChallengeDefinition[]> {
  const { data, error } = await getClient()
    .from("challenge_catalog")
    .select("id,name,category,target_days,description")
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
