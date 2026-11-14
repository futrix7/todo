"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
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
import {
  loadChallengeCatalog,
  loadChallengeLeaderboard,
  loadChallengeSnapshot,
  type ChallengeLeaderboardParticipant,
  type ChallengeStats,
} from "@/lib/supabase/challenge-data";
import type { ChallengeDefinition } from "@/lib/challenges";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface PodiumEntry {
  id: string;
  name: string;
  score: string;
  detail: string;
}

function LeaderboardPodium({
  entries,
}: {
  entries: PodiumEntry[];
}) {
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
    message.includes("get_challenge_leaderboard") ||
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
  const [scope, setScope] = React.useState<
    "friends" | "challenge" | "global"
  >("friends");
  const [friends, setFriends] = React.useState<FriendRequestWithProfile[]>([]);
  const [scores, setScores] = React.useState<FriendLeaderboardScore[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [globalScores, setGlobalScores] = React.useState<
    GlobalLeaderboardScore[]
  >([]);
  const [globalLoading, setGlobalLoading] = React.useState(false);
  const [globalError, setGlobalError] = React.useState<string | null>(null);
  const [challenges, setChallenges] = React.useState<ChallengeDefinition[]>([]);
  const [challengeStats, setChallengeStats] = React.useState<ChallengeStats[]>(
    []
  );
  const [selectedChallengeId, setSelectedChallengeId] = React.useState("");
  const [challengeParticipants, setChallengeParticipants] = React.useState<
    ChallengeLeaderboardParticipant[]
  >([]);
  const [challengeCatalogLoading, setChallengeCatalogLoading] =
    React.useState(true);
  const [challengeBoardLoading, setChallengeBoardLoading] =
    React.useState(false);
  const [challengeError, setChallengeError] = React.useState<string | null>(
    null
  );
  const challengeBoardRequestId = React.useRef(0);

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

  const refreshChallengeCatalog = React.useCallback(async () => {
    if (!userId) return;
    setChallengeCatalogLoading(true);
    try {
      const catalog = await loadChallengeCatalog();
      const snapshot = await loadChallengeSnapshot(
        userId,
        catalog.map((challenge) => challenge.id)
      );
      setChallenges(catalog);
      setChallengeStats(snapshot.stats);
      setChallengeError(null);
      if (!catalog.length) {
        setChallengeParticipants([]);
        setChallengeBoardLoading(false);
      }
      setSelectedChallengeId((current) =>
        catalog.some((challenge) => challenge.id === current)
          ? current
          : (catalog[0]?.id ?? "")
      );
    } catch (loadFailure) {
      setChallengeError(errorMessage(loadFailure));
    } finally {
      setChallengeCatalogLoading(false);
    }
  }, [userId]);

  const refreshChallengeBoard = React.useCallback(async (challengeId: string) => {
    if (!challengeId) return;
    const requestId = ++challengeBoardRequestId.current;
    setChallengeBoardLoading(true);
    setChallengeError(null);
    try {
      const participants = await loadChallengeLeaderboard(challengeId);
      if (requestId === challengeBoardRequestId.current) {
        setChallengeParticipants(participants);
      }
    } catch (loadFailure) {
      if (requestId === challengeBoardRequestId.current) {
        setChallengeError(errorMessage(loadFailure));
      }
    } finally {
      if (requestId === challengeBoardRequestId.current) {
        setChallengeBoardLoading(false);
      }
    }
  }, []);

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

  React.useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void refreshChallengeCatalog();
    });
    return () => {
      active = false;
      challengeBoardRequestId.current += 1;
    };
  }, [refreshChallengeCatalog]);

  React.useEffect(() => {
    if (!selectedChallengeId) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void refreshChallengeBoard(selectedChallengeId);
    });
    return () => {
      active = false;
      challengeBoardRequestId.current += 1;
    };
  }, [refreshChallengeBoard, selectedChallengeId]);

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
  const selectedChallenge = challenges.find(
    (challenge) => challenge.id === selectedChallengeId
  );
  const selectedChallengeStats = challengeStats.find(
    (stats) => stats.challenge_id === selectedChallengeId
  );
  const rankedChallengeParticipants = challengeParticipants.map(
    (participant, index) => ({ ...participant, rank: index + 1 })
  );
  const myChallengeRank =
    rankedChallengeParticipants.find(
      (participant) => participant.userId === userId
    )?.rank ?? null;
  const myChallengeProgress = rankedChallengeParticipants.find(
    (participant) => participant.userId === userId
  );

  return (
    <div className="-mx-3 -my-4 flex min-h-dvh w-[calc(100%+1.5rem)] min-w-0 flex-col sm:-mx-4 sm:-my-6 sm:w-[calc(100%+2rem)] md:-mx-6 md:-my-8 md:w-[calc(100%+3rem)] lg:-mx-8 lg:-my-6 lg:w-[calc(100%+4rem)]">
      <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b px-3 pb-3 pt-5 sm:px-4 md:px-6 lg:px-8">
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
              Compare friends, the Taskflow community, or challenge progress.
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
            disabled={
              scope === "friends"
                ? loading
                : scope === "global"
                  ? globalLoading
                  : challengeCatalogLoading || challengeBoardLoading
            }
            onClick={() => {
              if (scope === "friends") {
                setLoading(true);
                void refresh();
              } else if (scope === "global") {
                void refreshGlobal();
              } else {
                void refreshChallengeCatalog();
                void refreshChallengeBoard(selectedChallengeId);
              }
            }}
          >
            <RefreshCw />
          </Button>
        </div>
      </header>

      <section
        aria-label="Leaderboard types"
        className="grid grid-cols-1 border-b sm:grid-cols-3"
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
          aria-pressed={scope === "challenge"}
          onClick={() => setScope("challenge")}
          className={`flex min-h-20 items-center gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-muted/40 sm:border-b-0 sm:border-r sm:px-4 md:px-6 lg:px-8 ${
            scope === "challenge" ? "bg-primary/[0.04]" : ""
          }`}
        >
          <Trophy className="size-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">By challenge</p>
            <p className="text-xs text-muted-foreground">
              Choose a community challenge
            </p>
          </div>
          {scope === "challenge" && (
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
        className="grid border-b sm:grid-cols-3"
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
        ) : scope === "global" ? (
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
        ) : (
          <>
            <div className="border-b px-3 py-3 sm:border-b-0 sm:border-r sm:px-4 md:px-6 lg:px-8">
              <p className="text-xs text-muted-foreground">Your challenge rank</p>
              <p className="mt-1 font-heading text-3xl font-semibold tabular-nums">
                {challengeBoardLoading || myChallengeRank === null
                  ? "—"
                  : `#${myChallengeRank}`}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  {challengeParticipants.length
                    ? `of ${challengeParticipants.length}`
                    : ""}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Among members who share their progress.
              </p>
            </div>
            <div className="border-b px-3 py-3 sm:border-b-0 sm:border-r sm:px-4 md:px-6 lg:px-8">
              <p className="text-xs text-muted-foreground">Your progress</p>
              <p className="mt-1 font-heading text-3xl font-semibold tabular-nums">
                {challengeBoardLoading || !myChallengeProgress
                  ? "—"
                  : `${myChallengeProgress.completedDays}/${myChallengeProgress.targetDays}`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Completed challenge days.
              </p>
            </div>
            <div className="px-3 py-3 sm:px-4 md:px-6 lg:px-8">
              <p className="text-xs text-muted-foreground">Total joined</p>
              <p className="mt-1 font-heading text-3xl font-semibold tabular-nums">
                {challengeCatalogLoading
                  ? "—"
                  : selectedChallengeStats?.participant_count ?? 0}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Members in this challenge.
              </p>
            </div>
          </>
        )}
      </section>

      {scope !== "challenge" ? (
      <div className="grid min-w-0 flex-1 grid-rows-[auto_1fr] border-t xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)] xl:grid-rows-1">
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
              <LeaderboardPodium
                entries={activeRankedParticipants
                  .filter((participant) => participant.score.score !== null)
                  .slice(0, 3)
                  .map((participant) => ({
                    id: participant.id,
                    name: participant.name,
                    score: participant.score.score?.toFixed(1) ?? "—",
                    detail: "/ 100",
                  }))}
              />
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
      ) : (
        <div className="grid min-w-0 flex-1 border-t xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,1fr)]">
          <section className="flex min-w-0 flex-col border-b xl:border-b-0 xl:border-r">
            <header className="flex flex-col gap-3 border-b px-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-4 md:px-6 lg:px-8">
              <div>
                <h2 className="font-heading text-base font-semibold">
                  Challenge leaderboard
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Rank by completed days in a specific challenge.
                </p>
              </div>
              <Select
                value={selectedChallengeId}
                onValueChange={(value) => {
                  if (value) setSelectedChallengeId(value);
                }}
                disabled={challengeCatalogLoading || challenges.length === 0}
              >
                <SelectTrigger
                  aria-label="Choose a challenge"
                  className="w-full sm:w-64"
                >
                  <SelectValue
                    placeholder={
                      challengeCatalogLoading
                        ? "Loading challenges…"
                        : "Choose a challenge"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {challenges.map((challenge) => (
                    <SelectItem key={challenge.id} value={challenge.id}>
                      {challenge.name} · {challenge.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </header>

            <div className="min-w-0 flex-1 px-3 py-4 sm:px-4 md:px-6 lg:px-8">
              {challengeCatalogLoading || challengeBoardLoading ? (
                <div
                  className="flex flex-col gap-3"
                  role="status"
                  aria-label="Loading challenge leaderboard"
                >
                  <Skeleton className="h-72 w-full rounded-3xl" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <span className="sr-only">Loading challenge leaderboard</span>
                </div>
              ) : challengeError ? (
                <div className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p role="alert" className="text-sm text-destructive">
                    {challengeError}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void refreshChallengeCatalog();
                      void refreshChallengeBoard(selectedChallengeId);
                    }}
                  >
                    Try again
                  </Button>
                </div>
              ) : challenges.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card px-4 py-12 text-center">
                  <Trophy className="size-8 text-muted-foreground" />
                  <p className="text-sm font-medium">No active challenges</p>
                  <p className="text-sm text-muted-foreground">
                    Join or create a challenge to start a challenge leaderboard.
                  </p>
                  <Button
                    nativeButton={false}
                    render={<Link href="/friends/challenges" />}
                  >
                    Browse challenges
                  </Button>
                </div>
              ) : rankedChallengeParticipants.length > 0 ? (
                <>
                  <LeaderboardPodium
                    entries={rankedChallengeParticipants.slice(0, 3).map(
                      (participant) => ({
                        id: participant.userId,
                        name: participant.displayName,
                        score: String(participant.completedDays),
                        detail: `/ ${participant.targetDays} days`,
                      })
                    )}
                  />
                  <ol className="divide-y rounded-2xl border bg-card px-3 sm:px-4">
                    {rankedChallengeParticipants.map((participant) => {
                      const progress = Math.min(
                        100,
                        Math.round(
                          (participant.completedDays / participant.targetDays) *
                            100
                        )
                      );
                      return (
                        <li
                          key={participant.userId}
                          className="flex min-w-0 items-center gap-3 py-3 sm:gap-4"
                        >
                          <Badge
                            variant={participant.rank === 1 ? "default" : "outline"}
                            className="min-w-10 shrink-0 justify-center"
                          >
                            {participant.rank}
                          </Badge>
                          <Avatar className="size-10 shrink-0 bg-primary/10 text-primary">
                            <AvatarFallback>
                              {initials(participant.displayName) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                              {participant.displayName}
                              {participant.userId === userId && (
                                <span className="ml-2 text-xs font-normal text-muted-foreground">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              @{participant.username}
                            </p>
                            <div
                              className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                              role="progressbar"
                              aria-label={`${participant.displayName} challenge progress`}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={progress}
                            >
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                          <p className="shrink-0 text-right text-sm font-semibold tabular-nums">
                            {participant.completedDays}
                            <span className="text-muted-foreground">
                              /{participant.targetDays}
                            </span>
                            <span className="block text-[10px] font-normal text-muted-foreground">
                              days
                            </span>
                          </p>
                        </li>
                      );
                    })}
                  </ol>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    Members who hide their challenge status are not shown.
                    Your own progress is always visible to you.
                  </p>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed bg-card px-4 py-12 text-center">
                  <p className="text-sm font-medium">
                    No visible participants yet
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Join this challenge to begin tracking your progress.
                  </p>
                  <Button
                    className="mt-4"
                    nativeButton={false}
                    render={<Link href="/friends/challenges" />}
                  >
                    Browse challenges
                  </Button>
                </div>
              )}
            </div>
          </section>

          <aside className="flex min-w-0 flex-col gap-4 p-4 sm:p-5 md:p-6">
            <div className="rounded-2xl border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Selected challenge
              </p>
              <h3 className="mt-2 font-heading text-lg font-semibold">
                {selectedChallenge?.name ?? "Choose a challenge"}
              </h3>
              {selectedChallenge && (
                <>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedChallenge.category} · {selectedChallenge.targetDays} days
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {selectedChallenge.description}
                  </p>
                </>
              )}
            </div>
            <div className="rounded-2xl border bg-card p-4">
              <div className="flex items-center gap-2">
                <UsersRound className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Challenge members</h3>
              </div>
              <p className="mt-2 font-heading text-3xl font-semibold tabular-nums">
                {challengeCatalogLoading
                  ? "—"
                  : selectedChallengeStats?.participant_count ?? 0}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Total members who joined this challenge.
              </p>
            </div>
            <div className="rounded-2xl border bg-muted/30 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Fair and private</h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Rankings use completed challenge days. Only members who chose
                to share their challenge status appear; their tasks and notes
                remain private.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
