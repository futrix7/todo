"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Globe2,
  RefreshCw,
  ShieldCheck,
  Target,
  Trophy,
  UsersRound,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import {
  loadGlobalLeaderboardScores,
  loadFriendLeaderboardScores,
  loadFriendOverview,
  type FriendLeaderboardScore,
  type GlobalLeaderboardScore,
  type FriendRequestWithProfile,
} from "@/lib/supabase/social-data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Participant {
  id: string;
  name: string;
  isYou: boolean;
  score: FriendLeaderboardScore;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatRate(rate: number | null) {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`;
}

const MOBILE_RANK_STYLES = [
  "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-300",
  "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-400/30 dark:bg-slate-400/15 dark:text-slate-300",
  "border-orange-300 bg-orange-100 text-orange-900 dark:border-orange-400/30 dark:bg-orange-400/15 dark:text-orange-300",
];

interface PodiumEntry {
  id: string;
  name: string;
  score: string;
  detail: string;
}

function LeaderboardPodium({ entries }: { entries: PodiumEntry[] }) {
  if (!entries.length) return null;

  const places = [
    { entry: entries[0], rank: 1, order: "order-2", height: "h-40 sm:h-48" },
    { entry: entries[1], rank: 2, order: "order-1", height: "h-28 sm:h-36" },
    { entry: entries[2], rank: 3, order: "order-3", height: "h-24 sm:h-28" },
  ];
  const medalStyles = {
    1: "border-amber-400 bg-amber-300 text-amber-950",
    2: "border-slate-400 bg-slate-200 text-slate-700 dark:bg-slate-300",
    3: "border-orange-700 bg-orange-300 text-orange-950",
  } as const;
  const barStyles = {
    1: "border-primary/30 bg-primary/15 text-primary",
    2: "border-border bg-muted text-muted-foreground",
    3: "border-orange-700/20 bg-orange-500/10 text-orange-800 dark:text-orange-300",
  } as const;

  return (
    <section
      aria-label="Leaderboard podium"
      className="mb-5 overflow-hidden rounded-3xl border bg-muted/20 p-4 sm:p-6"
    >
      <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
        {places.map(({ entry, rank, order, height }) =>
          entry ? (
            <div
              key={entry.id}
              className={`flex min-w-0 flex-col items-center ${order}`}
              aria-label={`${rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd"} place: ${entry.name}`}
            >
              <span
                className={`mb-2 grid size-11 place-items-center rounded-full border-4 font-heading text-lg font-bold shadow-sm sm:size-14 sm:text-xl ${medalStyles[rank as keyof typeof medalStyles]}`}
              >
                {rank}
              </span>
              <p className="max-w-full truncate text-center text-xs font-semibold sm:text-sm">
                {entry.name}
              </p>
              <p className="mb-2 text-[11px] font-medium tabular-nums text-muted-foreground sm:text-xs">
                {entry.score} {entry.detail}
              </p>
              <div
                className={`flex w-full items-end justify-center rounded-t-xl border-t px-2 pb-2 pt-3 ${height} ${barStyles[rank as keyof typeof barStyles]}`}
                aria-hidden="true"
              >
                <span className="text-xs font-semibold uppercase tracking-widest">
                  {rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd"}
                </span>
              </div>
            </div>
          ) : (
            <div key={`empty-${rank}`} className={order} aria-hidden="true" />
          )
        )}
      </div>
    </section>
  );
}

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  if (
    message.includes("get_friend_leaderboard_scores") ||
    message.includes("get_global_leaderboard_scores") ||
    (error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "PGRST202")
  ) {
    return "Leaderboard scoring is not set up yet. Run supabase/schema.sql in your Supabase project.";
  }
  if (
    message.includes("friend_requests") ||
    message.includes("profiles")
  ) {
    return "Friends storage is not ready yet. Apply supabase/schema.sql in your Supabase project.";
  }
  return message;
}

function Metric({
  label,
  description,
  rate,
  weight,
  icon: Icon,
}: {
  label: string;
  description: string;
  rate: number | null;
  weight: string;
  icon: typeof Target;
}) {
  const percentage = rate === null ? 0 : Math.min(100, Math.max(0, rate * 100));
  return (
    <div className="border-t py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center border bg-muted/50 text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{label}</p>
            <Badge variant="outline">{weight}</Badge>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div
              className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label={label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(percentage)}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="w-10 text-right text-sm font-semibold tabular-nums">
              {formatRate(rate)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardClientPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const [scope, setScope] = React.useState<"friends" | "global">("friends");
  const [friends, setFriends] = React.useState<FriendRequestWithProfile[]>([]);
  const [scores, setScores] = React.useState<FriendLeaderboardScore[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [globalScores, setGlobalScores] = React.useState<
    GlobalLeaderboardScore[]
  >([]);
  const [globalLoading, setGlobalLoading] = React.useState(false);
  const [globalError, setGlobalError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!userId) return;
    try {
      const [overview, leaderboardScores] = await Promise.all([
        loadFriendOverview(userId),
        loadFriendLeaderboardScores(),
      ]);
      setFriends(overview.friends);
      setScores(leaderboardScores);
      setError(null);
    } catch (loadFailure) {
      setError(errorMessage(loadFailure));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const refreshGlobal = React.useCallback(async () => {
    if (!userId) return;
    setGlobalLoading(true);
    try {
      setGlobalScores(await loadGlobalLeaderboardScores());
      setGlobalError(null);
    } catch (loadFailure) {
      setGlobalError(errorMessage(loadFailure));
    } finally {
      setGlobalLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void refresh();
    });
    return () => {
      active = false;
    };
  }, [refresh]);

  React.useEffect(() => {
    if (scope !== "global" || !userId) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void refreshGlobal();
    });
    return () => {
      active = false;
    };
  }, [refreshGlobal, scope, userId]);

  const scoreByUserId = new Map(scores.map((score) => [score.user_id, score]));
  const ownScore = userId ? scoreByUserId.get(userId) : undefined;
  const participants: Participant[] = [
    ...(userId && ownScore
      ? [
          {
            id: userId,
            name: user?.name ?? "You",
            isYou: true,
            score: ownScore,
          },
        ]
      : []),
    ...friends.flatMap((friend) => {
      const score = scoreByUserId.get(friend.profile.user_id);
      return score
        ? [
            {
              id: friend.profile.user_id,
              name: friend.profile.display_name,
              isYou: false,
              score,
            },
          ]
        : [];
    }),
  ].sort((a, b) => {
    if (a.score.score === null) {
      return b.score.score === null ? a.name.localeCompare(b.name) : 1;
    }
    if (b.score.score === null) return -1;
    return b.score.score - a.score.score || a.name.localeCompare(b.name);
  });
  const rankedParticipants = participants.map((participant, index) => ({
    ...participant,
    rank:
      participant.score.score === null
        ? null
        : participants
            .slice(0, index)
            .filter(
              (entry) =>
                entry.score.score !== null &&
                entry.score.score !== participant.score.score
            ).length + 1,
  }));
  const myRank =
    rankedParticipants.find((participant) => participant.isYou)?.rank ?? null;
  const globalParticipants = globalScores.map((score) => ({
    id: score.user_id,
    name: score.display_name || score.username,
    isYou: score.user_id === userId,
    score,
    rank: score.global_rank,
  }));
  const ownGlobalScore = globalScores.find(
    (score) => score.user_id === userId
  );
  const totalGlobalMembers =
    globalScores[0]?.total_scored_members ?? 0;
  const activeRankedParticipants =
    scope === "global" ? globalParticipants : rankedParticipants;
  const activeLoading = scope === "global" ? globalLoading : loading;
  const activeError = scope === "global" ? globalError : error;
  const displayedOwnScore =
    scope === "global" ? ownGlobalScore : ownScore;
  const myActiveRank =
    scope === "global" ? ownGlobalScore?.global_rank ?? null : myRank;
  const totalActiveParticipants =
    scope === "global" ? totalGlobalMembers : participants.length;
  const ownScorePercentage =
    displayedOwnScore?.score == null
      ? 0
      : Math.min(100, Math.max(0, displayedOwnScore.score));
  const podiumEntries: PodiumEntry[] = activeRankedParticipants
    .filter((participant) => participant.score.score !== null)
    .slice(0, 3)
    .map((participant) => ({
      id: participant.id,
      name: participant.name,
      score: participant.score.score?.toFixed(1) ?? "—",
      detail: "/ 100",
    }));

  return (
    <div className="-mx-3 -my-4 flex min-h-dvh w-[calc(100%+1.5rem)] min-w-0 flex-col sm:-mx-4 sm:-my-6 sm:w-[calc(100%+2rem)] md:-mx-6 md:-my-8 md:w-[calc(100%+3rem)] lg:-mx-8 lg:-my-6 lg:w-[calc(100%+4rem)]">
      {/* Mobile header */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-3 px-4 pb-3 pt-4">
          <Link
            href="/friends"
            aria-label="Back to friends"
            className="grid size-11 shrink-0 place-items-center rounded-2xl border border-border/70 bg-card text-muted-foreground transition-colors active:bg-muted"
          >
            <ArrowLeft className="size-[18px]" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <Trophy className="size-4" aria-hidden="true" />
              Rankings
            </p>
            <h1 className="mt-0.5 font-heading text-[26px] font-semibold leading-tight tracking-tight">
              Leaderboard
            </h1>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {activeLoading
                ? "Loading rankings…"
                : totalActiveParticipants
                  ? `${totalActiveParticipants.toLocaleString()} ${
                      totalActiveParticipants === 1 ? "person" : "people"
                    } ranked`
                  : "No one ranked yet"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Refresh leaderboard"
            title="Refresh leaderboard"
            disabled={activeLoading}
            onClick={() => {
              if (scope === "friends") {
                setLoading(true);
                void refresh();
              } else {
                void refreshGlobal();
              }
            }}
            className="grid size-11 shrink-0 place-items-center rounded-2xl border border-border/70 bg-card text-muted-foreground transition-colors active:bg-muted disabled:opacity-50"
          >
            <RefreshCw
              className={
                activeLoading ? "size-[18px] animate-spin" : "size-[18px]"
              }
            />
          </button>
        </div>
        <div className="px-4 pb-3">
          <div
            role="tablist"
            aria-label="Leaderboard scope"
            className="grid grid-cols-2 gap-1 rounded-2xl border border-border/70 bg-muted/40 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={scope === "friends"}
              onClick={() => setScope("friends")}
              className={`flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors ${
                scope === "friends"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              <UsersRound className="size-4" />
              Friends
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={scope === "global"}
              onClick={() => {
                if (scope === "global") {
                  void refreshGlobal();
                } else {
                  setScope("global");
                  setGlobalLoading(true);
                }
              }}
              className={`flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors ${
                scope === "global"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              <Globe2 className="size-4" />
              Global
            </button>
          </div>
        </div>
      </header>

      {/* Mobile content */}
      <main className="flex flex-col gap-5 px-4 pb-6 pt-4 md:hidden">
        <section
          aria-label="Your leaderboard summary"
          className="relative overflow-hidden rounded-3xl bg-primary p-4 text-primary-foreground shadow-sm"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-16 size-40 rounded-full bg-primary-foreground/10 blur-2xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-12 size-40 rounded-full bg-primary-foreground/10 blur-2xl"
          />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-primary-foreground/75">
                {scope === "global" ? "Your global score" : "Your score"} · 30d
              </p>
              <p className="mt-1 font-heading text-4xl font-semibold leading-none tabular-nums">
                {displayedOwnScore?.score == null
                  ? "—"
                  : displayedOwnScore.score.toFixed(1)}
                <span className="ml-1 text-sm font-normal text-primary-foreground/70">
                  / 100
                </span>
              </p>
            </div>
            <div className="shrink-0 rounded-2xl bg-primary-foreground/15 px-3 py-2 text-center">
              <p className="text-[10px] uppercase tracking-widest text-primary-foreground/70">
                Rank
              </p>
              <p className="font-heading text-xl font-bold leading-tight tabular-nums">
                {myActiveRank ? `#${myActiveRank}` : "—"}
              </p>
              <p className="text-[10px] text-primary-foreground/70">
                {totalActiveParticipants
                  ? `of ${totalActiveParticipants.toLocaleString()}`
                  : ""}
              </p>
            </div>
          </div>
          <div
            className="relative mt-4 h-2 overflow-hidden rounded-full bg-primary-foreground/20"
            role="progressbar"
            aria-label="Your leaderboard score"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(ownScorePercentage)}
          >
            <div
              className="h-full rounded-full bg-primary-foreground transition-[width]"
              style={{ width: `${ownScorePercentage}%` }}
            />
          </div>
          <p className="relative mt-2 text-[11px] leading-relaxed text-primary-foreground/75">
            {displayedOwnScore?.score == null
              ? "Complete tasks to establish your score."
              : scope === "global"
                ? "All signed-in members with recent task activity."
                : "You versus the friends in your circle."}
          </p>
        </section>

        {podiumEntries.length > 0 && (
          <section aria-label="Top of the leaderboard">
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <h2 className="font-heading text-base font-semibold">
                  Top of the board
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {scope === "global"
                    ? "Across the Taskito community"
                    : "The leaders in your circle"}
                </p>
              </div>
              <Badge variant="outline">30 days</Badge>
            </div>
            <div className="rounded-3xl border border-border/70 bg-card p-5">
              <div className="grid grid-cols-3 items-end gap-3">
                {[
                  {
                    entry: podiumEntries[1],
                    place: 2,
                    bar: "h-20",
                    avatar: "size-14",
                    ring: "ring-slate-300 dark:ring-slate-500/60",
                  },
                  {
                    entry: podiumEntries[0],
                    place: 1,
                    bar: "h-32",
                    avatar: "size-16",
                    ring: "ring-amber-400",
                  },
                  {
                    entry: podiumEntries[2],
                    place: 3,
                    bar: "h-16",
                    avatar: "size-14",
                    ring: "ring-orange-400",
                  },
                ].map(({ entry, place, bar, avatar, ring }) =>
                  entry ? (
                    <div
                      key={entry.id}
                      className="flex min-w-0 flex-col items-center"
                      aria-label={`${place === 1 ? "1st" : place === 2 ? "2nd" : "3rd"} place: ${entry.name}`}
                    >
                      <Avatar
                        className={`${avatar} shrink-0 bg-primary/10 font-semibold text-primary ring-2 ring-offset-2 ring-offset-card ${ring}`}
                      >
                        <AvatarFallback>
                          {initials(entry.name) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <p className="mt-2 w-full truncate text-center text-[13px] font-semibold">
                        {entry.name}
                      </p>
                      <p className="text-xs font-semibold tabular-nums text-primary">
                        {entry.score}
                      </p>
                      <div
                        className={`mt-2 flex w-full items-end justify-center rounded-t-xl border-x border-t px-2 pt-2 ${bar} ${
                          place === 1
                            ? "border-primary/25 bg-primary/10"
                            : "border-border bg-muted/50"
                        }`}
                        aria-hidden="true"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {place === 1 ? "1st" : place === 2 ? "2nd" : "3rd"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div key={`empty-${place}`} aria-hidden="true" />
                  )
                )}
              </div>
            </div>
          </section>
        )}

        <section aria-labelledby="mobile-rankings-heading">
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <h2
                id="mobile-rankings-heading"
                className="font-heading text-base font-semibold"
              >
                {scope === "global" ? "Global ranking" : "Friends ranking"}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {scope === "global"
                  ? "Top 100 members and your position"
                  : "Every friend with a score, highest first"}
              </p>
            </div>
            <Badge variant="outline">
              {scope === "global" ? "Global" : "Friends"}
            </Badge>
          </div>

          {activeLoading ? (
            <ul
              className="space-y-2"
              role="status"
              aria-label="Loading leaderboard"
            >
              {Array.from({ length: 5 }, (_, index) => (
                <li
                  key={index}
                  className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3"
                  aria-hidden="true"
                >
                  <Skeleton className="size-8 shrink-0 rounded-xl" />
                  <Skeleton className="size-10 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-28 max-w-full" />
                    <Skeleton className="h-3 w-36 max-w-full" />
                  </div>
                  <Skeleton className="h-7 w-10 shrink-0 rounded-md" />
                </li>
              ))}
              <span className="sr-only">Loading leaderboard</span>
            </ul>
          ) : activeError ? (
            <div
              role="alert"
              className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4"
            >
              <p className="text-sm text-destructive">{activeError}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 h-10 w-full rounded-xl"
                onClick={() => {
                  if (scope === "global") {
                    void refreshGlobal();
                  } else {
                    setLoading(true);
                    void refresh();
                  }
                }}
              >
                Try again
              </Button>
            </div>
          ) : activeRankedParticipants.length ? (
            <ul className="space-y-2">
              {activeRankedParticipants.map((participant) => {
                const rank = participant.rank;
                const topStyle =
                  rank && rank <= 3
                    ? MOBILE_RANK_STYLES[rank - 1]
                    : "border-border/70 bg-muted/40 text-muted-foreground";
                const score = participant.score.score;

                return (
                  <li
                    key={participant.id}
                    className={`rounded-2xl border p-3 ${
                      participant.isYou
                        ? "border-primary/40 bg-primary/[0.04]"
                        : "border-border/70 bg-card"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-xl border text-xs font-bold tabular-nums ${topStyle}`}
                        aria-label={
                          rank ? `Rank ${rank}` : "Unranked"
                        }
                      >
                        {rank ?? "—"}
                      </span>
                      <Avatar className="size-10 shrink-0 bg-primary/10 text-primary">
                        <AvatarFallback>
                          {initials(participant.name) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
                          <span className="truncate">{participant.name}</span>
                          {participant.isYou && (
                            <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              You
                            </span>
                          )}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span>
                            Completion{" "}
                            {formatRate(participant.score.completion_rate)}
                          </span>
                          <span
                            className="size-0.5 rounded-full bg-border"
                            aria-hidden="true"
                          />
                          <span>
                            Consistency{" "}
                            {formatRate(participant.score.consistency_rate)}
                          </span>
                          <span
                            className="size-0.5 rounded-full bg-border"
                            aria-hidden="true"
                          />
                          <span>
                            On-time {formatRate(participant.score.on_time_rate)}
                          </span>
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-heading text-xl font-bold leading-none tabular-nums">
                          {score === null ? "—" : score.toFixed(1)}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          / 100
                        </p>
                      </div>
                    </div>
                    <div
                      className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-label={`${participant.name} leaderboard score`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(score ?? 0)}
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.min(100, Math.max(0, score ?? 0))}%`,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-5 text-center">
              <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
                <ShieldCheck className="size-5" />
              </span>
              <p className="mt-3 text-sm font-medium">
                {scope === "global"
                  ? "No global scores yet"
                  : "Your leaderboard is ready"}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {scope === "global"
                  ? "Complete tasks to establish your score. Tasks and notes are never shared."
                  : "Add friends to compare scores. Only aggregate rates are shared; tasks and notes stay private."}
              </p>
              {scope === "friends" && (
                <Button
                  nativeButton={false}
                  render={<Link href="/friends" />}
                  className="mt-4 h-10 w-full rounded-xl"
                >
                  Go to friends
                </Button>
              )}
            </div>
          )}
        </section>

        <details className="group rounded-2xl border border-border/70 bg-card">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">
                  How your score works
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  Completion, consistency, and on-time
                </span>
              </span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t px-4 pb-4">
            <p className="mt-3 break-words rounded-xl bg-muted/40 p-3 font-mono text-[10px] leading-relaxed">
              Score = 100 × (0.5 × completion + 0.3 × consistency + 0.2 ×
              on-time)
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              All rates are proportions from 0 to 1, measured over a rolling
              30-day window.
            </p>
            <div className="mt-2">
              <Metric
                label="Completion rate"
                description="Completed task occurrences divided by task occurrences due."
                rate={displayedOwnScore?.completion_rate ?? null}
                weight="50%"
                icon={CheckCircle2}
              />
              <Metric
                label="Consistency rate"
                description="Days with a completed task divided by days with tasks due."
                rate={displayedOwnScore?.consistency_rate ?? null}
                weight="30%"
                icon={Target}
              />
              <Metric
                label="On-time rate"
                description="Tasks completed on or before their due date."
                rate={displayedOwnScore?.on_time_rate ?? null}
                weight="20%"
                icon={Clock3}
              />
            </div>
            <div className="flex gap-2 border-t pt-3 text-[11px] leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              <p>
                {scope === "global"
                  ? "All signed-in members can see your aggregate rates and score. Your tasks and notes stay private."
                  : "Your tasks and notes stay private. Friends see only your aggregate rates and score."}
              </p>
            </div>
          </div>
        </details>
      </main>

      {/* Desktop header */}
      <header className="hidden min-h-20 flex-wrap items-center justify-between gap-3 border-b px-3 pb-3 pt-5 sm:px-4 md:flex md:px-6 lg:px-8">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            nativeButton={false}
            render={<Link href="/friends" />}
            aria-label="Back to friends"
            className="size-9 shrink-0"
          >
            <ArrowLeft />
          </Button>
          <div className="min-w-0 py-0.5">
            <h1 className="font-heading text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
              Leaderboard
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              Compare friends or the Taskito community.
            </p>
          </div>
        </div>
        <div className="ml-auto flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/friends" />}
          >
            Friends
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Refresh leaderboard"
            title="Refresh leaderboard"
            disabled={scope === "friends" ? loading : globalLoading}
            onClick={() => {
              if (scope === "friends") {
                setLoading(true);
                void refresh();
              } else {
                void refreshGlobal();
              }
            }}
          >
            <RefreshCw />
          </Button>
        </div>
      </header>

      <section
        aria-label="Leaderboard types"
        className="hidden grid-cols-1 border-b sm:grid-cols-2 md:grid"
      >
        <button
          type="button"
          aria-pressed={scope === "friends"}
          onClick={() => setScope("friends")}
          className={`flex min-h-20 items-center gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-muted/40 sm:border-b-0 sm:border-r sm:px-4 md:px-6 lg:px-8 ${
            scope === "friends" ? "bg-primary/[0.04]" : ""
          }`}
        >
          <UsersRound className="size-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Friends</p>
            <p className="text-xs text-muted-foreground">Your whole circle</p>
          </div>
          {scope === "friends" && (
            <Badge className="ml-auto">Selected</Badge>
          )}
        </button>
        <button
          type="button"
          aria-pressed={scope === "global"}
          onClick={() => {
            if (scope === "global") {
              void refreshGlobal();
            } else {
              setScope("global");
              setGlobalLoading(true);
            }
          }}
          className={`flex min-h-20 items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/40 sm:px-4 md:px-6 lg:px-8 ${
            scope === "global" ? "bg-primary/[0.04]" : ""
          }`}
        >
          <Globe2 className="size-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Global</p>
            <p className="text-xs text-muted-foreground">
              All signed-in members
            </p>
          </div>
          {scope === "global" && (
            <Badge className="ml-auto">Selected</Badge>
          )}
        </button>
      </section>

      <section
        aria-label="Your leaderboard summary"
        className="hidden border-b sm:grid-cols-3 md:grid"
      >
        {scope === "friends" ? (
          <>
            <div className="border-b px-3 py-3 sm:border-b-0 sm:border-r sm:px-4 md:px-6 lg:px-8">
              <p className="text-xs text-muted-foreground">
                Your score · last 30 days
              </p>
              <p className="mt-1 font-heading text-3xl font-semibold tabular-nums">
                {loading || ownScore?.score == null
                  ? "—"
                  : ownScore.score.toFixed(1)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  / 100
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {ownScore?.score == null
                  ? "Complete tasks to establish your score."
                  : "Calculated from your recent task activity."}
              </p>
            </div>
            <div className="border-b px-3 py-3 sm:border-b-0 sm:border-r sm:px-4 md:px-6 lg:px-8">
              <p className="text-xs text-muted-foreground">Your friends rank</p>
              <p className="mt-1 font-heading text-3xl font-semibold tabular-nums">
                {loading || myRank === null ? "—" : `#${myRank}`}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  {participants.length ? `of ${participants.length}` : ""}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Based on score, highest first.
              </p>
            </div>
            <div className="px-3 py-3 sm:px-4 md:px-6 lg:px-8">
              <p className="text-xs text-muted-foreground">Total friends</p>
              <p className="mt-1 font-heading text-3xl font-semibold tabular-nums">
                {loading ? "—" : friends.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Accepted friends in your circle.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="border-b px-3 py-3 sm:border-b-0 sm:border-r sm:px-4 md:px-6 lg:px-8">
              <p className="text-xs text-muted-foreground">
                Your global score · last 30 days
              </p>
              <p className="mt-1 font-heading text-3xl font-semibold tabular-nums">
                {globalLoading || ownGlobalScore?.score == null
                  ? "—"
                  : ownGlobalScore.score.toFixed(1)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  / 100
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {ownGlobalScore?.score == null
                  ? "Complete tasks to establish your score."
                  : "Calculated from your recent task activity."}
              </p>
            </div>
            <div className="border-b px-3 py-3 sm:border-b-0 sm:border-r sm:px-4 md:px-6 lg:px-8">
              <p className="text-xs text-muted-foreground">Your global rank</p>
              <p className="mt-1 font-heading text-3xl font-semibold tabular-nums">
                {globalLoading || !ownGlobalScore
                  ? "—"
                  : `#${ownGlobalScore.global_rank}`}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  {totalGlobalMembers
                    ? `of ${totalGlobalMembers.toLocaleString()}`
                    : ""}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Based on score, highest first.
              </p>
            </div>
            <div className="px-3 py-3 sm:px-4 md:px-6 lg:px-8">
              <p className="text-xs text-muted-foreground">Members with a score</p>
              <p className="mt-1 font-heading text-3xl font-semibold tabular-nums">
                {globalLoading ? "—" : totalGlobalMembers.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Signed-in members with recent task activity.
              </p>
            </div>
          </>
        )}
      </section>

      <div className="hidden min-w-0 flex-1 grid-rows-[auto_1fr] border-t md:grid xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)] xl:grid-rows-1">
        <section className="flex min-w-0 flex-col border-b xl:border-b-0 xl:border-r">
          <div className="flex flex-col gap-2 border-b px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 md:px-6 lg:px-8">
            <div>
              <h2 className="font-heading text-base font-semibold">
                {scope === "global" ? "Global leaderboard" : "Friends leaderboard"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {scope === "global"
                  ? `${totalGlobalMembers.toLocaleString()} members with scores · showing the top 100 and your rank`
                  : `${friends.length} ${friends.length === 1 ? "friend" : "friends"} · ranked by score`}
              </p>
            </div>
            <Badge variant="outline" className="w-fit">Last 30 days</Badge>
          </div>
          <div className="flex-1 px-3 py-2 sm:px-4 md:px-6 lg:px-8">
            {activeLoading ? (
              <div className="flex flex-col" role="status" aria-label="Loading leaderboard">
                {Array.from({ length: 5 }, (_, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 border-b py-3 last:border-0"
                    aria-hidden="true"
                  >
                    <Skeleton className="size-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32 max-w-full" />
                      <Skeleton className="h-3 w-24 max-w-full" />
                    </div>
                    <Skeleton className="h-6 w-12 rounded-md" />
                  </div>
                ))}
                <span className="sr-only">Loading leaderboard</span>
              </div>
            ) : activeError ? (
              <div className="flex flex-col items-start gap-3 border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p role="alert" className="text-sm text-destructive">
                  {activeError}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (scope === "global") {
                      void refreshGlobal();
                    } else {
                      setLoading(true);
                      void refresh();
                    }
                  }}
                >
                  Try again
                </Button>
              </div>
            ) : activeRankedParticipants.length ? (
              <>
                <LeaderboardPodium entries={podiumEntries} />
                <ol className="flex flex-col">
                  {activeRankedParticipants.map((participant) => (
                    <li
                      key={participant.id}
                      className="flex min-w-0 items-center gap-3 border-b py-3 last:border-0 sm:gap-4"
                    >
                      <Badge
                        variant={participant.rank === 1 ? "default" : "outline"}
                        className="min-w-10 shrink-0 justify-center"
                        aria-label={participant.rank ? `Rank ${participant.rank}` : "Unranked"}
                      >
                        {participant.rank ?? "—"}
                      </Badge>
                      <Avatar className="size-10 shrink-0 bg-primary/10 text-primary">
                        <AvatarFallback>
                          {initials(participant.name) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {participant.name}
                          {participant.isYou && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              You
                            </span>
                          )}
                        </p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          Completion {formatRate(participant.score.completion_rate)}
                          {" · "}Consistency{" "}
                          {formatRate(participant.score.consistency_rate)}
                          {" · "}On-time{" "}
                          {formatRate(participant.score.on_time_rate)}
                        </p>
                        <div
                          className="mt-2 h-1.5 overflow-hidden bg-muted"
                          role="progressbar"
                          aria-label={`${participant.name} leaderboard score`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(participant.score.score ?? 0)}
                        >
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${Math.min(100, Math.max(0, participant.score.score ?? 0))}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-bold tabular-nums">
                          {participant.score.score === null
                            ? "—"
                            : participant.score.score.toFixed(1)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">/ 100</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <span className="flex size-12 items-center justify-center border bg-muted/40 text-muted-foreground">
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-medium">
                    {scope === "global"
                      ? "No global scores yet"
                      : "Your leaderboard is ready"}
                  </p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    {scope === "global"
                      ? "Complete tasks to establish your score. Tasks and notes are never shared."
                      : "Add friends to compare scores. Only aggregate rates are shared; tasks and notes stay private."}
                  </p>
                </div>
                {scope === "friends" && (
                  <Button nativeButton={false} render={<Link href="/friends" />}>
                    Go to friends
                  </Button>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="flex min-w-0 flex-col">
          <div className="border-b px-3 py-3 sm:px-4 md:px-6 lg:px-8">
            <h2 className="font-heading text-base font-semibold">How your score works</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Rates are measured over a rolling 30-day period.
            </p>
          </div>
          <div className="flex flex-1 flex-col px-3 py-2 sm:px-4 md:px-6 lg:px-8">
            <p className="break-words border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed sm:text-sm">
              Score = 100 × (0.5 × completion + 0.3 × consistency + 0.2 × on-time)
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              All rates are proportions from 0 to 1.
            </p>
            <div className="mt-3">
              <Metric
                label="Completion rate"
                description="Completed task occurrences divided by task occurrences due."
                rate={displayedOwnScore?.completion_rate ?? null}
                weight="50%"
                icon={CheckCircle2}
              />
              <Metric
                label="Consistency rate"
                description="Days with a completed task divided by days with tasks due."
                rate={displayedOwnScore?.consistency_rate ?? null}
                weight="30%"
                icon={Target}
              />
              <Metric
                label="On-time rate"
                description="Tasks completed on or before their due date."
                rate={displayedOwnScore?.on_time_rate ?? null}
                weight="20%"
                icon={Clock3}
              />
            </div>
            <div className="mt-auto flex gap-2 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              <p>
                {scope === "global"
                  ? "All signed-in members can see your aggregate rates and score. Your tasks and notes stay private."
                  : "Your tasks and notes stay private. Friends see only your aggregate rates and score."}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
