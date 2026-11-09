"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Check,
  Flame,
  Loader2,
  Search,
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
  loadSuggestedProfiles,
  removeFriendRequest,
  respondToFriendRequest,
  searchProfiles,
  sendFriendRequest,
  type FriendRequestWithProfile,
  type SocialProfile,
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
import { Input } from "@/components/ui/input";

interface FriendOverview {
  friends: FriendRequestWithProfile[];
  incoming: FriendRequestWithProfile[];
  outgoing: FriendRequestWithProfile[];
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
  const message = error instanceof Error ? error.message : "Something went wrong.";
  if (
    message.includes("friend_requests") ||
    message.includes("profiles") ||
    message.includes("notifications")
  ) {
    return "Friends storage is not ready yet. Run the social features SQL migration in your Supabase project.";
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

export default function FriendsClientPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const [overview, setOverview] = React.useState<FriendOverview | null>(null);
  const [suggested, setSuggested] = React.useState<SocialProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [addFriendsOpen, setAddFriendsOpen] = React.useState(false);
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

  const refresh = React.useCallback(async () => {
    if (!userId) return;
    const [friendData, suggestedProfiles] = await Promise.all([
      loadFriendOverview(userId),
      loadSuggestedProfiles(userId),
    ]);
    setOverview(friendData);
    setSuggested(suggestedProfiles);
    setLoadError(null);
  }, [userId]);

  React.useEffect(() => {
    let active = true;
    if (!userId) return;

    Promise.all([
      loadFriendOverview(userId),
      loadSuggestedProfiles(userId),
    ])
      .then(([friendData, suggestedProfiles]) => {
        if (!active) return;
        setOverview(friendData);
        setSuggested(suggestedProfiles);
        setLoadError(null);
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
  }, [userId]);

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
      toast.error(errorMessage(error));
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
  const searchTerm = search.trim().replace(/[%_]/g, "").slice(0, 40);
  const searching =
    searchTerm.length >= 2 &&
    searchResult?.term !== search.trim() &&
    searchError?.term !== search.trim();
  const results =
    searchResult?.term === search.trim() ? searchResult.profiles : [];
  const visibleSearchError =
    searchError?.term === search.trim() ? searchError.message : null;

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
            void runAction(
              profile.user_id,
              () => sendFriendRequest(userId, profile.user_id),
              `Friend request sent to ${profile.display_name}.`
            );
          }}
        >
          {busyId === profile.user_id ? (
            <Loader2 className="animate-spin" />
          ) : (
            <UserPlus />
          )}
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

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Friends
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? "Loading your friends…"
              : `${friends.length} ${friends.length === 1 ? "friend" : "friends"}`}
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/friends/leaderboard" />}
            className="flex-1 sm:flex-none"
          >
            Leaderboard
          </Button>
          <Button
            onClick={() => setAddFriendsOpen(true)}
            className="flex-1 sm:flex-none"
          >
            <UserPlus />
            Add friends
          </Button>
        </div>
      </header>

      {loadError && (
        <div role="alert" className="flex items-center justify-between gap-3 text-sm">
          <p className="text-destructive">{loadError}</p>
          <Button variant="outline" size="sm" onClick={() => void retryLoad()}>
            Try again
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading friends…
        </div>
      ) : friends.length ? (
        <div className="divide-y">
          {friends.map((friend) => (
            <div key={friend.id} className="py-5 first:pt-2">
              <ProfileRow
                profile={friend.profile}
                action={
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Remove ${friend.profile.display_name}`}
                    title="Remove friend"
                    disabled={busyId === friend.id}
                    onClick={() => setRemoveTarget(friend)}
                  >
                    {busyId === friend.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <UserMinus />
                    )}
                  </Button>
                }
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 px-4 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <UsersRound className="size-6" />
          </span>
          <div>
            <p className="font-medium">Your circle starts here</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Add a friend to see their profile and streaks here.
            </p>
          </div>
        </div>
      )}

      <Dialog
        open={addFriendsOpen}
        onOpenChange={(open) => {
          setAddFriendsOpen(open);
          if (!open) setSearch("");
        }}
      >
        <DialogContent className="mx-auto max-h-[85dvh] w-[95vw] max-w-[95vw] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add friends</DialogTitle>
            <DialogDescription>
              Find people on Taskflow and grow your circle.
            </DialogDescription>
          </DialogHeader>
          <div className="friends-scroll-region min-h-0 space-y-5 overflow-y-auto overscroll-contain pr-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or username"
                aria-label="Search users"
                className="h-10 pl-9"
              />
            </div>

            <section aria-label="People you may know">
              <h3 className="mb-1 text-sm font-medium">
                {searchTerm.length >= 2
                  ? "Search results"
                  : "People you may know"}
              </h3>
              {searchTerm.length >= 2 && searching ? (
                <div className="flex min-h-20 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Searching…
                </div>
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
              ) : (
                <p className="py-3 text-sm text-muted-foreground">
                  {searchTerm.length >= 2
                    ? "No users found. Try a different search."
                    : loading
                      ? "Loading people…"
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
                              size="icon-sm"
                              aria-label={`Accept ${request.profile.display_name}'s request`}
                              title="Accept request"
                              disabled={busyId === request.id || !userId}
                              onClick={() => {
                                if (!userId) return;
                                void runAction(
                                  request.id,
                                  () =>
                                    respondToFriendRequest(
                                      request.id,
                                      userId,
                                      "accepted"
                                    ),
                                  `You and ${request.profile.display_name} are now friends.`
                                );
                              }}
                            >
                              {busyId === request.id ? (
                                <Loader2 className="animate-spin" />
                              ) : (
                                <Check />
                              )}
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Decline ${request.profile.display_name}'s request`}
                              title="Decline request"
                              disabled={busyId === request.id || !userId}
                              onClick={() => {
                                if (!userId) return;
                                void runAction(
                                  request.id,
                                  () =>
                                    respondToFriendRequest(
                                      request.id,
                                      userId,
                                      "declined"
                                    ),
                                  "Friend request declined."
                                );
                              }}
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
                            {busyId === request.id ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <X />
                            )}
                          </Button>
                        }
                      />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

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
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
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
    </div>
  );
}
