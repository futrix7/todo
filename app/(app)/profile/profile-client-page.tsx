"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Award,
  AtSign,
  BadgeCheck,
  BarChart3,
  BookOpen,
  ChevronRight,
  Eye,
  EyeOff,
  Flame,
  LifeBuoy,
  ListChecks,
  LockKeyhole,
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FadeIn, EASE } from "@/components/motion-fade";
import { PageLoadingSkeleton } from "@/components/page-loading-skeleton";
import { MetricCard } from "@/components/metric-card";
import { useTodayKey } from "@/lib/use-local-storage";
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

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

export default function ProfilePage() {
  const { user, updateProfile, signOut } = useAuth();
  const { reportError, schemaUnavailable } = useSupabaseDataStatus();
  const router = useRouter();
  const today = useTodayKey();
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [completions, setCompletions] = React.useState<TaskCompletion[]>([]);
  const [dayEntries, setDayEntries] = React.useState<DayEntry[]>([]);
  const [editOpen, setEditOpen] = React.useState(false);
  const [logoutOpen, setLogoutOpen] = React.useState(false);
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

  async function handleLogout() {
    try {
      await signOut();
      setLogoutOpen(false);
      router.replace("/login");
    } catch (error) {
      reportError(error);
    }
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <FadeIn>
        <Card className="overflow-hidden border-0 bg-primary text-primary-foreground shadow-sm shadow-primary/15">
          <CardContent className="flex items-start gap-3 p-4 sm:gap-4 sm:p-6">
            <Avatar size="lg" className="size-16 shrink-0 rounded-2xl border-2 border-white/25">
              <AvatarFallback className="rounded-2xl bg-white/15 text-lg text-white">
                {initials(user?.name ?? "U")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="max-w-full break-words font-heading text-lg font-semibold tracking-tight sm:text-xl">
                  {user?.name}
                </h2>
              </div>
              <p className="mt-0.5 truncate text-sm text-white/75">{user?.email}</p>
              {username && (
                <p className="mt-1 flex items-center gap-1 text-xs text-white/80">
                  <AtSign className="size-3" />
                  {username}
                  {usernameLocked && (
                    <span className="ml-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px]">
                      Permanent
                    </span>
                  )}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-10 shrink-0 text-white hover:bg-white/15 hover:text-white"
              onClick={() => setEditOpen(true)}
              aria-label="Edit profile"
            >
              <Pencil />
            </Button>
          </CardContent>
          <div className="flex items-center justify-between gap-2 border-t border-white/15 px-4 py-3 text-xs sm:px-6">
            <span className="truncate text-white/75">Member since {joined}</span>
            <span className="flex shrink-0 items-center gap-1.5 font-medium">
              <Flame className="size-3.5" /> {streaks.current} day streak
            </span>
          </div>
        </Card>
      </FadeIn>

      <section className="space-y-2.5" aria-labelledby="profile-activity-heading">
        <div className="flex items-center justify-between px-1">
          <h3 id="profile-activity-heading" className="font-heading text-base font-semibold">
            Your activity
          </h3>
        </div>
        <div className="grid grid-cols-2 items-stretch gap-2 sm:grid-cols-4 sm:gap-2.5">
          {[
            { label: "Task completions", value: String(activity.length), detail: activity.length ? "Completed tasks recorded" : "Complete a task to start tracking", icon: ListChecks },
            { label: "Current streak", value: `${streaks.current} days`, detail: streaks.current ? "Consecutive active days" : "Complete a task today to begin", icon: Flame },
            { label: "Days logged", value: String(dayEntries.length), detail: dayEntries.length ? "Daily check-ins saved" : "Log your first day", icon: Smile },
            { label: "Completion", value: `${completionRate}%`, detail: tasks.length ? "Tasks currently marked done" : "Add tasks to calculate progress", icon: BarChart3 },
          ].map((stat, i) => {
            return (
              <MetricCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                detail={stat.detail}
                icon={stat.icon}
                delay={i * 0.04}
                compact
              />
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <FadeIn delay={0.08} className="min-w-0 lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Shortcuts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-2xl border bg-muted/20 px-3 sm:px-4">
                {LINKS.map((link, i) => {
                  const Icon = link.icon;
                  return (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.04, ease: EASE }}
                      className="border-b last:border-b-0"
                    >
                      <Link
                        href={link.href}
                        className="group -mx-3 flex min-h-14 items-center gap-3 px-3 py-2.5 transition-colors duration-200 hover:bg-primary/5 active:bg-primary/10 sm:-mx-4 sm:px-4"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-medium">
                          {link.title}
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
                      </Link>
                    </motion.div>
                  );
                })}
                <div className="border-b">
                  <Link
                    href="/profile/help"
                    className="group -mx-3 flex min-h-14 items-center gap-3 px-3 py-2.5 transition-colors duration-200 hover:bg-primary/5 active:bg-primary/10 sm:-mx-4 sm:px-4"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-105">
                      <LifeBuoy className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium">
                      Help & support
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => setLogoutOpen(true)}
                  className="group -mx-3 flex min-h-14 w-[calc(100%+1.5rem)] items-center gap-3 px-3 py-2.5 text-left transition-colors duration-200 hover:bg-destructive/5 active:bg-destructive/10 sm:-mx-4 sm:w-[calc(100%+2rem)] sm:px-4"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                    <LogOut className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium text-destructive">
                    Log out
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.14} className="min-w-0">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="size-4 text-primary" /> Achievements
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {achievements.filter((achievement) => achievement.unlocked).length} / {achievements.length}
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
                  onClick={() =>
                    setShowAchievementTips((visible) => !visible)
                  }
                >
                  {showAchievementTips ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {achievements.map((a, i) => {
                const Icon = a.icon;
                return (
                  <motion.div
                    key={a.title}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35, delay: i * 0.04, ease: EASE }}
                    className={`relative flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border p-2.5 text-center transition-colors sm:min-h-32 sm:p-3 ${
                      a.unlocked
                        ? "border-primary/20 bg-primary/[0.04] shadow-sm shadow-primary/5"
                        : "bg-muted/30 text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`flex size-11 items-center justify-center rounded-2xl border shadow-sm sm:size-12 ${
                        a.unlocked
                          ? "border-primary/20 bg-background"
                          : "border-border bg-muted"
                      }`}
                      aria-hidden
                    >
                      <Icon
                        className={`size-5 ${
                          a.unlocked ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                    </span>
                    <span className="text-xs font-semibold">{a.title}</span>
                    <span
                      className={`text-[10px] font-medium uppercase tracking-wide ${
                        a.unlocked ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {a.unlocked ? "Unlocked" : "Locked"}
                    </span>
                    {showAchievementTips && (
                      <span className="text-[11px] leading-4 text-muted-foreground">
                        {a.tip}
                      </span>
                    )}
                    <span
                      className={`absolute right-2 top-2 ${
                        a.unlocked ? "text-primary" : "text-muted-foreground"
                      }`}
                      aria-hidden
                    >
                      {a.unlocked ? (
                        <BadgeCheck className="size-4" />
                      ) : (
                        <LockKeyhole className="size-3.5" />
                      )}
                    </span>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        </FadeIn>
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
              <div className="flex gap-2">
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
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log out of Taskflow?</DialogTitle>
            <DialogDescription className="sr-only">
              You&apos;ll be signed out of your account on this device.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>
              Stay logged in
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut /> Log out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
