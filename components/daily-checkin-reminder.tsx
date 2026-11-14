"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CircleCheck } from "lucide-react";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { MOODS } from "@/lib/task-options";
import { useAuth } from "@/lib/auth";
import { useSupabaseDataStatus } from "@/components/supabase-data-provider";
import { useTodayKey } from "@/lib/use-local-storage";
import {
  isSupabaseConfigured,
  isTaskDataSchemaUnavailable,
  loadDayEntries,
  saveDayEntry,
} from "@/lib/supabase/task-data";
import type { DayEntry } from "@/lib/types";

type MoodValue = (typeof MOODS)[number]["value"];

const SNOOZE_DURATION = 20 * 60 * 1000;
const REMINDER_HOUR = 19;

export function DailyCheckinReminder() {
  const { user } = useAuth();
  const { reportError, schemaUnavailable } = useSupabaseDataStatus();
  const today = useTodayKey();
  const isMobile = useIsMobile();
  const [mood, setMood] = React.useState<MoodValue | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [openForKey, setOpenForKey] = React.useState<string | null>(null);
  const [completedKey, setCompletedKey] = React.useState<string | null>(null);
  const [entryStatus, setEntryStatus] = React.useState<{
    key: string;
    checkedIn: boolean;
  } | null>(null);
  const snoozedUntilRef = React.useRef<{ key: string; at: number } | null>(null);
  const storageErrorReported = React.useRef(false);
  const completionTimer = React.useRef<number | null>(null);
  const currentKey = user?.id && today ? `${user.id}:${today}` : "";
  const checkedInToday =
    entryStatus?.key === currentKey ? entryStatus.checkedIn : null;
  const alreadyCheckedIn =
    checkedInToday === true &&
    openForKey === currentKey &&
    completedKey !== currentKey;
  const completed = completedKey === currentKey || alreadyCheckedIn;
  const open = Boolean(
    currentKey &&
      openForKey === currentKey &&
      (!checkedInToday || completed)
  );

  React.useEffect(() => {
    if (
      !user?.id ||
      !today ||
      !isSupabaseConfigured ||
      schemaUnavailable ||
      isTaskDataSchemaUnavailable()
    ) {
      return;
    }

    const userId = user.id;
    const key = `${userId}:${today}`;
    let active = true;
    let errorReported = false;
    let latestRequest = 0;

    async function refreshCheckin() {
      const request = ++latestRequest;
      try {
        const entries = await loadDayEntries(userId);
        if (!active || request !== latestRequest) return;
        errorReported = false;
        setEntryStatus({
          key,
          checkedIn: entries.some((entry) => entry.date === today),
        });
      } catch (error) {
        if (active && request === latestRequest && !errorReported) {
          errorReported = true;
          reportError(error);
        }
      }
    }

    void refreshCheckin();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshCheckin();
    };
    const refreshTimer = window.setInterval(refreshWhenVisible, 60_000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [reportError, schemaUnavailable, today, user?.id]);

  React.useEffect(() => {
    if (!currentKey || checkedInToday !== false) return;

    const storageKey = `taskflow:daily-checkin-snooze:${currentKey}`;
    function readSnoozeTime() {
      if (snoozedUntilRef.current?.key === currentKey) {
        return snoozedUntilRef.current.at;
      }
      try {
        const stored = window.localStorage.getItem(storageKey);
        if (!stored) return null;
        const timestamp = Number(stored);
        return Number.isFinite(timestamp) ? timestamp : null;
      } catch (error) {
        if (!storageErrorReported.current) {
          storageErrorReported.current = true;
          reportError(error);
        }
        return null;
      }
    }

    function openWhenDue() {
      const now = new Date();
      const reminderTime = new Date(now);
      reminderTime.setHours(REMINDER_HOUR, 0, 0, 0);
      const dueAt = readSnoozeTime() ?? reminderTime.getTime();
      if (Date.now() >= dueAt) setOpenForKey(currentKey);
    }

    openWhenDue();
    const timer = window.setInterval(openWhenDue, 15_000);
    return () => window.clearInterval(timer);
  }, [checkedInToday, currentKey, reportError]);

  React.useEffect(
    () => () => {
      if (completionTimer.current !== null) {
        window.clearTimeout(completionTimer.current);
      }
    },
    []
  );

  function snoozeReminder() {
    if (!currentKey || checkedInToday || completed) {
      setOpenForKey(null);
      return;
    }

    const snoozedUntil = Date.now() + SNOOZE_DURATION;
    const storageKey = `taskflow:daily-checkin-snooze:${currentKey}`;
    snoozedUntilRef.current = { key: currentKey, at: snoozedUntil };
    try {
      window.localStorage.setItem(storageKey, String(snoozedUntil));
      storageErrorReported.current = false;
    } catch (error) {
      if (!storageErrorReported.current) {
        storageErrorReported.current = true;
        reportError(error);
      }
    }
    setOpenForKey(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      if (currentKey) setOpenForKey(currentKey);
      return;
    }
    if (open) snoozeReminder();
  }

  async function submitCheckin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user?.id || !today || mood === null || saving) return;
    if (!isSupabaseConfigured) {
      reportError(new Error("Supabase must be configured to save a daily check-in."));
      return;
    }

    const entry: DayEntry = {
      id: `d-${today}`,
      date: today,
      mood,
      note: "",
      rating: mood,
      checkedInAt: new Date().toISOString(),
    };

    setSaving(true);
    try {
      await saveDayEntry(user.id, entry);
      setEntryStatus({ key: currentKey, checkedIn: true });
      setCompletedKey(currentKey);
      completionTimer.current = window.setTimeout(
        () => setOpenForKey(null),
        1600
      );
    } catch (error) {
      reportError(error);
    } finally {
      setSaving(false);
    }
  }

  const content = (
    <AnimatePresence mode="wait" initial={false}>
      {completed ? (
            <motion.div
              key="completed"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center"
            >
              <motion.span
                initial={{ scale: 0.5, rotate: -18 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 16 }}
                className="mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              >
                <CircleCheck className="size-10" strokeWidth={2.25} />
              </motion.span>
              <h2 className="text-lg font-semibold">
                {alreadyCheckedIn ? "Already checked in" : "Check-in complete"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {alreadyCheckedIn
                  ? "Sorry, you’ve already updated your mood for today. Your check-in is saved to your account. You can review or edit it on the Days page."
                  : "Thanks for checking in. Your day is saved."}
              </p>
              {alreadyCheckedIn && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-5"
                  onClick={() => setOpenForKey(null)}
                >
                  Close
                </Button>
              )}
            </motion.div>
          ) : (
            <motion.form
              key="checkin-form"
              onSubmit={submitCheckin}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex min-h-0 flex-col"
            >
              {isMobile ? (
                <DrawerHeader>
                  <DrawerTitle className="text-lg">How was your day?</DrawerTitle>
                  <DrawerDescription>
                    Choose the mood that best describes today.
                  </DrawerDescription>
                </DrawerHeader>
              ) : (
                <DialogHeader className="px-6 pb-4 pt-5">
                  <DialogTitle className="text-lg">How was your day?</DialogTitle>
                  <DialogDescription>
                    Choose the mood that best describes today.
                  </DialogDescription>
                </DialogHeader>
              )}
              <div className="grid grid-cols-5 gap-2 px-4 py-5 sm:px-6">
                {MOODS.map((option) => {
                  const selected = mood === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-label={option.label}
                      aria-pressed={selected}
                      onClick={() => setMood(option.value)}
                      className={`flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border px-1 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/30 hover:bg-muted/70"
                      }`}
                    >
                      <span className="text-2xl" aria-hidden="true">
                        {option.emoji}
                      </span>
                      <span className="text-[10px] font-medium sm:text-xs">
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              {isMobile ? (
                <DrawerFooter className="pt-0">
                  <Button type="submit" disabled={mood === null || saving}>
                    <Check />
                    {saving ? "Saving…" : "Submit check-in"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={snoozeReminder}
                  >
                    I’ll do it later
                  </Button>
                </DrawerFooter>
              ) : (
                <div className="px-6 pb-5">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={mood === null || saving}
                  >
                    <Check />
                    {saving ? "Saving…" : "Submit check-in"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-1 w-full"
                    disabled={saving}
                    onClick={snoozeReminder}
                  >
                    I’ll do it later
                  </Button>
                </div>
              )}
            </motion.form>
          )}
    </AnimatePresence>
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={handleOpenChange}
        swipeDirection="down"
      >
        <DrawerContent className="max-h-[min(90dvh,36rem)]">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-md gap-0 p-0 sm:max-w-md"
        showCloseButton={false}
      >
        {content}
      </DialogContent>
    </Dialog>
  );
}
