"use client";

import * as React from "react";
import Link from "next/link";
import {
  Award,
  AtSign,
  BadgeCheck,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Eye,
  EyeOff,
  Flame,
  LifeBuoy,
  ListChecks,
  LockKeyhole,
  LoaderCircle,
  LogOut,
  Mountain,
  Pencil,
  Settings,
  Smile,
  Sunrise,
  Target,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProfileAvatar } from "@/components/profile-avatar";
import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";
import {
  clearLocalStorageStateCache,
  useTodayKey,
} from "@/lib/use-local-storage";
import type { DayEntry, Task, TaskCompletion } from "@/lib/types";
import { getActivityStreaks, getTaskActivity } from "@/lib/task-activity";
import {
  isTaskDataSchemaUnavailable,
  isSupabaseConfigured,
  loadCompletions,
  loadDayEntries,
  loadTasks,
} from "@/lib/supabase/task-data";
import { useSupabaseDataStatus } from "@/components/supabase-data-provider";
import {
  claimPermanentUsername,
  loadFriendLeaderboardScores,
  loadOwnUsername,
} from "@/lib/supabase/social-data";


const LINKS = [
  {
    href: "/profile/analytics",
    icon: BarChart3,
    title: "Analytics",
  },
  {
    href: "/profile/settings",
    icon: Settings,
    title: "Settings",
  },
  {
    href: "/profile/visibility",
    icon: Eye,
    title: "Visibility",
  },
  {
    href: "/streak",
    icon: Flame,
    title: "Streaks",
  },
  {
    href: "/days",
    icon: Smile,
    title: "Days",
  },
  {
    href: "/tasks",
    icon: ListChecks,
    title: "Tasks",
  },
];

export default function ProfilePage() {
  const { user, updateProfile, signOut } = useAuth();
  const { reportError, schemaUnavailable } = useSupabaseDataStatus();
  const today = useTodayKey();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [completions, setCompletions] = React.useState<TaskCompletion[]>([]);
  const [dayEntries, setDayEntries] = React.useState<DayEntry[]>([]);
  const [leaderboardScoreResult, setLeaderboardScoreResult] = React.useState<{
    userId: string;
    score: number | null;
  } | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [logoutOpen, setLogoutOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const logoutInProgress = React.useRef(false);
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [username, setUsername] = React.useState("");
  const [usernameLocked, setUsernameLocked] = React.useState(false);
  const [usernameOwnerId, setUsernameOwnerId] = React.useState<string | null>(null);
  const [savingUsername, setSavingUsername] = React.useState(false);
  const [name, setName] = React.useState(user?.name ?? "");
  const [bio, setBio] = React.useState(user?.bio ?? "");
  const [loadedUserId, setLoadedUserId] = React.useState<string | null>(null);
  const [showAchievementTips, setShowAchievementTips] = React.useState(false);
  const usernameLoaded = Boolean(user?.id && usernameOwnerId === user.id);

  React.useEffect(() => {
    if (!user?.id) return;

    let active = true;
    loadOwnUsername(user.id)
      .then((profileUsername) => {
        if (!active) return;
        setUsername(profileUsername.username);
        setUsernameLocked(profileUsername.username_locked);
        setUsernameOwnerId(user.id);
      })
      .catch((error: unknown) => {
        if (!active) return;
        reportError(error);
      });

    return () => {
      active = false;
    };
  }, [reportError, user?.id]);

  React.useEffect(() => {
    if (!user?.id) return;

    let active = true;
    const userId = user.id;
    loadFriendLeaderboardScores()
      .then((scores) => {
        if (!active) return;
        const ownScore = scores.find((score) => score.user_id === userId);
        setLeaderboardScoreResult({
          userId,
          score: ownScore?.score ?? null,
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        reportError(error);
        setLeaderboardScoreResult({ userId, score: null });
      });

    return () => {
      active = false;
    };
  }, [reportError, user?.id]);

  const activity = React.useMemo(
    () => getTaskActivity(tasks, completions, today),
    [tasks, completions, today]
  );
  const streaks = React.useMemo(
    () => getActivityStreaks(activity, today),
    [activity, today]
  );
  const completedToday = new Set(
    completions
      .filter((completion) => completion.completedOn === today)
      .map((completion) => completion.taskId)
  );
  const completionRate = tasks.length
    ? Math.round(
        (tasks.filter(
          (task) =>
            completedToday.has(task.id) ||
            Boolean(today && task.lastCompletedOn === today)
        ).length /
          tasks.length) *
          100
      )
    : 0;
  const earlyCompletions = activity.some((completion) => {
    const task = tasks.find((item) => item.id === completion.taskId);
    return task?.startTime && Number(task.startTime.slice(0, 2)) < 8;
  });
  const achievements = [
    {
      icon: Target,
      title: "First steps",
      unlocked: tasks.length > 0,
      tip: "Create your first task.",
    },
    {
      icon: Flame,
      title: "On fire",
      unlocked: streaks.current >= 7,
      tip: "Complete a task on 7 consecutive days.",
    },
    {
      icon: Sunrise,
      title: "Early bird",
      unlocked: earlyCompletions,
      tip: "Complete a task scheduled before 8:00 AM.",
    },
    {
      icon: BookOpen,
      title: "Journaler",
      unlocked: dayEntries.length > 0,
      tip: "Save a daily check-in on the Days page.",
    },
    {
      icon: Mountain,
      title: "Unstoppable",
      unlocked: streaks.longest >= 30,
      tip: "Build a 30-day consecutive activity streak.",
    },
    {
      icon: Award,
      title: "Centurion",
      unlocked: activity.length >= 100,
      tip: "Record 100 task completions.",
    },
  ];

  async function saveProfile() {
    if (!name.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfile({ name: name.trim(), bio });
      setEditOpen(false);
      toast.success("Profile updated.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update your profile."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveUsername() {
    const normalizedUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
      toast.error("Use 3–20 lowercase letters, numbers, or underscores.");
      return;
    }
    if (!user?.id || !usernameLoaded) {
      toast.error("Your profile is still loading. Try again shortly.");
      return;
    }
    if (usernameLocked) {
      toast.error("Your username is permanent and cannot be changed.");
      return;
    }

    setSavingUsername(true);
    try {
      const savedUsername = await claimPermanentUsername(normalizedUsername);
      setUsername(savedUsername);
      setUsernameLocked(true);
      toast.success(`@${savedUsername} is now your permanent username.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save your username.";
      if (message.includes("username_taken")) {
        toast.error("That username is already taken.");
      } else if (message.includes("username_permanent")) {
        toast.error("Your username is permanent and cannot be changed.");
        setUsernameLocked(true);
      } else if (message.includes("username_invalid")) {
        toast.error("Use 3–20 lowercase letters, numbers, or underscores.");
      } else {
        toast.error(message);
      }
    } finally {
      setSavingUsername(false);
    }
  }

  React.useEffect(() => {
    if (!isSupabaseConfigured || !user?.id || schemaUnavailable || isTaskDataSchemaUnavailable()) {
      return;
    }

    const userId = user.id;
    let active = true;
    Promise.all([
      loadTasks(userId),
      loadCompletions(userId),
      loadDayEntries(userId),
    ])
      .then(([remoteTasks, remoteCompletions, remoteDays]) => {
        if (!active) return;
        setTasks(remoteTasks);
        setCompletions(remoteCompletions);
        setDayEntries(remoteDays);
        setLoadedUserId(userId);
      })
      .catch((error: unknown) => {
        if (!active) return;
        reportError(error);
        setLoadedUserId(userId);
      });

    return () => {
      active = false;
    };
  }, [user?.id, setTasks, setCompletions, setDayEntries, reportError, schemaUnavailable]);

  if (
    isSupabaseConfigured &&
    user?.id &&
    loadedUserId !== user.id &&
    !schemaUnavailable &&
    !isTaskDataSchemaUnavailable()
  ) {
    return <PageLoadingSkeleton label="Loading your profile" variant="profile" />;
  }

  const joined = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : "this month";
  const currentUserId = user?.id;
  const leaderboardScore =
    leaderboardScoreResult &&
    leaderboardScoreResult.userId === currentUserId
      ? leaderboardScoreResult.score
      : null;
  const leaderboardScoreLoading = Boolean(
    currentUserId && leaderboardScoreResult?.userId !== currentUserId
  );
  const scorePercentage =
    leaderboardScore === null
      ? null
      : Math.max(0, Math.min(100, leaderboardScore));

  async function handleLogout() {
    if (logoutInProgress.current) return;
    logoutInProgress.current = true;
    setLoggingOut(true);

    try {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 1500));
      await signOut();

      let storageClearFailed = false;
      try {
        window.localStorage.clear();
      } catch {
        storageClearFailed = true;
      }
      try {
        window.sessionStorage.clear();
      } catch {
        storageClearFailed = true;
      }
      clearLocalStorageStateCache();

      if (storageClearFailed) {
        toast.warning("You’re logged out, but this browser couldn’t clear all stored data.");
      }
      window.location.replace("/login");
    } catch (error) {
      logoutInProgress.current = false;
      setLoggingOut(false);
      toast.error(
        error instanceof Error
          ? `Couldn’t log out: ${error.message}`
          : "Couldn’t log out. Please try again."
      );
    }
  }

  return (
    <div className="-mx-3 -my-4 flex min-h-dvh w-[calc(100%+1.5rem)] min-w-0 flex-col bg-background sm:-mx-4 sm:-my-6 sm:w-[calc(100%+2rem)] md:-mx-6 md:-my-8 md:w-[calc(100%+3rem)] lg:-mx-8 lg:-my-6 lg:w-[calc(100%+4rem)]">
      <section
        aria-label="Profile details"
        className="flex flex-col items-center gap-4 border-b px-4 py-8 text-center sm:gap-5 sm:py-10"
      >
        <ProfileAvatar
          name={user?.name ?? "U"}
          className="size-40 sm:size-44"
        />
        <div className="flex w-full min-w-0 flex-col items-center">
          <h1 className="break-words font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            {user?.name || "Your profile"}
          </h1>
          <p className="mt-1 break-all text-sm text-muted-foreground">
            {user?.email}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {user?.bio?.trim() ||
              "Add a short bio to tell your circle a little about you."}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            {username && (
              <span className="inline-flex items-center gap-1.5">
                <AtSign className="size-3.5" />
                {username}
                {usernameLocked && (
                  <>
                    <LockKeyhole className="ml-1 size-3" />
                    Permanent
                  </>
                )}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              Member since {joined}
            </span>
            <span className="inline-flex items-center gap-1.5 text-primary">
              <Flame className="size-3.5" />
              {streaks.current} day streak
            </span>
          </div>
          <div className="mt-5 flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left">
            <div
              role={scorePercentage === null ? "img" : "progressbar"}
              aria-label={
                scorePercentage === null
                  ? "30-day leaderboard score is not available"
                  : `30-day leaderboard score: ${scorePercentage.toFixed(1)} out of 100`
              }
              aria-valuemin={scorePercentage === null ? undefined : 0}
              aria-valuemax={scorePercentage === null ? undefined : 100}
              aria-valuenow={scorePercentage ?? undefined}
              className="grid size-[76px] shrink-0 place-items-center rounded-full p-1"
              style={{
                background: `conic-gradient(var(--primary) ${scorePercentage ?? 0}%, var(--muted) 0)`,
              }}
            >
              <span className="grid size-full place-items-center rounded-full bg-card font-heading text-base font-semibold tabular-nums">
                {leaderboardScoreLoading
                  ? "…"
                  : scorePercentage === null
                    ? "—"
                    : scorePercentage.toFixed(1)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Leaderboard score</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {leaderboardScoreLoading
                  ? "Calculating your last 30 days."
                  : scorePercentage === null
                    ? "Complete scheduled tasks to establish your score."
                    : "Same weighted 30-day score used on the leaderboards."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="px-4 py-4 md:px-6 lg:px-8">
        <Button
          variant="outline"
          size="lg"
          className="w-full sm:ml-auto sm:w-auto"
          onClick={() => setEditOpen(true)}
        >
          <Pencil />
          Edit profile
        </Button>
      </div>

      <section
        aria-label="Profile activity summary"
        className="grid grid-cols-2 gap-3 border-b p-4 sm:grid-cols-4 sm:gap-4 md:px-6 lg:px-8"
      >
        {[
          {
            label: "Task completions",
            value: String(activity.length),
            detail: activity.length
              ? "Completed tasks recorded"
              : "Complete a task to start tracking",
            icon: ListChecks,
          },
          {
            label: "Current streak",
            value: `${streaks.current} days`,
            detail: streaks.current
              ? "Consecutive active days"
              : "Complete a task today to begin",
            icon: Flame,
          },
          {
            label: "Days logged",
            value: String(dayEntries.length),
            detail: dayEntries.length
              ? "Daily check-ins saved"
              : "Log your first day",
            icon: Smile,
          },
          {
            label: "Completion",
            value: `${completionRate}%`,
            detail: tasks.length
              ? "Tasks currently marked done"
              : "Add tasks to calculate progress",
            icon: BarChart3,
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex min-h-32 min-w-0 flex-col items-start gap-3 rounded-2xl border bg-card p-3 sm:p-4"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 w-full">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="mt-1 max-w-full truncate font-heading text-xl font-semibold leading-tight tabular-nums sm:text-2xl">
                  {stat.value}
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                  {stat.detail}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 px-4 py-5 sm:grid-cols-2 sm:gap-5 md:px-6 lg:px-8">
        <section className="min-w-0 py-2">
          <div className="mb-2 flex items-center gap-2">
            <Settings className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Shortcuts</h2>
          </div>
          <div className="overflow-hidden rounded-2xl border bg-card">
            {LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex min-h-14 items-center gap-3 border-b px-4 py-2 transition-colors last:border-b-0 hover:bg-muted/50"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 text-sm font-medium">
                    {link.title}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              );
            })}
            <Link
              href="/profile/help"
              className="group flex min-h-14 items-center gap-3 border-b px-4 py-2 transition-colors hover:bg-muted/50"
            >
              <LifeBuoy className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 text-sm font-medium">
                Help &amp; support
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
            <button
              type="button"
              onClick={() => setLogoutOpen(true)}
              className="group flex min-h-14 w-full items-center gap-3 border-b px-4 py-2 text-left text-destructive transition-colors hover:bg-destructive/5"
            >
              <LogOut className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 text-sm font-medium">Log out</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </div>
        </section>

        <section className="min-w-0 py-2">
          <div className="mb-2 flex items-center gap-2">
            <Trophy className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Achievements</h2>
            <Badge variant="secondary" className="ml-auto">
              {achievements.filter((achievement) => achievement.unlocked).length}
              {" / "}
              {achievements.length}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={
                showAchievementTips
                  ? "Hide achievement requirements"
                  : "Show achievement requirements"
              }
              aria-pressed={showAchievementTips}
              title={
                showAchievementTips
                  ? "Hide achievement requirements"
                  : "Show how to unlock achievements"
              }
              onClick={() => setShowAchievementTips((visible) => !visible)}
            >
              {showAchievementTips ? <EyeOff /> : <Eye />}
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {achievements.map((achievement) => {
              const Icon = achievement.icon;
              return (
                <div
                  key={achievement.title}
                  className="flex min-w-0 items-start gap-3 rounded-2xl border bg-card p-4"
                >
                  <Icon
                    className={`mt-0.5 size-4 shrink-0 ${
                      achievement.unlocked
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{achievement.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {showAchievementTips
                        ? achievement.tip
                        : achievement.unlocked
                          ? "Unlocked"
                          : "Locked"}
                    </p>
                  </div>
                  {achievement.unlocked ? (
                    <BadgeCheck
                      className="size-4 shrink-0 text-primary"
                      aria-label="Unlocked"
                    />
                  ) : (
                    <LockKeyhole
                      className="size-3.5 shrink-0 text-muted-foreground"
                      aria-label="Locked"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Edit profile dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription className="sr-only">
              Update how you appear across Taskflow.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-username">Username</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <AtSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="profile-username"
                    value={username}
                    onChange={(event) =>
                      setUsername(event.target.value.toLowerCase())
                    }
                    disabled={usernameLocked || savingUsername || !usernameLoaded}
                    placeholder="yourname"
                    maxLength={20}
                    autoComplete="username"
                    className="pl-9"
                    aria-describedby="profile-username-help"
                  />
                </div>
                <Button
                  type="button"
                  variant={usernameLocked ? "secondary" : "outline"}
                  className="w-full sm:w-auto"
                  onClick={() => void saveUsername()}
                  disabled={
                    usernameLocked ||
                    savingUsername ||
                    !usernameLoaded ||
                    !username.trim()
                  }
                >
                  {usernameLocked
                    ? "Permanent"
                    : savingUsername
                      ? "Saving…"
                      : "Set username"}
                </Button>
              </div>
              <p
                id="profile-username-help"
                className="text-xs leading-relaxed text-muted-foreground"
              >
                {usernameLocked
                  ? "Your username is permanent and can’t be changed."
                  : "Choose carefully: usernames are 3–20 lowercase letters, numbers, or underscores and can only be set once."}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-bio">Bio</Label>
              <Textarea
                id="profile-bio"
                rows={3}
                placeholder="A short line about you…"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void saveProfile()}
              disabled={savingProfile}
            >
              {savingProfile ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout dialog */}
      <Dialog
        open={logoutOpen}
        onOpenChange={(open) => {
          if (!loggingOut) setLogoutOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log out?</DialogTitle>
            <DialogDescription>
              Your account data will stay saved. This clears your session and
              stored data from this device.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLogoutOpen(false)}
              disabled={loggingOut}
            >
              Stay logged in
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-busy={loggingOut}
            >
              {loggingOut ? (
                <>
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                  Logging out…
                </>
              ) : (
                <>
                  <LogOut aria-hidden="true" />
                  Log out
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
