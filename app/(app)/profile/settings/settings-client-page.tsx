"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  Check,
  CircleCheck,
  Database,
  KeyRound,
  Monitor,
  Moon,
  Palette,
  Pencil,
  Sun,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase/client";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FadeIn } from "@/components/motion-fade";
import { useMounted } from "@/lib/use-local-storage";
import { Skeleton } from "@/components/ui/skeleton";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function SettingsCard({
  title,
  description,
  onEdit,
  children,
}: {
  title: string;
  description: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        {onEdit && (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={`Edit ${title.toLowerCase()}`}
            title={`Edit ${title.toLowerCase()}`}
            onClick={onEdit}
          >
            <Pencil />
          </Button>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  const [profileOpen, setProfileOpen] = React.useState(false);
  const [passwordOpen, setPasswordOpen] = React.useState(false);
  const [appearanceOpen, setAppearanceOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [clearDataOpen, setClearDataOpen] = React.useState(false);
  const [name, setName] = React.useState(user?.name ?? "");
  const [bio, setBio] = React.useState(user?.bio ?? "");
  const [clearDataConfirmation, setClearDataConfirmation] = React.useState("");
  const [clearDataStage, setClearDataStage] = React.useState<
    "confirm" | "deleting" | "success" | "error"
  >("confirm");
  const [clearDataError, setClearDataError] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [savingPassword, setSavingPassword] = React.useState(false);
  const [dailyReminder, setDailyReminder] = React.useState(true);
  const [reminderTime, setReminderTime] = React.useState("09:00");
  const [streakAlerts, setStreakAlerts] = React.useState(true);
  const [weeklySummary, setWeeklySummary] = React.useState(false);
  const [productUpdates, setProductUpdates] = React.useState(false);

  function openProfileEditor() {
    setName(user?.name ?? "");
    setBio(user?.bio ?? "");
    setProfileOpen(true);
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfile({ name: name.trim(), bio });
      setProfileOpen(false);
      toast.success("Profile settings saved.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update your profile."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function clearAppData() {
    if (clearDataConfirmation !== "DELETE" || clearDataStage === "deleting") {
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setClearDataError("Supabase is not configured.");
      setClearDataStage("error");
      return;
    }

    setClearDataError("");
    setClearDataStage("deleting");
    try {
      const { error } = await supabase.rpc("clear_my_app_data", {
        p_confirmation: clearDataConfirmation,
      });
      if (error) throw error;

      setClearDataStage("success");
    } catch (error) {
      setClearDataError(
        error instanceof Error
          ? error.message
          : "Could not clear your app data. Please try again."
      );
      setClearDataStage("error");
    }
  }

  function closeClearDataDialog() {
    if (clearDataStage === "deleting") return;
    setClearDataOpen(false);
    setClearDataConfirmation("");
    setClearDataError("");
    setClearDataStage("confirm");
  }

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password should be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      toast.error("Supabase is not configured.");
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordOpen(false);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update your password."
      );
    } finally {
      setSavingPassword(false);
    }
  }

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 sm:gap-6">
      <FadeIn className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={<Link href="/profile" />}
          aria-label="Back to profile"
        >
          <ArrowLeft />
        </Button>
        <div>
          <h2 className="font-heading text-xl font-semibold tracking-tight">
            Settings
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage your account and preferences.
          </p>
        </div>
      </FadeIn>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <FadeIn delay={0.04} className="h-full">
          <SettingsCard
            title="Profile"
            description="Your personal details and public profile."
            onEdit={openProfileEditor}
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar size="lg" className="size-12 shrink-0">
                <AvatarFallback>
                  {initials(user?.name ?? "U")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user?.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.email}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {user?.bio || "Add a short bio about yourself."}
                </p>
              </div>
            </div>
          </SettingsCard>
        </FadeIn>

        <FadeIn delay={0.08} className="h-full">
          <SettingsCard
            title="Password & security"
            description="Change the password you use to sign in."
            onEdit={() => setPasswordOpen(true)}
          >
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex size-9 items-center justify-center rounded-xl bg-muted">
                <KeyRound className="size-4" />
              </span>
              <span>Update your account password</span>
            </div>
          </SettingsCard>
        </FadeIn>

        <FadeIn delay={0.12} className="h-full">
          <SettingsCard
            title="Appearance"
            description="Choose a theme and personalize your app."
            onEdit={() => setAppearanceOpen(true)}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Theme</span>
                <Badge variant="outline">
                  {mounted ? themeOptions.find((option) => option.value === theme)?.label ?? "System" : "System"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="size-7 shrink-0 rounded-full bg-primary shadow-[0_2px_8px_rgb(0_87_255_/_0.2)]"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Accent color</p>
                  <p className="text-xs text-muted-foreground">
                    Changing accent colors is coming soon.
                  </p>
                </div>
              </div>
            </div>
          </SettingsCard>
        </FadeIn>

        <FadeIn delay={0.16} className="h-full">
          <SettingsCard
            title="Notifications"
            description="Choose which reminders and updates you receive."
            onEdit={() => setNotificationsOpen(true)}
          >
            <div className="flex flex-col gap-2 text-sm">
              <p className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Daily reminder</span>
                <span className="font-medium">
                  {dailyReminder ? `On · ${reminderTime}` : "Off"}
                </span>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Streak alerts</span>
                <span className="font-medium">{streakAlerts ? "On" : "Off"}</span>
              </p>
            </div>
          </SettingsCard>
        </FadeIn>

        <FadeIn delay={0.2} className="h-full md:col-span-2">
          <SettingsCard
            title="Data & privacy"
            description="Manage the data stored in your account."
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Database className="size-4" />
                </span>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Permanently delete your tasks, completion history, check-ins,
                  friend connections, and notifications. Your account and profile
                  will remain.
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                className="shrink-0"
                onClick={() => setClearDataOpen(true)}
              >
                <Trash2 />
                Clear all data
              </Button>
            </div>
          </SettingsCard>
        </FadeIn>
      </div>

      <Dialog
        open={clearDataOpen}
        onOpenChange={(open) => {
          if (!open && clearDataStage === "deleting") return;
          setClearDataOpen(open);
          if (!open) {
            setClearDataConfirmation("");
            setClearDataError("");
            setClearDataStage("confirm");
          } else {
            setClearDataStage("confirm");
            setClearDataError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {clearDataStage === "deleting"
                ? "Deleting your data"
                : clearDataStage === "success"
                  ? "Your data has been cleared"
                  : clearDataStage === "error"
                    ? "Couldn’t clear your data"
                    : "Clear all app data?"}
            </DialogTitle>
            <DialogDescription>
              {clearDataStage === "deleting"
                ? "Please keep this window open while we securely clear your data."
                : clearDataStage === "success"
                  ? "Your account and profile are still here. Your app data was removed successfully."
                  : clearDataStage === "error"
                    ? "Your data wasn’t cleared. The operation was rolled back; please try again."
                    : "This permanently deletes your tasks, completion history, check-ins, friend connections, and notifications. Your account and profile will not be deleted. This cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <AnimatePresence mode="wait" initial={false}>
            {clearDataStage === "deleting" ? (
              <motion.div
                key="deleting"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col items-center gap-3 py-5 text-center"
                role="status"
                aria-live="polite"
              >
                <Skeleton className="h-14 w-14 rounded-full" aria-hidden="true" />
                <Skeleton className="h-4 w-44" aria-hidden="true" />
                <p className="text-sm font-medium">Deleting your app data…</p>
              </motion.div>
            ) : clearDataStage === "success" ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.92, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center gap-3 py-5 text-center"
                role="status"
                aria-live="polite"
              >
                <motion.span
                  initial={{ scale: 0.6, rotate: -12 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                >
                  <CircleCheck className="size-8" />
                </motion.span>
                <p className="text-sm font-medium">
                  All your app data has been cleared.
                </p>
                <DialogFooter className="w-full">
                  <Button type="button" onClick={closeClearDataDialog}>
                    Done
                  </Button>
                </DialogFooter>
              </motion.div>
            ) : (
              <motion.div
                key={clearDataStage}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-4"
              >
                {clearDataStage === "error" && (
                  <p
                    className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                    role="alert"
                  >
                    {clearDataError}
                  </p>
                )}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="clear-data-confirmation">
                    Type{" "}
                    <span className="font-semibold text-foreground">
                      DELETE
                    </span>{" "}
                    to confirm
                  </Label>
                  <Input
                    id="clear-data-confirmation"
                    value={clearDataConfirmation}
                    onChange={(event) =>
                      setClearDataConfirmation(event.target.value)
                    }
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeClearDataDialog}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void clearAppData()}
                    disabled={clearDataConfirmation !== "DELETE"}
                  >
                    {clearDataStage === "error" ? "Try again" : "Delete all data"}
                  </Button>
                </DialogFooter>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
              Update your name and bio. Your email address is managed by your
              sign-in provider.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveProfile} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settings-name">Name</Label>
              <Input
                id="settings-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settings-email">
                Email (managed by your sign-in provider)
              </Label>
              <Input
                id="settings-email"
                type="email"
                value={user?.email ?? ""}
                disabled
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="settings-bio">Bio</Label>
              <Textarea
                id="settings-bio"
                rows={3}
                placeholder="A short line about you..."
                value={bio}
                onChange={(event) => setBio(event.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setProfileOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Save profile"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Choose a new password with at least 6 characters.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={savePassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={6}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingPassword}>
                {savingPassword ? "Updating..." : "Update password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={appearanceOpen} onOpenChange={setAppearanceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appearance</DialogTitle>
            <DialogDescription>
              Choose the theme that works best for you.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const active = mounted && theme === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-xl border p-3 text-left transition-colors sm:min-h-24 sm:flex-col sm:justify-center sm:text-center",
                    active
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                      : "hover:bg-muted"
                  )}
                  aria-pressed={active}
                >
                  <Icon className="size-5" />
                  <span className="flex-1 text-sm font-medium sm:flex-none">
                    {option.label}
                  </span>
                  {active && <Check className="size-4 text-primary sm:hidden" />}
                </button>
              );
            })}
          </div>
          <div className="rounded-xl border bg-muted/40 p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Palette className="size-4 text-primary" />
              Accent color
              <Badge variant="secondary" className="ml-auto">
                Coming soon
              </Badge>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Accent color customization will be available in a future update.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notification preferences</DialogTitle>
            <DialogDescription>
              Select the reminders and updates you want to see.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col divide-y">
            <div className="flex min-h-14 items-center justify-between gap-3 py-3">
              <Label htmlFor="daily-reminder" className="text-sm font-medium">
                Daily reminder
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="time"
                  value={reminderTime}
                  onChange={(event) => setReminderTime(event.target.value)}
                  disabled={!dailyReminder}
                  className="w-28"
                  aria-label="Reminder time"
                />
                <Switch
                  id="daily-reminder"
                  checked={dailyReminder}
                  onCheckedChange={setDailyReminder}
                />
              </div>
            </div>
            <div className="flex min-h-14 items-center justify-between gap-3 py-3">
              <Label htmlFor="streak-alerts" className="text-sm font-medium">
                Streak alerts
              </Label>
              <Switch
                id="streak-alerts"
                checked={streakAlerts}
                onCheckedChange={setStreakAlerts}
              />
            </div>
            <div className="flex min-h-14 items-center justify-between gap-3 py-3">
              <Label htmlFor="weekly-summary" className="text-sm font-medium">
                Weekly summary
              </Label>
              <Switch
                id="weekly-summary"
                checked={weeklySummary}
                onCheckedChange={setWeeklySummary}
              />
            </div>
            <div className="flex min-h-14 items-center justify-between gap-3 py-3">
              <Label htmlFor="product-updates" className="text-sm font-medium">
                Product updates
              </Label>
              <Switch
                id="product-updates"
                checked={productUpdates}
                onCheckedChange={setProductUpdates}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNotificationsOpen(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setNotificationsOpen(false);
                toast.success("Notification preferences saved.");
              }}
            >
              Save preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
