"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Target,
  Trophy,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FadeIn } from "@/components/motion-fade";

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
    return "Leaderboard scoring is not set up yet. Apply the latest Supabase migration.";
  }
  if (
    message.includes("friend_requests") ||
    message.includes("profiles")
  ) {
    return "Friends storage is not ready yet. Run the social features SQL migration in your Supabase project.";
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
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <FadeIn className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            nativeButton={false}
            render={<Link href="/friends" />}
            aria-label="Back to friends"
          >
            <ArrowLeft />
          </Button>
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Leaderboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              See how your circle is doing over the last 30 days.
            </p>
          </div>
        </div>
        <div className="flex gap-2 pl-12 sm:pl-0">
          <Button
            variant="outline"
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
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RefreshCw />
            )}
          </Button>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card">
          <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <Trophy className="size-6" />
              </span>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Your current score
                </p>
                <p className="mt-1 font-heading text-4xl font-bold tracking-tight tabular-nums">
                  {loading
                    ? "—"
                    : ownScore?.score === null || ownScore?.score === undefined
                      ? "—"
                      : ownScore.score.toFixed(1)}
                  <span className="ml-1 text-lg font-medium text-muted-foreground">
                    / 100
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {ownScore?.score == null
                    ? "Complete more tasks to establish your score."
                    : "Based on your recent task activity."}
                </p>
              </div>
            </div>
            <div className="rounded-xl border bg-background/70 px-4 py-3 sm:min-w-36">
              <p className="text-xs text-muted-foreground">Your rank</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {loading || myRank === null ? "—" : `#${myRank}`}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  {participants.length > 1
                    ? `of ${participants.length}`
                    : participants.length === 1
                      ? "of 1"
                      : ""}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card>
          <CardHeader>
            <CardTitle>How your score works</CardTitle>
            <CardDescription>
              Each rate is measured over a rolling 30-day period.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-xl bg-muted/60 p-4 text-center">
              <p className="font-mono text-sm leading-relaxed sm:text-base">
                Score = 100 × (0.5 × completion + 0.3 × consistency + 0.2 ×
                on-time)
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                All rates are proportions from 0 to 1.
              </p>
            </div>
            <div className="grid gap-3">
              <Metric
                label="Completion rate"
                description="Completed task occurrences divided by task occurrences due."
                rate={ownScore?.completion_rate ?? null}
                weight="50% of score"
                icon={CheckCircle2}
              />
              <Metric
                label="Consistency rate"
                description="Days you completed a task divided by days with tasks due."
                rate={ownScore?.consistency_rate ?? null}
                weight="30% of score"
                icon={Target}
              />
              <Metric
                label="On-time rate"
                description="Tasks with due dates completed on or before their due date."
                rate={ownScore?.on_time_rate ?? null}
                weight="20% of score"
                icon={Clock3}
              />
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.15}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Friends leaderboard</CardTitle>
                <CardDescription className="mt-1">
                  {friends.length} {friends.length === 1 ? "friend" : "friends"}{" "}
                  · ranked by score
                </CardDescription>
              </div>
              <Badge variant="outline">Last 30 days</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex min-h-36 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading leaderboard…
              </div>
            ) : error ? (
              <div className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
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
              <ol className="flex flex-col gap-2">
                {rankedParticipants.map((participant) => (
                  <li
                    key={participant.id}
                    className="flex min-w-0 items-center gap-3 rounded-xl border p-3 sm:gap-4 sm:p-4"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                      {participant.rank ?? "—"}
                    </span>
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
                <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
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
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
