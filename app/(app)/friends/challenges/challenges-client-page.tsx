"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Brain,
  BriefcaseBusiness,
  Check,
  Dumbbell,
  Flame,
  PiggyBank,
  Share2,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CHALLENGE_CATEGORIES } from "@/lib/challenges";
import type { ChallengeCategory, ChallengeDefinition } from "@/lib/challenges";
import { useAuth } from "@/lib/auth";
import {
  joinChallenge,
  loadChallengeCatalog,
  loadChallengeSnapshot,
  type ChallengeSnapshot,
} from "@/lib/supabase/challenge-data";
import { useTodayKey } from "@/lib/use-local-storage";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<ChallengeCategory, LucideIcon> = {
  Fitness: Dumbbell,
  Mind: Brain,
  Discipline: ShieldCheck,
  Productivity: BriefcaseBusiness,
  Money: PiggyBank,
};

const CATEGORY_STYLES: Record<ChallengeCategory, string> = {
  Fitness: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Mind: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  Discipline: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Productivity: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  Money: "bg-primary/10 text-primary",
};

type CategoryFilter = "All" | ChallengeCategory;

function getErrorMessage(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Something went wrong.";
  if (
    message.includes("challenge_participants") ||
    message.includes("challenge_checkins") ||
    message.includes("get_challenge_stats") ||
    message.includes("challenge_catalog") ||
    message.includes("join_challenge_and_create_task")
  ) {
    return "Challenges storage is not set up yet. Run the challenges migration in your Supabase project, then try again.";
  }
  return message;
}

function ChallengeCard({
  challenge,
  joinedOn,
  participantCount,
  busy,
  onJoin,
  onShare,
}: {
  challenge: ChallengeDefinition;
  joinedOn?: string;
  participantCount: number;
  busy: boolean;
  onJoin: () => void;
  onShare: () => void;
}) {
  const Icon = CATEGORY_ICONS[challenge.category];
  const joined = Boolean(joinedOn);

  return (
    <Card
      id={`challenge-${challenge.id}`}
      className={cn(
        "flex h-full flex-col gap-0 overflow-hidden rounded-xl bg-card py-0 ring-1 ring-foreground/10 transition-colors hover:ring-primary/30",
        joined
          ? "ring-1 ring-primary/40"
          : ""
      )}
    >
      <header className="flex items-start gap-3 border-b px-4 py-4 sm:px-5">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            CATEGORY_STYLES[challenge.category]
          )}
          aria-hidden
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-sm font-semibold leading-tight tracking-tight">
            {challenge.name}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {challenge.category}
          </p>
        </div>
        <Badge variant={joined ? "secondary" : "outline"} className="shrink-0">
          {joined ? "In progress" : "Open"}
        </Badge>
      </header>

      <div className="flex flex-1 flex-col gap-4 px-4 py-4 sm:px-5">
        <p className="min-h-12 text-sm leading-relaxed text-muted-foreground">
          {challenge.description}
        </p>
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Duration
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Build a steady routine</p>
          </div>
          <div className="text-right">
            <span className="font-heading text-xl font-semibold tabular-nums">
              {challenge.targetDays}
            </span>
            <span className="ml-1 text-xs text-muted-foreground">days</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-3 text-xs text-muted-foreground sm:px-5">
        <span className="inline-flex items-center gap-1.5">
          <UsersRound className="size-3.5" />
          <span className="font-semibold tabular-nums text-foreground">
            {participantCount.toLocaleString()}
          </span>
          {participantCount === 1 ? "person joined" : "people joined"}
        </span>
        {joined && joinedOn && (
          <span className="ml-auto">Started {joinedOn}</span>
        )}
      </div>

      <footer className="flex items-center gap-2 border-t bg-muted/20 px-4 py-3 sm:px-5">
        {joined ? (
          <Button type="button" className="h-10 flex-1" disabled>
            <Check />
            Joined
          </Button>
        ) : (
          <Button
            type="button"
            className="h-10 flex-1"
            disabled={busy}
            onClick={onJoin}
          >
            <UsersRound />
            {busy ? "Joining…" : "Join challenge"}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          className="h-10 px-3"
          aria-label={`Share ${challenge.name}`}
          onClick={onShare}
        >
          <Share2 />
          Share
        </Button>
      </footer>
    </Card>
  );
}

export default function ChallengesClientPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const today = useTodayKey();
  const [challenges, setChallenges] = React.useState<ChallengeDefinition[]>([]);
  const [snapshot, setSnapshot] = React.useState<ChallengeSnapshot | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<CategoryFilter>("All");
  const [busyChallengeId, setBusyChallengeId] = React.useState<string | null>(
    null
  );

  const refresh = React.useCallback(async () => {
    if (!userId || !today) return;
    const catalog = await loadChallengeCatalog();
    const nextSnapshot = await loadChallengeSnapshot(
      userId,
      catalog.map((challenge) => challenge.id)
    );
    setChallenges(catalog);
    setSnapshot(nextSnapshot);
    setLoadError(null);
  }, [today, userId]);

  React.useEffect(() => {
    let active = true;
    if (!userId || !today) return;

    loadChallengeCatalog()
      .then(async (catalog) => {
        const nextSnapshot = await loadChallengeSnapshot(
          userId,
          catalog.map((challenge) => challenge.id)
        );
        if (!active) return;
        setChallenges(catalog);
        setSnapshot(nextSnapshot);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(getErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [today, userId]);

  const participationById = new Map(
    (snapshot?.participations ?? []).map((participation) => [
      participation.challenge_id,
      participation,
    ])
  );
  const statsById = new Map(
    (snapshot?.stats ?? []).map((stats) => [stats.challenge_id, stats])
  );
  const visibleChallenges =
    filter === "All"
      ? challenges
      : challenges.filter((challenge) => challenge.category === filter);
  const joinedCount = snapshot?.participations.length ?? 0;

  async function runChallengeAction(
    challenge: ChallengeDefinition,
    action: () => Promise<void>,
    successMessage: string
  ) {
    if (!userId) {
      toast.error("Sign in to join and track challenges.");
      return;
    }

    setBusyChallengeId(challenge.id);
    try {
      await action();
      await refresh();
      toast.success(successMessage);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusyChallengeId(null);
    }
  }

  async function shareChallenge(challenge: ChallengeDefinition) {
    const url = `${window.location.origin}/friends/challenges#challenge-${challenge.id}`;
    const title = `Join me on Taskflow: ${challenge.name}`;
    const text = `Hey! I'm taking on the ${challenge.targetDays}-day ${challenge.name} challenge on Taskflow. ${challenge.description} Join me here:`;
    const shareData = {
      title,
      text,
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        toast.error(
          error instanceof Error ? error.message : "Unable to share this challenge."
        );
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(`${title}\n\n${text}\n${url}`);
      toast.success("Challenge link copied.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to copy the challenge link."
      );
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="min-w-0">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/friends" />}
            className="mb-1 w-fit px-1 text-muted-foreground"
          >
            <ArrowLeft />
            Back to friends
          </Button>
          <h1 className="font-heading text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
            Challenges
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Join a community challenge to add its daily task to your Tasks page.
            Only participant totals are shared.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
          <Flame className="size-4 text-primary" />
          <span className="font-semibold tabular-nums">{joinedCount}</span>
          <span className="text-muted-foreground">
            {joinedCount === 1 ? "challenge joined" : "challenges joined"}
          </span>
        </div>
      </header>

      {loadError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-destructive">{loadError}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void refresh().catch((error: unknown) =>
                setLoadError(getErrorMessage(error))
              );
            }}
          >
            Try again
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filter challenges by category"
        >
          {(["All", ...CHALLENGE_CATEGORIES] as CategoryFilter[]).map(
            (category) => (
              <Button
                key={category}
                type="button"
                size="sm"
                className="h-8 rounded-lg px-3"
                variant={filter === category ? "default" : "outline"}
                aria-pressed={filter === category}
                onClick={() => setFilter(category)}
              >
                {category}
              </Button>
            )
          )}
        </div>
        {!loading && (
          <p className="text-xs text-muted-foreground">
            {visibleChallenges.length}{" "}
            {visibleChallenges.length === 1 ? "challenge" : "challenges"}
          </p>
        )}
      </div>

      {loading ? (
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading challenges">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="min-w-0"
            >
              <div className="flex h-[22rem] flex-col gap-4 overflow-hidden rounded-xl border bg-card p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="mt-auto h-5 w-28" />
                <div className="flex gap-2 border-t pt-4">
                  <Skeleton className="h-11 flex-1 rounded-lg" />
                  <Skeleton className="h-11 w-24 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
          <span className="sr-only">Loading challenges</span>
        </div>
      ) : (
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleChallenges.length === 0 && !loadError ? (
            <p className="col-span-full rounded-2xl border border-dashed bg-card px-4 py-12 text-center text-sm text-muted-foreground">
              No challenges are available yet.
            </p>
          ) : visibleChallenges.map((challenge) => (
            <div
              key={challenge.id}
              className="min-w-0"
            >
              <ChallengeCard
                challenge={challenge}
                joinedOn={participationById.get(challenge.id)?.joined_on}
                participantCount={
                  statsById.get(challenge.id)?.participant_count ?? 0
                }
                busy={busyChallengeId === challenge.id}
                onJoin={() =>
                  void runChallengeAction(
                    challenge,
                    () => joinChallenge(challenge.id, today),
                    "You joined the challenge. One day at a time!"
                  )
                }
                onShare={() => void shareChallenge(challenge)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}