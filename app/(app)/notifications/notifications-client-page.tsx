"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Bell,
  Check,
  CheckCheck,
  Loader2,
  Trash2,
  UsersRound,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import {
  deleteNotification,
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type SocialNotification,
} from "@/lib/supabase/social-data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FadeIn } from "@/components/motion-fade";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function notificationText(notification: SocialNotification) {
  const name = notification.actor?.display_name ?? "A Taskflow user";
  switch (notification.kind) {
    case "friend_request":
      return {
        title: `${name} sent you a friend request`,
        detail: "Connect and keep each other motivated.",
      };
    case "friend_accepted":
      return {
        title: `${name} accepted your friend request`,
        detail: "You’re connected. Go cheer on their streak.",
      };
    case "friend_request_declined":
      return {
        title: `${name} declined your friend request`,
        detail: "You can keep discovering other people in Friends.",
      };
  }
}

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  if (
    message.includes("friend_requests") ||
    message.includes("profiles") ||
    message.includes("notifications")
  ) {
    return "Notifications storage is not ready yet. Run the social features SQL migration in your Supabase project.";
  }
  return message;
}

export default function NotificationsClientPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const [notifications, setNotifications] = React.useState<SocialNotification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [markingAll, setMarkingAll] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (!userId) return;
    const data = await loadNotifications(userId);
    setNotifications(data);
    setLoadError(null);
  }, [userId]);

  React.useEffect(() => {
    let active = true;
    if (!userId) return;

    loadNotifications(userId)
      .then((data) => {
        if (!active) return;
        setNotifications(data);
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
    if (!userId) return;
    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible") return;
      void refresh().catch((error: unknown) => {
        setLoadError(errorMessage(error));
      });
    };

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const refreshTimer = window.setInterval(refreshWhenVisible, 30_000);
    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.clearInterval(refreshTimer);
    };
  }, [userId, refresh]);

  async function markRead(notification: SocialNotification) {
    if (!userId) return;
    setBusyId(notification.id);
    try {
      await markNotificationRead(notification.id, userId);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, read_at: new Date().toISOString() }
            : item
        )
      );
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    if (!userId) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(userId);
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => ({ ...item, read_at: item.read_at ?? readAt }))
      );
      toast.success("All notifications marked as read.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setMarkingAll(false);
    }
  }

  async function removeNotification(notification: SocialNotification) {
    if (!userId) return;
    setBusyId(notification.id);
    try {
      await deleteNotification(notification.id, userId);
      setNotifications((current) =>
        current.filter((item) => item.id !== notification.id)
      );
    } catch (error) {
      toast.error(errorMessage(error));
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

  const unreadCount = notifications.filter((item) => !item.read_at).length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 sm:gap-6">
      <FadeIn className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Bell className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
            Notifications
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Friend requests and updates from your circle.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void markAllRead()}
            disabled={markingAll}
          >
            {markingAll ? (
              <Loader2 className="animate-spin" />
            ) : (
              <CheckCheck />
            )}
            <span className="hidden sm:inline">Mark all read</span>
            <span className="sm:hidden">Read all</span>
          </Button>
        )}
      </FadeIn>

      {loadError && (
        <Card role="alert" className="border-destructive/30">
          <CardContent className="flex flex-col gap-3 p-4 text-sm">
            <p className="text-destructive">{loadError}</p>
            <Button variant="outline" size="sm" onClick={() => void retryLoad()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      <FadeIn delay={0.05}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Updates
              {unreadCount > 0 && <Badge>{unreadCount} new</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading notifications…
              </div>
            ) : notifications.length ? (
              <div className="divide-y">
                {notifications.map((notification) => {
                  const copy = notificationText(notification);
                  return (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-3 py-4 first:pt-0 last:pb-0 ${
                        notification.read_at ? "" : "rounded-lg bg-primary/[0.035] px-2"
                      }`}
                    >
                      <Avatar size="default" className="mt-0.5">
                        <AvatarFallback>
                          {notification.actor
                            ? initials(notification.actor.display_name) || "U"
                            : <UsersRound className="size-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{copy.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {copy.detail}
                        </p>
                        <p className="mt-1.5 text-[11px] text-muted-foreground">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                        {notification.kind === "friend_request" && (
                          <Button
                            size="sm"
                            variant="outline"
                            nativeButton={false}
                            render={<Link href="/friends#friend-requests" />}
                            className="mt-2"
                          >
                            View request
                          </Button>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {!notification.read_at && (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title="Mark as read"
                            aria-label="Mark notification as read"
                            disabled={busyId === notification.id}
                            onClick={() => void markRead(notification)}
                          >
                            {busyId === notification.id ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <Check />
                            )}
                          </Button>
                        )}
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          title="Delete notification"
                          aria-label="Delete notification"
                          disabled={busyId === notification.id}
                          onClick={() => void removeNotification(notification)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <Bell className="size-5" />
                </span>
                <p className="text-sm font-medium">You’re all caught up.</p>
                <p className="text-xs text-muted-foreground">
                  New friend requests and updates will show up here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
