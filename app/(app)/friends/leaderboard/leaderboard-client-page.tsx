"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Globe2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Target,
  UsersRound,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import {
  loadFriendLeaderboardScores,
  loadFriendOverview,
  type FriendLeaderboardScore,
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

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  if (
    message.includes("get_friend_leaderboard_scores") ||
    (error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "PGRST202")
  ) {
    return "Leaderboard scoring is not set up yet. Apply the current Supabase schema.";
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
  const [friends, setFriends] = React.useState<FriendRequestWithProfile[]>([]);
  const [scores, setScores] = React.useState<FriendLeaderboardScore[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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

  React.useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void refresh();
    });
    return () => {
      active = false;
    };
  }, [refresh]);

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
              See how your circle is doing over the last 30 days.
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
            disabled={loading}
            onClick={() => {
              setLoading(true);
              void refresh();
            }}
          >
            <RefreshCw />
          </Button>
        </div>
      </header>

      <section aria-label="Leaderboard types" className="grid grid-cols-1 border-b sm:grid-cols-3">
        <div className="flex min-h-20 items-center gap-3 border-b px-3 py-3 sm:border-b-0 sm:border-r sm:px-4 md:px-6 lg:px-8">
          <UsersRound className="size-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Friends</p>
            <p className="text-xs text-muted-foreground">Your circle · active</p>
          </div>
          <Badge className="ml-auto">Current</Badge>
        </div>
        <div className="flex min-h-20 items-center gap-3 border-b px-3 py-3 sm:border-b-0 sm:border-r sm:px-4 md:px-6 lg:px-8">
          <MapPin className="size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Regional</p>
            <p className="text-xs text-muted-foreground">Local community rankings</p>
          </div>
          <Badge variant="outline" className="ml-auto whitespace-nowrap">Coming soon</Badge>
        </div>
        <div className="flex min-h-20 items-center gap-3 px-3 py-3 sm:px-4 md:px-6 lg:px-8">
          <Globe2 className="size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Global</p>
            <p className="text-xs text-muted-foreground">Compare across Taskflow</p>
          </div>
          <Badge variant="outline" className="ml-auto whitespace-nowrap">Coming soon</Badge>
        </div>
      </section>

      <section aria-label="Your leaderboard summary" className="grid border-b sm:grid-cols-3">
        <div className="border-b px-3 py-3 sm:border-b-0 sm:border-r sm:px-4 md:px-6 lg:px-8">
          <p className="text-xs text-muted-foreground">Your score · last 30 days</p>
          <p className="mt-1 font-heading text-3xl font-semibold tabular-nums">
            {loading || ownScore?.score == null ? "—" : ownScore.score.toFixed(1)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">/ 100</span>
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
          <p className="mt-1 text-xs text-muted-foreground">Based on score, highest first.</p>
        </div>
        <div className="px-3 py-3 sm:px-4 md:px-6 lg:px-8">
          <p className="text-xs text-muted-foreground">Friends in your circle</p>
          <p className="mt-1 font-heading text-3xl font-semibold tabular-nums">
            {loading ? "—" : friends.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {participants.length} {participants.length === 1 ? "member has" : "members have"} a score
          </p>
        </div>
      </section>

      <div className="grid min-w-0 flex-1 grid-rows-[auto_1fr] border-t xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)] xl:grid-rows-1">
        <section className="flex min-w-0 flex-col border-b xl:border-b-0 xl:border-r">
          <div className="flex flex-col gap-2 border-b px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 md:px-6 lg:px-8">
            <div>
              <h2 className="font-heading text-base font-semibold">Friends leaderboard</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {friends.length} {friends.length === 1 ? "friend" : "friends"} · ranked by score
              </p>
            </div>
            <Badge variant="outline" className="w-fit">Last 30 days</Badge>
          </div>
          <div className="flex-1 px-3 py-2 sm:px-4 md:px-6 lg:px-8">
            {loading ? (
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
            ) : error ? (
              <div className="flex flex-col items-start gap-3 border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLoading(true);
                    void refresh();
                  }}
                >
                  Try again
                </Button>
              </div>
            ) : rankedParticipants.length ? (
              <ol className="flex flex-col">
                {rankedParticipants.map((participant) => (
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
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <span className="flex size-12 items-center justify-center border bg-muted/40 text-muted-foreground">
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-medium">Your leaderboard is ready</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Add friends to compare scores. Only aggregate rates are
                    shared; tasks and notes stay private.
                  </p>
                </div>
                <Button nativeButton={false} render={<Link href="/friends" />}>
                  Go to friends
                </Button>
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
            <p className="border bg-muted/30 p-3 font-mono text-xs leading-relaxed sm:text-sm">
              Score = 100 × (0.5 × completion + 0.3 × consistency + 0.2 × on-time)
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              All rates are proportions from 0 to 1.
            </p>
            <div className="mt-3">
              <Metric
                label="Completion rate"
                description="Completed task occurrences divided by task occurrences due."
                rate={ownScore?.completion_rate ?? null}
                weight="50%"
                icon={CheckCircle2}
              />
              <Metric
                label="Consistency rate"
                description="Days with a completed task divided by days with tasks due."
                rate={ownScore?.consistency_rate ?? null}
                weight="30%"
                icon={Target}
              />
              <Metric
                label="On-time rate"
                description="Tasks completed on or before their due date."
                rate={ownScore?.on_time_rate ?? null}
                weight="20%"
                icon={Clock3}
              />
            </div>
            <div className="mt-auto flex gap-2 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              <p>Your tasks and notes stay private. Friends see only your aggregate rates and score.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
