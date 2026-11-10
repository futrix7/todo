import { getSupabase } from "@/lib/supabase/client";

export interface SocialProfile {
  user_id: string;
  display_name: string;
  username: string;
  bio: string;
  current_streak: number;
  longest_streak: number;
  last_activity_on: string | null;
}

export interface OwnUsername {
  username: string;
  username_locked: boolean;
}

export interface FriendRequest {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

export interface FriendRequestWithProfile extends FriendRequest {
  profile: SocialProfile;
}

export interface SocialNotification {
  id: string;
  actor_id: string | null;
  request_id: string | null;
  kind: "friend_request" | "friend_accepted" | "friend_request_declined";
  created_at: string;
  read_at: string | null;
  actor: SocialProfile | null;
}

export type UserReportReason =
  | "spam"
  | "harassment"
  | "inappropriate_content"
  | "impersonation"
  | "other";

export interface FriendLeaderboardScore {
  user_id: string;
  score: number | null;
  completion_rate: number | null;
  consistency_rate: number | null;
  on_time_rate: number | null;
}

function isFriendLeaderboardScore(value: unknown): value is FriendLeaderboardScore {
  if (!value || typeof value !== "object") return false;
  const score = value as Partial<FriendLeaderboardScore>;
  return (
    typeof score.user_id === "string" &&
    (score.score === null || typeof score.score === "number") &&
    (score.completion_rate === null ||
      typeof score.completion_rate === "number") &&
    (score.consistency_rate === null ||
      typeof score.consistency_rate === "number") &&
    (score.on_time_rate === null || typeof score.on_time_rate === "number")
  );
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

export async function loadOwnUsername(userId: string): Promise<OwnUsername> {
  const { data, error } = await getClient()
    .from("profiles")
    .select("username,username_locked")
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  if (
    !data ||
    typeof data.username !== "string" ||
    typeof data.username_locked !== "boolean"
  ) {
    throw new Error("Your profile username is in an invalid format.");
  }
  return data;
}

export async function claimPermanentUsername(
  username: string
): Promise<string> {
  const { data, error } = await getClient().rpc("claim_my_username", {
    p_username: username,
  });
  if (error) throw error;
  if (typeof data !== "string") {
    throw new Error("The server did not return your username.");
  }
  return data;
}

async function loadProfiles(userIds: string[]) {
  if (!userIds.length) return new Map<string, SocialProfile>();

  const { data, error } = await getClient()
    .from("profiles")
    .select(
      "user_id,display_name,username,bio,current_streak,longest_streak,last_activity_on"
    )
    .in("user_id", userIds)
    .returns<SocialProfile[]>();
  if (error) throw error;

  return new Map(data.map((profile) => [profile.user_id, profile]));
}

export async function searchProfiles(userId: string, search: string) {
  const term = search.trim().replace(/[%_]/g, "").slice(0, 40);
  if (term.length < 2) return [];

  const client = getClient();
  const pattern = `%${term}%`;
  const [byName, byUsername] = await Promise.all([
    client
      .from("profiles")
      .select(
        "user_id,display_name,username,bio,current_streak,longest_streak,last_activity_on"
      )
      .neq("user_id", userId)
      .ilike("display_name", pattern)
      .limit(10)
      .returns<SocialProfile[]>(),
    client
      .from("profiles")
      .select(
        "user_id,display_name,username,bio,current_streak,longest_streak,last_activity_on"
      )
      .neq("user_id", userId)
      .ilike("username", pattern)
      .limit(10)
      .returns<SocialProfile[]>(),
  ]);
  if (byName.error) throw byName.error;
  if (byUsername.error) throw byUsername.error;

  return [...new Map(
    [...byName.data, ...byUsername.data].map((profile) => [
      profile.user_id,
      profile,
    ])
  ).values()].slice(0, 10);
}

export async function loadSuggestedProfiles(userId: string) {
  const { data, error } = await getClient()
    .from("profiles")
    .select(
      "user_id,display_name,username,bio,current_streak,longest_streak,last_activity_on"
    )
    .neq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<SocialProfile[]>();
  if (error) throw error;
  return data;
}

export async function loadFriendOverview(userId: string) {
  const { data: requests, error } = await getClient()
    .from("friend_requests")
    .select("id,requester_id,recipient_id,status,created_at")
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .returns<FriendRequest[]>();
  if (error) throw error;

  const profiles = await loadProfiles(
    [...new Set(
      requests.flatMap((request) => [
        request.requester_id,
        request.recipient_id,
      ])
    )].filter((id) => id !== userId)
  );
  const withProfile = (request: FriendRequest): FriendRequestWithProfile | null => {
    const otherUserId =
      request.requester_id === userId
        ? request.recipient_id
        : request.requester_id;
    const profile = profiles.get(otherUserId);
    return profile ? { ...request, profile } : null;
  };

  return {
    friends: requests
      .filter((request) => request.status === "accepted")
      .map(withProfile)
      .filter((request): request is FriendRequestWithProfile => request !== null),
    incoming: requests
      .filter(
        (request) =>
          request.status === "pending" && request.recipient_id === userId
      )
      .map(withProfile)
      .filter((request): request is FriendRequestWithProfile => request !== null),
    outgoing: requests
      .filter(
        (request) =>
          request.status === "pending" && request.requester_id === userId
      )
      .map(withProfile)
      .filter((request): request is FriendRequestWithProfile => request !== null),
  };
}

export async function loadFriendLeaderboardScores() {
  const { data, error } = await getClient().rpc("get_friend_leaderboard_scores");
  if (error) throw error;
  if (!Array.isArray(data) || !data.every(isFriendLeaderboardScore)) {
    throw new Error("Supabase returned leaderboard scores in an invalid format.");
  }
  return data;
}

export async function sendFriendRequest(requesterId: string, recipientId: string) {
  const { error } = await getClient().from("friend_requests").insert({
    requester_id: requesterId,
    recipient_id: recipientId,
  });
  if (error) throw error;
}

export async function respondToFriendRequest(
  requestId: string,
  recipientId: string,
  status: "accepted" | "declined"
) {
  const { data, error } = await getClient()
    .from("friend_requests")
    .update({ status })
    .eq("id", requestId)
    .eq("recipient_id", recipientId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("This friend request is no longer pending.");
}

export async function loadPendingFriendRequestIds(userId: string) {
  const { data, error } = await getClient()
    .from("friend_requests")
    .select("id")
    .eq("recipient_id", userId)
    .eq("status", "pending")
    .returns<Pick<FriendRequest, "id">[]>();
  if (error) throw error;
  return data.map((request) => request.id);
}

export async function removeFriendRequest(requestId: string) {
  const { error } = await getClient()
    .from("friend_requests")
    .delete()
    .eq("id", requestId);
  if (error) throw error;
}

export async function submitUserReport(
  reporterId: string,
  reportedUserId: string,
  reason: UserReportReason,
  details: string
) {
  const trimmedDetails = details.trim();
  if (reporterId === reportedUserId) {
    throw new Error("You cannot report your own profile.");
  }
  if (trimmedDetails.length > 1000) {
    throw new Error("Report details must be 1000 characters or fewer.");
  }

  const { error } = await getClient().from("user_reports").insert({
    reported_user_id: reportedUserId,
    reason,
    details: trimmedDetails,
  });
  if (error) throw error;
}

export async function loadNotifications(userId: string) {
  const { data, error } = await getClient()
    .from("notifications")
    .select("id,actor_id,request_id,kind,created_at,read_at")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<Omit<SocialNotification, "actor">[]>();
  if (error) throw error;

  const profiles = await loadProfiles(
    [...new Set(
      data.flatMap((notification) =>
        notification.actor_id ? [notification.actor_id] : []
      )
    )]
  );

  return data.map((notification) => ({
    ...notification,
    actor: notification.actor_id
      ? profiles.get(notification.actor_id) ?? null
      : null,
  }));
}

export async function loadUnreadNotificationCount(userId: string) {
  const { count, error } = await getClient()
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export function publishUnreadNotificationCount(count: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("taskflow:unread-notifications-changed", {
      detail: count,
    })
  );
}

export async function markNotificationRead(notificationId: string, userId: string) {
  const { error } = await getClient()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_id", userId);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await getClient()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .is("read_at", null);
  if (error) throw error;
}

export async function deleteNotification(notificationId: string, userId: string) {
  const { error } = await getClient()
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("recipient_id", userId);
  if (error) throw error;
}
