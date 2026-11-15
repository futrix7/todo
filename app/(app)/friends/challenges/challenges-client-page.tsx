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
  Info,
  PiggyBank,
  Plus,
  Share2,
  ShieldCheck,
  Sparkles,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DrawerFooter } from "@/components/ui/drawer";
import { ResponsiveOverlay } from "@/components/responsive-overlay";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { CHALLENGE_CATEGORIES } from "@/lib/challenges";
import type { ChallengeCategory, ChallengeDefinition } from "@/lib/challenges";
import { useAuth } from "@/lib/auth";
import {
  createCommunityChallenge,
  joinChallenge,
  loadChallengeCatalog,
  loadChallengeSnapshot,
  loadVisibleChallengeParticipants,
  type ChallengeSnapshot,
  type VisibleChallengeParticipant,
} from "@/lib/supabase/challenge-data";
import { loadTasks } from "@/lib/supabase/task-data";
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
  onDetails,
  onJoin,
  onShare,
}: {
  challenge: ChallengeDefinition;
  joinedOn?: string;
  participantCount: number;
  busy: boolean;
  onDetails: () => void;
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
        <Button
          type="button"
          variant="outline"
          className="h-10 px-3"
          aria-label={`Details for ${challenge.name}`}
          onClick={onDetails}
        >
          <Info />
          <span className="hidden sm:inline">Details</span>
        </Button>
        {joined ? (
          <Button type="button" className="h-10 flex-1 px-2 sm:px-3" disabled>
            <Check />
            <span className="truncate">Joined</span>
          </Button>
        ) : (
          <Button
            type="button"
            className="h-10 min-w-0 flex-1 px-2 sm:px-3"
            disabled={busy}
            onClick={onJoin}
          >
            <UsersRound />
            <span className="truncate">{busy ? "Joining…" : "Join challenge"}</span>
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
          <span className="hidden sm:inline">Share</span>
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
  const [hasNoTasks, setHasNoTasks] = React.useState(false);
  const [taskCheckError, setTaskCheckError] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [detailsChallenge, setDetailsChallenge] =
    React.useState<ChallengeDefinition | null>(null);
  const [visibleParticipants, setVisibleParticipants] = React.useState<
    VisibleChallengeParticipant[]
  >([]);
  const [participantsLoading, setParticipantsLoading] = React.useState(false);
  const [participantsError, setParticipantsError] = React.useState<string | null>(
    null
  );
  const participantsRequestId = React.useRef(0);
  const [savingChallenge, setSavingChallenge] = React.useState(false);
  const [challengeName, setChallengeName] = React.useState("");
  const [challengeCategory, setChallengeCategory] =
    React.useState<ChallengeCategory>("Fitness");
  const [challengeTargetDays, setChallengeTargetDays] = React.useState("7");
  const [challengeDescription, setChallengeDescription] = React.useState("");

  const refresh = React.useCallback(async () => {
    if (!userId || !today) return;
    const [catalog, taskResult] = await Promise.all([
      loadChallengeCatalog(),
      loadTasks(userId).then(
        (tasks) => ({ status: "loaded" as const, tasks }),
        (error: unknown) => ({ status: "error" as const, error })
      ),
    ]);
    const nextSnapshot = await loadChallengeSnapshot(
      userId,
      catalog.map((challenge) => challenge.id)
    );
    setChallenges(catalog);
    setSnapshot(nextSnapshot);
    setHasNoTasks(
      taskResult.status === "loaded" && taskResult.tasks.length === 0
    );
    setTaskCheckError(
      taskResult.status === "error" ? getErrorMessage(taskResult.error) : null
    );
    setLoadError(null);
  }, [today, userId]);

  React.useEffect(() => {
    let active = true;
    if (!userId || !today) return;

    Promise.all([
      loadChallengeCatalog(),
      loadTasks(userId).then(
        (tasks) => ({ status: "loaded" as const, tasks }),
        (error: unknown) => ({ status: "error" as const, error })
      ),
    ])
      .then(async ([catalog, taskResult]) => {
        const nextSnapshot = await loadChallengeSnapshot(
          userId,
          catalog.map((challenge) => challenge.id)
        );
        if (!active) return;
        setChallenges(catalog);
        setSnapshot(nextSnapshot);
        setHasNoTasks(
          taskResult.status === "loaded" && taskResult.tasks.length === 0
        );
        setTaskCheckError(
          taskResult.status === "error"
            ? getErrorMessage(taskResult.error)
            : null
        );
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
  const recommendations = challenges
    .filter(
      (challenge) =>
        !participationById.has(challenge.id) && challenge.targetDays <= 30
    )
    .sort((a, b) => a.targetDays - b.targetDays)
    .slice(0, 3);

  async function openChallengeDetails(challenge: ChallengeDefinition) {
    const requestId = ++participantsRequestId.current;
    setDetailsChallenge(challenge);
    setVisibleParticipants([]);
    setParticipantsError(null);
    setParticipantsLoading(true);
    try {
      const participants = await loadVisibleChallengeParticipants(challenge.id);
      if (requestId === participantsRequestId.current) {
        setVisibleParticipants(participants);
      }
    } catch (error) {
      if (requestId === participantsRequestId.current) {
        setParticipantsError(
          error instanceof Error
            ? error.message
            : "Unable to load visible participants."
        );
      }
    } finally {
      if (requestId === participantsRequestId.current) {
        setParticipantsLoading(false);
      }
    }
  }

  function closeChallengeDetails() {
    participantsRequestId.current += 1;
    setDetailsChallenge(null);
    setParticipantsLoading(false);
  }

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

  async function createChallenge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) {
      toast.error("Sign in to create a challenge.");
      return;
    }

    const name = challengeName.trim();
    const description = challengeDescription.trim();
    const targetDays = Number(challengeTargetDays);
    if (name.length < 3 || name.length > 80) {
      toast.error("Challenge name must be between 3 and 80 characters.");
      return;
    }
    if (!Number.isInteger(targetDays) || targetDays < 1 || targetDays > 365) {
      toast.error("Choose a duration between 1 and 365 days.");
      return;
    }
    if (description.length < 10 || description.length > 500) {
      toast.error("Description must be between 10 and 500 characters.");
      return;
    }

    setSavingChallenge(true);
    try {
      await createCommunityChallenge({
        id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "challenge"}-${crypto.randomUUID().slice(0, 8)}`,
        name,
        category: challengeCategory,
        targetDays,
        description,
      });
      setChallengeName("");
      setChallengeCategory("Fitness");
      setChallengeTargetDays("7");
      setChallengeDescription("");
      setCreateOpen(false);
      toast.success("Your challenge is now available to everyone.");
      try {
        await refresh();
      } catch (error) {
        const message = getErrorMessage(error);
        setLoadError(message);
        toast.error(`Challenge created, but the list could not be refreshed: ${message}`);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingChallenge(false);
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
            Participant names appear only when they opt in.
          </p>
        </div>
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">
          <Button
            type="button"
            className="min-h-10 flex-1 sm:flex-none"
            onClick={() => setCreateOpen(true)}
          >
            <Plus />
            Create challenge
          </Button>
          <div className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm sm:flex-none">
            <Flame className="size-4 text-primary" />
            <span className="font-semibold tabular-nums">{joinedCount}</span>
            <span className="text-muted-foreground">
              {joinedCount === 1 ? "challenge joined" : "challenges joined"}
            </span>
          </div>
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
      {taskCheckError && (
        <p
          role="alert"
          className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground"
        >
          We couldn’t check your tasks, so starter recommendations are
          unavailable. {taskCheckError}
        </p>
      )}

      {!loading && hasNoTasks && recommendations.length > 0 && (
        <section
          className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-4 sm:p-5"
          aria-labelledby="recommended-challenges-title"
        >
          <div className="mb-4 flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </span>
            <div>
              <h2
                id="recommended-challenges-title"
                className="font-heading text-base font-semibold"
              >
                A good place to start
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick a short challenge to add your first daily task.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {recommendations.map((challenge) => (
              <Card
                key={challenge.id}
                className="flex min-w-0 flex-col gap-3 rounded-xl p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{challenge.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {challenge.targetDays} days · {challenge.category}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-auto w-full"
                  onClick={() => void openChallengeDetails(challenge)}
                >
                  <Info />
                  View details
                </Button>
              </Card>
            ))}
          </div>
        </section>
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
                  <Skeleton className="size-10 shrink-0 rounded-lg" />
                  <Skeleton className="h-10 min-w-0 flex-1 rounded-lg" />
                  <Skeleton className="size-10 shrink-0 rounded-lg sm:w-24" />
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
                onDetails={() => void openChallengeDetails(challenge)}
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

      <ResponsiveOverlay
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create a challenge"
        description="Create a public challenge that any signed-in member can join."
      >
          <form
            onSubmit={(event) => void createChallenge(event)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <div className="space-y-2">
                <Label htmlFor="challenge-name">Name</Label>
                <Input
                  id="challenge-name"
                  value={challengeName}
                  onChange={(event) => setChallengeName(event.target.value)}
                  minLength={3}
                  maxLength={80}
                  placeholder="For example, 10-minute daily walk"
                  required
                  disabled={savingChallenge}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="challenge-category">Category</Label>
                  <select
                    id="challenge-category"
                    value={challengeCategory}
                    onChange={(event) => {
                      const category = CHALLENGE_CATEGORIES.find(
                        (candidate) => candidate === event.target.value
                      );
                      if (category) setChallengeCategory(category);
                    }}
                    disabled={savingChallenge}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {CHALLENGE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="challenge-target-days">Duration (days)</Label>
                  <Input
                    id="challenge-target-days"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={365}
                    step={1}
                    value={challengeTargetDays}
                    onChange={(event) =>
                      setChallengeTargetDays(event.target.value)
                    }
                    required
                    disabled={savingChallenge}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="challenge-description">Description</Label>
                <Textarea
                  id="challenge-description"
                  value={challengeDescription}
                  onChange={(event) =>
                    setChallengeDescription(event.target.value)
                  }
                  minLength={10}
                  maxLength={500}
                  rows={4}
                  placeholder="Explain what participants will do each day."
                  required
                  disabled={savingChallenge}
                />
                <p className="text-xs text-muted-foreground">
                  10–500 characters. Your challenge will be visible to all signed-in users.
                </p>
              </div>
            </div>
            <DrawerFooter className="border-t bg-popover sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={savingChallenge}
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingChallenge}>
                {savingChallenge ? "Creating…" : "Create challenge"}
              </Button>
            </DrawerFooter>
          </form>
      </ResponsiveOverlay>

      <ResponsiveOverlay
        open={Boolean(detailsChallenge)}
        onOpenChange={(open) => {
          if (!open) closeChallengeDetails();
        }}
        title={detailsChallenge?.name ?? "Challenge details"}
        description="Review the challenge and see members who chose to show their participation."
      >
          {detailsChallenge && (
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl",
                    CATEGORY_STYLES[detailsChallenge.category]
                  )}
                  aria-hidden
                >
                  {React.createElement(CATEGORY_ICONS[detailsChallenge.category], {
                    className: "size-5",
                  })}
                </span>
                <div>
                  <p className="font-semibold">{detailsChallenge.category}</p>
                  <p className="text-sm text-muted-foreground">
                    {detailsChallenge.targetDays} days
                  </p>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {detailsChallenge.description}
              </p>
              <section className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">Visible participants</h3>
                  <span className="text-xs text-muted-foreground">
                    {statsById.get(detailsChallenge.id)?.participant_count ?? 0} joined
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Only members who opted in to show their challenge status appear here.
                </p>
                {participantsLoading ? (
                  <p className="text-sm text-muted-foreground" role="status">
                    Loading participants…
                  </p>
                ) : participantsError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {participantsError}
                  </p>
                ) : visibleParticipants.length > 0 ? (
                  <ul className="divide-y rounded-xl border">
                    {visibleParticipants.map((participant) => (
                      <li
                        key={`${participant.username}-${participant.displayName}`}
                        className="flex min-w-0 items-center justify-between gap-3 px-3 py-2.5"
                      >
                        <span className="truncate text-sm font-medium">
                          {participant.displayName}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          @{participant.username}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-xl border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                    No participants have chosen to show their status yet.
                  </p>
                )}
              </section>
            </div>
          )}
          <DrawerFooter className="border-t bg-popover sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={closeChallengeDetails}
            >
              Close
            </Button>
          </DrawerFooter>
      </ResponsiveOverlay>
    </div>
  );
}