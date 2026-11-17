"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Check,
  ChevronRight,
  Eye,
  Flag,
  Flame,
  Inbox,
  Medal,
  MoreVertical,
  Search,
  Sprout,
  Trophy,
  UserMinus,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/lib/auth";
import { dateKey } from "@/lib/date-utils";
import {
  loadFriendOverview,
  loadFriendLeaderboardScores,
  loadSuggestedProfiles,
  removeFriendRequest,
  respondToFriendRequest,
  searchProfiles,
  sendFriendRequest,
  submitUserReport,
  type FriendRequestWithProfile,
  type FriendLeaderboardScore,
  type SocialProfile,
  type UserReportReason,
} from "@/lib/supabase/social-data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";

interface FriendOverview {
  friends: FriendRequestWithProfile[];
  incoming: FriendRequestWithProfile[];
  outgoing: FriendRequestWithProfile[];
}

interface RankedFriend {
  id: string;
  name: string;
  isYou: boolean;
  score: FriendLeaderboardScore;
}

const FRIEND_LIMIT = 20;
const REPORT_REASONS: { value: UserReportReason; label: string }[] = [
  { value: "spam", label: "Spam or scam" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "impersonation", label: "Impersonation" },
  { value: "other", label: "Something else" },
];

function isUserReportReason(value: string): value is UserReportReason {
  return REPORT_REASONS.some((reason) => reason.value === value);
}

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
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.includes("friend_limit_reached")
  ) {
    return "friend_limit_reached";
  }
  const message = error instanceof Error ? error.message : "Something went wrong.";
  if (
    message.includes("friend_requests") ||
    message.includes("profiles") ||
    message.includes("notifications") ||
    message.includes("user_reports")
  ) {
    return "Friends storage is not ready yet. Apply supabase/schema.sql in your Supabase project.";
  }
  return message;
}

function ProfileRow({
  profile,
  action,
}: {
  profile: SocialProfile;
  action: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar size="lg" className="bg-primary/10 text-primary">
        <AvatarFallback>{initials(profile.display_name) || "U"}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{profile.display_name}</p>
        <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
        {profile.bio && (
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {profile.bio}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Flame className="size-3 text-primary" />
            {currentStreak(profile)} day streak
          </Badge>
          <span className="text-[11px] text-muted-foreground">
            Best: {profile.longest_streak} days
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">{action}</div>
    </div>
  );
}

function ProfileRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-4" aria-hidden="true">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32 max-w-full" />
        <Skeleton className="h-3 w-24 max-w-full" />
        <Skeleton className="h-5 w-28 rounded-full" />
      </div>
      <Skeleton className="size-8 shrink-0 rounded-lg" />
    </div>
  );
}

function ProfileRowsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading people">
      {Array.from({ length: count }, (_, index) => (
        <ProfileRowSkeleton key={index} />
      ))}
      <span className="sr-only">Loading people</span>
    </div>
  );
}

const MOBILE_RANK_STYLES = [
  "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-300",
  "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-400/30 dark:bg-slate-400/15 dark:text-slate-300",
  "border-orange-300 bg-orange-100 text-orange-900 dark:border-orange-400/30 dark:bg-orange-400/15 dark:text-orange-300",
];

function MobileFriendCard({
  friend,
  score,
  busy,
  onReport,
  onRemove,
}: {
  friend: FriendRequestWithProfile;
  score: number | null | undefined;
  busy: boolean;
  onReport: (friend: FriendRequestWithProfile) => void;
  onRemove: (friend: FriendRequestWithProfile) => void;
}) {
  const profile = friend.profile;
  const streak = currentStreak(profile);

  return (
    <li className="flex items-center rounded-2xl border border-border/70 bg-card pr-1 shadow-[0_1px_2px_rgb(0_0_0/0.03)]">
      <Link
        href={`/friends/${profile.user_id}`}
        aria-label={`View ${profile.display_name}'s profile`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-3 pr-1 transition-colors active:bg-muted/60"
      >
        <span className="relative shrink-0">
          <Avatar
            size="lg"
            className="size-12 bg-primary/10 text-base font-semibold text-primary"
          >
            <AvatarFallback>{initials(profile.display_name) || "U"}</AvatarFallback>
          </Avatar>
          {streak > 0 && (
            <span className="absolute -bottom-1 -right-1 inline-flex items-center gap-0.5 rounded-full bg-background px-1.5 py-0.5 text-[10px] font-semibold text-primary ring-1 ring-border">
              <Flame className="size-2.5" />
              {streak}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold leading-tight">
            {profile.display_name}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            @{profile.username}
          </span>
          <span className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span
              className={
                streak > 0
                  ? "inline-flex items-center gap-1 font-medium text-primary"
                  : "inline-flex items-center gap-1"
              }
            >
              <Flame className="size-3" />
              {streak}d streak
            </span>
            <span className="size-1 rounded-full bg-border" aria-hidden="true" />
            <span>Best {profile.longest_streak}d</span>
          </span>
        </span>
        {typeof score === "number" && (
          <span className="shrink-0 text-right">
            <span className="block text-sm font-semibold leading-none tabular-nums">
              {score.toFixed(1)}
            </span>
            <span className="mt-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Score
            </span>
          </span>
        )}
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/70" />
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`More options for ${profile.display_name}`}
              className="size-9 shrink-0 rounded-xl text-muted-foreground"
              disabled={busy}
            />
          }
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onReport(friend)}>
            <Flag /> Report
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => onRemove(friend)}>
            <UserMinus /> Remove friend
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

function MobileFriendCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3">
      <Skeleton className="size-12 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-32 max-w-full" />
        <Skeleton className="h-3 w-24 max-w-full" />
        <Skeleton className="h-3 w-36 max-w-full" />
      </div>
      <Skeleton className="size-8 shrink-0 rounded-xl" />
    </div>
  );
}

export default function FriendsClientPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const userId = user?.id;
  const [overview, setOverview] = React.useState<FriendOverview | null>(null);
  const [suggested, setSuggested] = React.useState<SocialProfile[]>([]);
  const [scores, setScores] = React.useState<FriendLeaderboardScore[]>([]);
  const [scoreLoading, setScoreLoading] = React.useState(true);
  const [scoreError, setScoreError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [addFriendsOpen, setAddFriendsOpen] = React.useState(false);
  const [friendLimitOpen, setFriendLimitOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [searchResult, setSearchResult] = React.useState<{
    term: string;
    profiles: SocialProfile[];
  } | null>(null);
  const [searchError, setSearchError] = React.useState<{
    term: string;
    message: string;
  } | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [removeTarget, setRemoveTarget] =
    React.useState<FriendRequestWithProfile | null>(null);
  const [reportTarget, setReportTarget] =
    React.useState<FriendRequestWithProfile | null>(null);
  const [reportReason, setReportReason] =
    React.useState<UserReportReason>("spam");
  const [reportDetails, setReportDetails] = React.useState("");
  const [submittingReport, setSubmittingReport] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!userId) return;
    const [friendData, suggestedProfiles] = await Promise.all([
      loadFriendOverview(userId),
      loadSuggestedProfiles(userId),
    ]);
    setOverview(friendData);
    setSuggested(suggestedProfiles);
    setLoadError(null);
    setScoreLoading(true);
    try {
      setScores(await loadFriendLeaderboardScores());
      setScoreError(null);
    } catch (error) {
      setScoreError(errorMessage(error));
    } finally {
      setScoreLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    let active = true;
    if (!userId) return;

    void Promise.resolve()
      .then(() => (active ? refresh() : undefined))
      .then(() => {
        if (active) setLoadError(null);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(errorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refresh, userId]);

  React.useEffect(() => {
    const openFriendRequests = () => {
      if (window.location.hash === "#friend-requests") {
        setAddFriendsOpen(true);
      }
    };

    openFriendRequests();
    window.addEventListener("hashchange", openFriendRequests);
    return () => window.removeEventListener("hashchange", openFriendRequests);
  }, []);

  React.useEffect(() => {
    const term = search.trim();
    if (!userId || term.replace(/[%_]/g, "").length < 2) return;

    let active = true;
    const timer = window.setTimeout(() => {
      searchProfiles(userId, term)
        .then((profiles) => {
          if (active) setSearchResult({ term, profiles });
        })
        .catch((error: unknown) => {
          if (active) setSearchError({ term, message: errorMessage(error) });
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search, userId]);

  async function runAction(
    id: string,
    action: () => Promise<void>,
    success: string
  ) {
    setBusyId(id);
    try {
      await action();
      await refresh();
      toast.success(success);
      return true;
    } catch (error) {
      const message = errorMessage(error);
      if (message.includes("friend_limit_reached")) {
        setFriendLimitOpen(true);
      } else {
        toast.error(message);
      }
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function retryLoad() {
    try {
      await refresh();
    } catch (error) {
      setLoadError(errorMessage(error));
    }
  }

  const friends = overview?.friends ?? [];
  const friendIds = new Set(friends.map((friend) => friend.profile.user_id));
  const incomingIds = new Set(
    overview?.incoming.map((request) => request.profile.user_id)
  );
  const outgoingIds = new Set(
    overview?.outgoing.map((request) => request.profile.user_id)
  );
  const scoreByUserId = new Map(scores.map((score) => [score.user_id, score]));
  const ownScore = userId ? scoreByUserId.get(userId) : undefined;
  const rankedFriends: RankedFriend[] = [
    ...(userId && ownScore
      ? [{
          id: userId,
          name: user?.name ?? "You",
          isYou: true,
          score: ownScore,
        }]
      : []),
    ...friends.flatMap((friend) => {
      const score = scoreByUserId.get(friend.profile.user_id);
      return score
        ? [{
            id: friend.profile.user_id,
            name: friend.profile.display_name,
            isYou: false,
            score,
          }]
        : [];
    }),
  ]
    .filter((participant) => participant.score.score !== null)
    .sort((a, b) =>
      (b.score.score ?? 0) - (a.score.score ?? 0) ||
      a.name.localeCompare(b.name)
    );
  const topThree = rankedFriends.slice(0, 3);
  const searchTerm = search.trim().replace(/[%_]/g, "").slice(0, 40);
  const searching =
    searchTerm.length >= 2 &&
    searchResult?.term !== search.trim() &&
    searchError?.term !== search.trim();
  const results =
    searchResult?.term === search.trim() ? searchResult.profiles : [];
  const visibleSearchError =
    searchError?.term === search.trim() ? searchError.message : null;

  const incomingCount = overview?.incoming.length ?? 0;
  const bestFriendStreak = friends.reduce(
    (best, friend) => Math.max(best, currentStreak(friend.profile)),
    0
  );
  const ownRank = userId
    ? rankedFriends.findIndex((participant) => participant.id === userId) + 1
    : 0;

  function acceptFriendRequest(request: FriendRequestWithProfile) {
    if (!userId) return;
    if (friends.length >= FRIEND_LIMIT) {
      setFriendLimitOpen(true);
      return;
    }
    void runAction(
      request.id,
      () => respondToFriendRequest(request.id, userId, "accepted"),
      `You and ${request.profile.display_name} are now friends.`
    );
  }

  function declineFriendRequest(request: FriendRequestWithProfile) {
    if (!userId) return;
    void runAction(
      request.id,
      () => respondToFriendRequest(request.id, userId, "declined"),
      "Friend request declined."
    );
  }

  function handleAddFriendsOpenChange(open: boolean) {
    setAddFriendsOpen(open);
    if (!open) setSearch("");
  }

  function showMobileRequests() {
    if (incomingCount > 0) {
      document
        .getElementById("mobile-friend-requests")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    handleAddFriendsOpenChange(true);
  }

  function openReportDialog(friend: FriendRequestWithProfile) {
    setReportTarget(friend);
    setReportReason("spam");
    setReportDetails("");
  }

  function renderSuggestedProfile(profile: SocialProfile) {
    const alreadyFriend = friendIds.has(profile.user_id);
    const requestIncoming = incomingIds.has(profile.user_id);
    const requestOutgoing = outgoingIds.has(profile.user_id);
    let action: React.ReactNode;

    if (alreadyFriend) {
      action = <Badge variant="secondary">Friend</Badge>;
    } else if (requestIncoming) {
      action = <Badge variant="outline">Request received</Badge>;
    } else if (requestOutgoing) {
      action = <Badge variant="outline">Requested</Badge>;
    } else {
      action = (
        <Button
          size="sm"
          disabled={!userId || busyId === profile.user_id}
          onClick={() => {
            if (!userId) return;
            if (friends.length >= FRIEND_LIMIT) {
              setFriendLimitOpen(true);
              return;
            }
            void runAction(
              profile.user_id,
              () => sendFriendRequest(userId, profile.user_id),
              `Friend request sent to ${profile.display_name}.`
            );
          }}
        >
          <UserPlus />
          Add
        </Button>
      );
    }

    return (
      <div key={profile.user_id} className="border-b py-4 last:border-b-0">
        <ProfileRow profile={profile} action={action} />
      </div>
    );
  }

  const addFriendsContent = (
    <>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or username"
          aria-label="Search users"
          className="h-11 rounded-xl pl-9 text-base sm:h-10 sm:text-sm"
        />
      </div>

      <section aria-label="People you may know">
        <h3 className="mb-1 text-sm font-medium">
          {searchTerm.length >= 2 ? "Search results" : "People you may know"}
        </h3>
        {searchTerm.length >= 2 && searching ? (
          <ProfileRowsSkeleton count={2} />
        ) : visibleSearchError ? (
          <p role="alert" className="py-3 text-sm text-destructive">
            {visibleSearchError}
          </p>
        ) : (searchTerm.length >= 2 ? results : suggested).length ? (
          <div className="divide-y">
            {(searchTerm.length >= 2 ? results : suggested).map(
              renderSuggestedProfile
            )}
          </div>
        ) : searchTerm.length < 2 && loading ? (
          <ProfileRowsSkeleton count={2} />
        ) : (
          <p className="py-3 text-sm text-muted-foreground">
            {searchTerm.length >= 2
              ? "No users found. Try a different search."
              : "No new people to suggest yet."}
          </p>
        )}
      </section>

      {overview?.incoming.length ? (
        <section id="friend-requests" aria-label="Incoming friend requests">
          <h3 className="mb-1 text-sm font-medium">
            Friend requests ({overview.incoming.length})
          </h3>
          <div className="divide-y">
            {overview.incoming.map((request) => (
              <div key={request.id} className="py-4">
                <ProfileRow
                  profile={request.profile}
                  action={
                    <>
                      <Button
                        size="icon-lg"
                        aria-label={`Accept ${request.profile.display_name}'s request`}
                        title="Accept request"
                        disabled={busyId === request.id || !userId}
                        onClick={() => acceptFriendRequest(request)}
                      >
                        <Check />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Decline ${request.profile.display_name}'s request`}
                        title="Decline request"
                        disabled={busyId === request.id || !userId}
                        onClick={() => declineFriendRequest(request)}
                      >
                        <X />
                      </Button>
                    </>
                  }
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {overview?.outgoing.length ? (
        <section aria-label="Sent friend requests">
          <h3 className="mb-1 text-sm font-medium">
            Sent requests ({overview.outgoing.length})
          </h3>
          <div className="divide-y">
            {overview.outgoing.map((request) => (
              <div key={request.id} className="py-4">
                <ProfileRow
                  profile={request.profile}
                  action={
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Cancel request to ${request.profile.display_name}`}
                      title="Cancel request"
                      disabled={busyId === request.id}
                      onClick={() =>
                        void runAction(
                          request.id,
                          () => removeFriendRequest(request.id),
                          "Friend request canceled."
                        )
                      }
                    >
                      <X />
                    </Button>
                  }
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );

  return (
    <div className="-mx-3 -my-4 flex min-h-dvh w-[calc(100%+1.5rem)] min-w-0 flex-col sm:-mx-4 sm:-my-6 sm:w-[calc(100%+2rem)] md:-mx-6 md:-my-8 md:w-[calc(100%+3rem)] lg:-mx-8 lg:-my-6 lg:w-[calc(100%+4rem)]">
      {/* Mobile header */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-3 px-4 pb-3 pt-4">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <UsersRound className="size-3.5" aria-hidden="true" />
              Your circle
            </p>
            <h1 className="mt-0.5 font-heading text-[26px] font-semibold leading-tight tracking-tight">
              Friends
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {loading
                ? "Loading your circle…"
                : `${friends.length} ${friends.length === 1 ? "friend" : "friends"} · ${incomingCount} ${incomingCount === 1 ? "request" : "requests"} pending`}
            </p>
          </div>
          <Link
            href="/friends/leaderboard"
            aria-label="Open leaderboard"
            className="grid size-11 shrink-0 place-items-center rounded-2xl border border-border/70 bg-card text-muted-foreground transition-colors active:bg-muted"
          >
            <Medal className="size-[18px]" />
          </Link>
          <Link
            href="/habits"
            aria-label="Open habits"
            className="grid size-11 shrink-0 place-items-center rounded-2xl border border-border/70 bg-card text-muted-foreground transition-colors active:bg-muted"
          >
            <Sprout className="size-[18px]" />
          </Link>
        </div>
        <div className="flex gap-2 px-4 pb-3">
          <Button
            className="h-11 flex-1 rounded-2xl text-sm"
            onClick={() => handleAddFriendsOpenChange(true)}
          >
            <UserPlus />
            Add friends
          </Button>
          <Button
            variant="outline"
            className="h-11 shrink-0 rounded-2xl px-3.5 text-sm"
            onClick={showMobileRequests}
            aria-label={
              incomingCount > 0
                ? `Open request inbox, ${incomingCount} pending`
                : "Open request inbox"
            }
          >
            <Inbox />
            Requests
            {incomingCount > 0 && (
              <Badge
                variant="default"
                className="ml-0.5 min-w-5 justify-center px-1 text-[10px]"
              >
                {incomingCount > 9 ? "9+" : incomingCount}
              </Badge>
            )}
          </Button>
        </div>
      </header>

      {/* Mobile content */}
      <main className="flex flex-col gap-5 px-4 pb-6 pt-4 md:hidden">
        {loadError && (
          <div
            role="alert"
            className="rounded-2xl border border-destructive/20 bg-destructive/5 p-3 text-sm"
          >
            <p className="text-destructive">{loadError}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 h-10 w-full rounded-xl"
              onClick={() => void retryLoad()}
            >
              Try again
            </Button>
          </div>
        )}

        <section
          aria-label="Friends overview"
          className="grid grid-cols-3 gap-2"
        >
          <div className="rounded-2xl border border-border/70 bg-card p-3">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UsersRound className="size-4" />
            </span>
            <p className="mt-2 font-heading text-xl font-semibold leading-none tabular-nums">
              {loading ? "—" : friends.length}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Friends</p>
          </div>
          <button
            type="button"
            onClick={showMobileRequests}
            className="rounded-2xl border border-border/70 bg-card p-3 text-left transition-colors active:bg-muted/60"
          >
            <span className="flex size-8 items-center justify-center rounded-xl bg-sky-500/12 text-sky-600 dark:text-sky-400">
              <Inbox className="size-4" />
            </span>
            <p className="mt-2 font-heading text-xl font-semibold leading-none tabular-nums">
              {loading ? "—" : incomingCount}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Requests</p>
          </button>
          <div className="rounded-2xl border border-border/70 bg-card p-3">
            <span className="flex size-8 items-center justify-center rounded-xl bg-orange-500/12 text-orange-600 dark:text-orange-400">
              <Flame className="size-4" />
            </span>
            <p className="mt-2 font-heading text-xl font-semibold leading-none tabular-nums">
              {loading ? "—" : `${bestFriendStreak}d`}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Top streak</p>
          </div>
        </section>

        {incomingCount > 0 && (
          <section
            id="mobile-friend-requests"
            aria-label="Friend requests"
            className="scroll-mt-36"
          >
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <h2 className="font-heading text-base font-semibold">
                  Friend requests
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Accept to start comparing streaks
                </p>
              </div>
              <Badge variant="secondary">{incomingCount}</Badge>
            </div>
            <ul className="space-y-2">
              {overview?.incoming.map((request) => (
                <li
                  key={request.id}
                  className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card p-2.5 pl-3"
                >
                  <Avatar
                    size="lg"
                    className="size-10 bg-primary/10 text-primary"
                  >
                    <AvatarFallback>
                      {initials(request.profile.display_name) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {request.profile.display_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{request.profile.username}
                    </p>
                  </div>
                  <Button
                    size="icon-sm"
                    className="size-10 rounded-xl"
                    aria-label={`Accept ${request.profile.display_name}'s request`}
                    disabled={busyId === request.id || !userId}
                    onClick={() => acceptFriendRequest(request)}
                  >
                    <Check />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="outline"
                    className="size-10 rounded-xl"
                    aria-label={`Decline ${request.profile.display_name}'s request`}
                    disabled={busyId === request.id || !userId}
                    onClick={() => declineFriendRequest(request)}
                  >
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="mobile-friends-heading">
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <h2
                id="mobile-friends-heading"
                className="font-heading text-base font-semibold"
              >
                Your circle
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Profiles, streaks, and scores
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-xl px-2.5 text-xs"
              onClick={() => handleAddFriendsOpenChange(true)}
            >
              <UserPlus />
              Add
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2" role="status" aria-label="Loading friends">
              {Array.from({ length: 3 }, (_, index) => (
                <MobileFriendCardSkeleton key={index} />
              ))}
              <span className="sr-only">Loading friends</span>
            </div>
          ) : friends.length ? (
            <ul className="space-y-2">
              {friends.map((friend) => (
                <MobileFriendCard
                  key={friend.id}
                  friend={friend}
                  score={scoreByUserId.get(friend.profile.user_id)?.score}
                  busy={busyId === friend.id}
                  onReport={openReportDialog}
                  onRemove={setRemoveTarget}
                />
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-6 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <UsersRound className="size-5" />
              </span>
              <p className="mt-3 font-semibold">Your circle starts here</p>
              <p className="mx-auto mt-1 max-w-[16rem] text-sm text-muted-foreground">
                Add a friend to compare streaks, scores, and stay accountable
                together.
              </p>
              <Button
                className="mt-4 h-11 w-full rounded-xl"
                onClick={() => handleAddFriendsOpenChange(true)}
              >
                <UserPlus />
                Add your first friend
              </Button>
            </div>
          )}
        </section>

        <section aria-labelledby="mobile-top-friends-heading">
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <h2
                id="mobile-top-friends-heading"
                className="font-heading text-base font-semibold"
              >
                Top friends
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Ranked by recent task activity
                {ownRank > 0 ? ` · You're #${ownRank}` : ""}
              </p>
            </div>
            <Link
              href="/friends/leaderboard"
              className="shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              See all
            </Link>
          </div>

          {scoreLoading ? (
            <div className="space-y-2" role="status" aria-label="Loading rankings">
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3"
                >
                  <Skeleton className="size-9 shrink-0 rounded-xl" />
                  <Skeleton className="size-6 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-28 max-w-full" />
                    <Skeleton className="h-1.5 w-full" />
                  </div>
                  <Skeleton className="h-4 w-9 shrink-0" />
                </div>
              ))}
              <span className="sr-only">Loading rankings</span>
            </div>
          ) : scoreError ? (
            <p
              role="alert"
              className="rounded-2xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {scoreError}
            </p>
          ) : topThree.length ? (
            <ol className="space-y-2">
              {topThree.map((participant, index) => (
                <li
                  key={participant.id}
                  className={`flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 ${
                    participant.isYou ? "ring-1 ring-primary/25" : ""
                  }`}
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-xl border text-xs font-bold tabular-nums ${MOBILE_RANK_STYLES[index]}`}
                  >
                    {index + 1}
                  </span>
                  <Avatar size="sm" className="bg-primary/10 text-primary">
                    <AvatarFallback>
                      {initials(participant.name) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="truncate text-sm font-semibold">
                        {participant.name}
                      </p>
                      {participant.isYou && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                          You
                        </Badge>
                      )}
                    </div>
                    <div
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-label={`${participant.name} leaderboard score`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(participant.score.score ?? 0)}
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.min(100, Math.max(0, participant.score.score ?? 0))}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {participant.score.score?.toFixed(1)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-5 text-center">
              <p className="text-sm font-medium">No rankings yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add friends and complete tasks to start comparing activity.
              </p>
            </div>
          )}

          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/friends/leaderboard" />}
            className="mt-3 h-11 w-full rounded-2xl"
          >
            <Medal />
            Full leaderboard
          </Button>
        </section>
      </main>

      {/* Desktop header */}
      <header className="hidden min-h-20 flex-wrap items-center justify-between gap-3 border-b px-3 pb-3 pt-5 sm:px-4 md:flex md:px-6 lg:px-8">
        <div>
          <h1 className="font-heading text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
            Friends
          </h1>
          <div className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            {loading ? (
              <Skeleton className="mt-1 h-4 w-28" />
            ) : (
              `${friends.length} ${friends.length === 1 ? "friend" : "friends"} in your circle`
            )}
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/habits" />}
          >
            <Trophy />
            Habits
          </Button>
          <Button
            size="sm"
            onClick={() => handleAddFriendsOpenChange(true)}
          >
            <UserPlus />
            Add friends
          </Button>
        </div>
      </header>

      {loadError && (
        <div
          role="alert"
          className="hidden items-center justify-between gap-3 border-b px-4 py-3 text-sm md:flex"
        >
          <p className="text-destructive">{loadError}</p>
          <Button variant="outline" size="sm" onClick={() => void retryLoad()}>
            Try again
          </Button>
        </div>
      )}

      <div className="hidden min-w-0 flex-1 md:grid xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,1fr)]">
        <section className="min-w-0 border-b xl:border-b-0 xl:border-r" aria-labelledby="friends-list-heading">
          <div className="border-b px-3 py-3 sm:px-4 md:px-6 lg:px-8">
            <h2 id="friends-list-heading" className="font-heading text-base font-semibold">
              Your friends
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Profiles and current streaks
            </p>
          </div>
          <div className="px-3 sm:px-4 md:px-6 lg:px-8">
            {loading ? (
              <div className="divide-y" role="status" aria-label="Loading friends">
                {Array.from({ length: 3 }, (_, index) => (
                  <ProfileRowSkeleton key={index} />
                ))}
                <span className="sr-only">Loading friends</span>
              </div>
            ) : friends.length ? (
              <div className="divide-y">
                {friends.map((friend) => (
                  <div key={friend.id} className="py-4">
                    <ProfileRow
                      profile={friend.profile}
                      action={
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            nativeButton={false}
                            render={
                              <Link
                                href={`/friends/${friend.profile.user_id}`}
                                aria-label={`View ${friend.profile.display_name}'s profile`}
                              />
                            }
                          >
                            <Eye />
                            <span className="hidden sm:inline">View</span>
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Report ${friend.profile.display_name}`}
                            title="Report friend"
                            onClick={() => {
                              setReportTarget(friend);
                              setReportReason("spam");
                              setReportDetails("");
                            }}
                          >
                            <Flag />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            aria-label={`Remove ${friend.profile.display_name}`}
                            title="Remove friend"
                            disabled={busyId === friend.id}
                            onClick={() => setRemoveTarget(friend)}
                          >
                            <UserMinus />
                            Remove
                          </Button>
                        </>
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-56 flex-col items-center justify-center gap-3 py-8 text-center">
                <UsersRound className="size-7 text-muted-foreground" />
                <div>
                  <p className="font-medium">Your circle starts here</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Add a friend to see their profile and streaks here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="min-w-0" aria-labelledby="top-friends-heading">
          <div className="flex items-center justify-between gap-3 border-b px-3 py-3 sm:px-4 md:px-6 lg:px-8">
            <div>
              <h2 id="top-friends-heading" className="font-heading text-base font-semibold">
                Top friends
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Ranked by recent task activity
              </p>
            </div>
            <Link
              href="/friends/leaderboard"
              className="shrink-0 text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              See all
            </Link>
          </div>
          <ol className="px-3 sm:px-4 md:px-6 lg:px-8">
            {scoreLoading ? (
              Array.from({ length: 3 }, (_, index) => (
                <li key={index} className="flex items-center gap-3 border-b py-4 last:border-0">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-5 w-12" />
                </li>
              ))
            ) : scoreError ? (
              <li className="py-5 text-sm text-destructive" role="alert">
                {scoreError}
              </li>
            ) : topThree.length ? (
              topThree.map((participant, index) => (
                <li key={participant.id} className="border-b py-4 last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={index === 0 ? "default" : "outline"}
                      className="min-w-11 justify-center"
                    >
                      {index === 0 ? "1st" : index === 1 ? "2nd" : "3rd"}
                    </Badge>
                    <Avatar size="sm" className="bg-primary/10 text-primary">
                      <AvatarFallback>
                        {initials(participant.name) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">
                      {participant.name}
                      {participant.isYou && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">You</span>
                      )}
                    </p>
                    <span className="text-sm font-semibold tabular-nums">
                      {participant.score.score?.toFixed(1)}
                    </span>
                  </div>
                  <div
                    className="ml-14 mt-2 h-1.5 overflow-hidden bg-muted"
                    role="progressbar"
                    aria-label={`${participant.name} leaderboard score`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(participant.score.score ?? 0)}
                  >
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.min(100, Math.max(0, participant.score.score ?? 0))}%` }}
                    />
                  </div>
                </li>
              ))
            ) : (
              <li className="py-8 text-sm text-muted-foreground">
                Add friends to start comparing recent activity.
              </li>
            )}
          </ol>
          <div className="border-t px-3 py-4 sm:px-4 md:px-6 lg:px-8">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/friends/leaderboard" />}
              className="w-full"
            >
              <Medal />
              View full leaderboard
            </Button>
          </div>
        </section>
      </div>

      {isMobile ? (
        <Drawer
          open={addFriendsOpen}
          onOpenChange={handleAddFriendsOpenChange}
          swipeDirection="down"
        >
          <DrawerContent
            style={
              {
                "--drawer-height": "90dvh",
                "--drawer-content-max-height": "90dvh",
              } as React.CSSProperties
            }
          >
            <DrawerHeader>
              <DrawerTitle>Add friends</DrawerTitle>
              <DrawerDescription>
                Find people on Taskito and grow your circle.
              </DrawerDescription>
            </DrawerHeader>
            <div className="friends-scroll-region min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 pb-6 pt-4">
              {addFriendsContent}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog
          open={addFriendsOpen}
          onOpenChange={handleAddFriendsOpenChange}
        >
          <DialogContent className="mx-auto flex max-h-[85dvh] w-[95vw] max-w-[95vw] flex-col overflow-hidden sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Add friends</DialogTitle>
              <DialogDescription>
                Find people on Taskito and grow your circle.
              </DialogDescription>
            </DialogHeader>
            <div className="friends-scroll-region min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pr-2">
              {addFriendsContent}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove friend?</DialogTitle>
            <DialogDescription>
              {removeTarget
                ? `${removeTarget.profile.display_name} will be removed from your friends. You can send a new request later.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setRemoveTarget(null)}
            >
              Cancel
            </Button>
            <Button
              size="lg"
              variant="destructive"
              disabled={!removeTarget || busyId === removeTarget.id}
              onClick={() => {
                if (!removeTarget) return;
                const target = removeTarget;
                void runAction(
                  target.id,
                  () => removeFriendRequest(target.id),
                  `${target.profile.display_name} was removed from your friends.`
                ).then((removed) => {
                  if (removed) setRemoveTarget(null);
                });
              }}
            >
              Remove friend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reportTarget)}
        onOpenChange={(open) => {
          if (!open && !submittingReport) setReportTarget(null);
        }}
      >
        <DialogContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!userId || !reportTarget || submittingReport) return;
              setSubmittingReport(true);
              void submitUserReport(
                userId,
                reportTarget.profile.user_id,
                reportReason,
                reportDetails
              )
                .then(() => {
                  toast.success("Report submitted. Thank you for letting us know.");
                  setReportTarget(null);
                  setReportDetails("");
                })
                .catch((error: unknown) => {
                  toast.error(errorMessage(error));
                })
                .finally(() => setSubmittingReport(false));
            }}
          >
            <DialogHeader>
              <DialogTitle>Report friend</DialogTitle>
              <DialogDescription>
                {reportTarget
                  ? `Tell us why you’re reporting ${reportTarget.profile.display_name}. Reports are private.`
                  : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="friend-report-reason">Reason</Label>
              <select
                id="friend-report-reason"
                required
                value={reportReason}
                onChange={(event) => {
                  if (isUserReportReason(event.target.value)) {
                    setReportReason(event.target.value);
                  }
                }}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {REPORT_REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="friend-report-details">
                Details{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="friend-report-details"
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
                maxLength={1000}
                placeholder="Share any details that may help us review this report."
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                size="lg"
                variant="outline"
                disabled={submittingReport}
                onClick={() => setReportTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="lg"
                variant="destructive"
                disabled={!reportTarget || !userId || submittingReport}
              >
                <Flag />
                {submittingReport ? "Submitting…" : "Submit report"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={friendLimitOpen} onOpenChange={setFriendLimitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Friend limit reached</DialogTitle>
            <DialogDescription>
              Your friends list is full for now. Remove someone from your circle
              before sending or accepting another request.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFriendLimitOpen(false)}>
              Close
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/friends#friends-list-heading" />}
              onClick={() => setFriendLimitOpen(false)}
            >
              Manage friends
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
