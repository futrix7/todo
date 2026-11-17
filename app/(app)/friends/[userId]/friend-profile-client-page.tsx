"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  Flame,
  Medal,
  Target,
  TrendingUp,
  UserCheck,
  UserPlus,
  UserRound,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { dateKey, shortLabel } from "@/lib/date-utils";
import {
  loadFriendLeaderboardScores,
  loadFriendOverview,
  loadSocialProfile,
  type FriendLeaderboardScore,
  type SocialProfile,
} from "@/lib/supabase/social-data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Relation = "self" | "friend" | "incoming" | "outgoing" | "none";
type IconType = React.ComponentType<{ className?: string }>;

const RELATION_LABEL: Record<Relation, string> = {
  self: "This is you",
  friend: "Friend",
  incoming: "Request received",
  outgoing: "Request sent",
  none: "Not in your circle",
};

const RELATION_STYLE: Record<Relation, string> = {
  self: "bg-primary/10 text-primary",
  friend: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  incoming: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
  outgoing: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  none: "bg-muted text-muted-foreground",
};

const RELATION_ICON: Partial<Record<Relation, IconType>> = {
  friend: UserCheck,
  incoming: UserPlus,
  outgoing: Clock,
};

type Tone = "orange" | "amber" | "sky" | "emerald" | "violet";

const TONE: Record<Tone, { tile: string; bar: string }> = {
  orange: {
    tile: "bg-orange-500/12 text-orange-600 dark:text-orange-400",
    bar: "bg-orange-500",
  },
  amber: {
    tile: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  sky: {
    tile: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
    bar: "bg-sky-500",
  },
  emerald: {
    tile: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
  violet: {
    tile: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
    bar: "bg-violet-500",
  },
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function currentStreak(profile: SocialProfile) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return profile.last_activity_on &&
    profile.last_activity_on >= dateKey(yesterday)
    ? profile.current_streak
    : 0;
}

function errorMessage(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Something went wrong.";
  if (
    message.includes("friend_requests") ||
    message.includes("profiles") ||
    message.includes("notifications")
  ) {
    return "Friends storage is not ready yet. Apply supabase/schema.sql in your Supabase project.";
  }
  return message;
}

function formatPercent(value: number | null) {
  return value === null ? "—" : `${Math.round(value)}%`;
}

/** Flips to true one frame after mount so width/offset transitions animate in. */
function useMounted() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return mounted;
}

/* ------------------------------ Pieces ------------------------------ */

function IconTile({
  icon: Icon,
  tone,
  className = "",
}: {
  icon: IconType;
  tone: Tone;
  className?: string;
}) {
  return (
    <span
      className={`flex size-8 shrink-0 items-center justify-center rounded-[10px] ${TONE[tone].tile} ${className}`}
    >
      <Icon className="size-[18px]" />
    </span>
  );
}

function StatTile({
  icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: IconType;
  tone: Tone;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-card p-3.5 dark:shadow-sm ring-1 ring-foreground/[0.06] sm:rounded-3xl sm:p-4">
      <IconTile icon={icon} tone={tone} />
      <p className="mt-3 truncate text-xl font-semibold leading-none tracking-tight tabular-nums sm:text-2xl">
        {value}
      </p>
      <p className="mt-1.5 text-sm font-medium">{label}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const mounted = useMounted();
  const size = 132;
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min(100, Math.max(0, value));
  const offset = circumference * (1 - (mounted ? percent : 0) / 100);

  return (
    <div
      className="relative mx-auto"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Overall score ${Math.round(percent)} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-primary transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold leading-none tracking-tight tabular-nums">
          {Math.round(percent)}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">Overall</span>
      </div>
    </div>
  );
}

function ScoreRow({
  icon,
  tone,
  label,
  value,
}: {
  icon: IconType;
  tone: Tone;
  label: string;
  value: number | null;
}) {
  const mounted = useMounted();
  const percent = Math.min(100, Math.max(0, value ?? 0));

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <IconTile icon={icon} tone={tone} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">{label}</span>
          <span className="font-semibold tabular-nums">
            {formatPercent(value)}
          </span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none ${TONE[tone].bar}`}
            style={{ width: mounted ? `${percent}%` : "0%" }}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Page ------------------------------ */

export default function FriendProfileClientPage({
  userId: targetId,
}: {
  userId: string;
}) {
  const { user, authReady } = useAuth();
  const viewerId = user?.id;
  const [profile, setProfile] = React.useState<SocialProfile | null>(null);
  const [relation, setRelation] = React.useState<Relation>("none");
  const [score, setScore] = React.useState<FriendLeaderboardScore | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const signedOut = authReady && !viewerId;

  React.useEffect(() => {
    let active = true;
    if (!viewerId) return;

    void Promise.all([
      loadSocialProfile(targetId),
      loadFriendOverview(viewerId),
      loadFriendLeaderboardScores().catch(() => [] as FriendLeaderboardScore[]),
    ])
      .then(([profileData, overview, scores]) => {
        if (!active) return;
        setProfile(profileData);

        const isUser = (request: { profile: SocialProfile }) =>
          request.profile.user_id === targetId;
        const nextRelation: Relation =
          targetId === viewerId
            ? "self"
            : overview.friends.some(isUser)
              ? "friend"
              : overview.incoming.some(isUser)
                ? "incoming"
                : overview.outgoing.some(isUser)
                  ? "outgoing"
                  : "none";

        setRelation(nextRelation);
        setScore(scores.find((entry) => entry.user_id === targetId) ?? null);
        setError(null);
      })
      .catch((loadFailure: unknown) => {
        if (active) setError(errorMessage(loadFailure));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [targetId, viewerId]);

  const RelationIcon = RELATION_ICON[relation];
  const hasScore = score !== null && score.score !== null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 py-4 pb-10 sm:gap-5 sm:py-6">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={<Link href="/friends" />}
        className="-ml-1 w-fit rounded-full bg-muted/60 px-3 text-muted-foreground backdrop-blur hover:bg-muted"
      >
        <ArrowLeft />
        Friends
      </Button>

      {signedOut ? (
        <div className="rounded-3xl bg-card p-6 text-center text-sm text-muted-foreground dark:shadow-sm ring-1 ring-foreground/[0.06]">
          Sign in to view friend profiles.
        </div>
      ) : loading ? (
        <div
          className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start"
          role="status"
          aria-label="Loading profile"
        >
          <div className="space-y-4 sm:space-y-5">
            <div className="flex flex-col items-center gap-3 rounded-3xl bg-card p-6 dark:shadow-sm ring-1 ring-foreground/[0.06]">
              <Skeleton className="size-20 rounded-full sm:size-24" />
              <Skeleton className="h-6 w-44 max-w-full" />
              <Skeleton className="h-4 w-28 max-w-full" />
              <Skeleton className="h-4 w-56 max-w-full" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-32 rounded-2xl sm:rounded-3xl" />
              ))}
            </div>
          </div>
          <Skeleton className="h-72 rounded-3xl" />
          <span className="sr-only">Loading profile</span>
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-3xl bg-card p-6 text-sm text-destructive dark:shadow-sm ring-1 ring-destructive/20"
        >
          {error}
        </div>
      ) : !profile ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl bg-card p-10 text-center dark:shadow-sm ring-1 ring-foreground/[0.06]">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <UserRound className="size-6" />
          </span>
          <p className="mt-1 text-base font-semibold">Profile not found</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            This person does not have a Taskito profile, or it is no longer
            available.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
          <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-3xl bg-card dark:shadow-sm ring-1 ring-foreground/[0.06]">
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/20 via-primary/5 to-transparent"
            />
            <div className="relative flex flex-col items-center px-5 pb-6 pt-8 text-center sm:px-6">
              <Avatar className="size-20 bg-primary/10 text-3xl font-semibold text-primary ring-4 ring-card sm:size-24 sm:text-4xl dark:shadow-lg">
                <AvatarFallback>
                  {initials(profile.display_name) || "U"}
                </AvatarFallback>
              </Avatar>

              <h1 className="mt-4 max-w-full break-words font-heading text-2xl font-semibold leading-tight tracking-tight">
                {profile.display_name}
              </h1>
              <p className="max-w-full truncate text-sm text-muted-foreground">
                @{profile.username}
              </p>

              <span
                className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${RELATION_STYLE[relation]}`}
              >
                {RelationIcon && <RelationIcon className="size-3.5" />}
                {RELATION_LABEL[relation]}
              </span>

              {profile.bio && (
                <p className="mt-4 max-w-md break-words text-sm leading-relaxed text-foreground/80">
                  {profile.bio}
                </p>
              )}
            </div>
          </section>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              icon={Flame}
              tone="orange"
              label="Streak"
              value={currentStreak(profile)}
              hint="Days, current"
            />
            <StatTile
              icon={Medal}
              tone="amber"
              label="Best"
              value={profile.longest_streak}
              hint="Days, longest"
            />
            <StatTile
              icon={CalendarClock}
              tone="sky"
              label="Active"
              value={
                profile.last_activity_on
                  ? shortLabel(profile.last_activity_on)
                  : "—"
              }
              hint="Last activity"
            />
            <StatTile
              icon={TrendingUp}
              tone="emerald"
              label="Score"
              value={hasScore ? score.score!.toFixed(1) : "—"}
              hint="Leaderboard"
            />
          </div>

          {relation === "self" && (
            <Button
              nativeButton={false}
              render={<Link href="/profile" />}
              className="h-12 w-full rounded-2xl text-base"
            >
              <UserRound />
              Open your profile
            </Button>
          )}
          </div>

          {/* Performance */}
          <section className="min-w-0 space-y-2 lg:sticky lg:top-6">
            <div className="px-2">
              <h2 className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight">
                <Target className="size-4 text-primary" />
                Recent performance
              </h2>
              <p className="text-xs text-muted-foreground">
                Based on task activity from the last 30 days.
              </p>
            </div>

            {hasScore ? (
              <div className="overflow-hidden rounded-3xl bg-card dark:shadow-sm ring-1 ring-foreground/[0.06]">
                <div className="px-4 pb-4 pt-6">
                  <ScoreRing value={score.score ?? 0} />
                </div>
                <div className="divide-y divide-border/60 border-t border-border/60">
                  <ScoreRow
                    icon={Target}
                    tone="violet"
                    label="Completion"
                    value={score.completion_rate}
                  />
                  <ScoreRow
                    icon={Flame}
                    tone="orange"
                    label="Consistency"
                    value={score.consistency_rate}
                  />
                  <ScoreRow
                    icon={CalendarClock}
                    tone="sky"
                    label="On time"
                    value={score.on_time_rate}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 rounded-3xl bg-card p-8 text-center dark:shadow-sm ring-1 ring-foreground/[0.06]">
                <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <TrendingUp className="size-5" />
                </span>
                <p className="mt-2 text-sm font-medium">No score yet</p>
                <p className="text-sm text-muted-foreground">
                  Not enough recent activity to score yet.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}