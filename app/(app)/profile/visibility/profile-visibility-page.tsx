"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import {
  loadChallengeStatusVisibility,
  saveChallengeStatusVisibility,
} from "@/lib/supabase/social-data";

export default function ProfileVisibilityPage() {
  const { user } = useAuth();
  const [visible, setVisible] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user?.id) return;

    let active = true;
    loadChallengeStatusVisibility(user.id)
      .then((isVisible) => {
        if (active) {
          setVisible(isVisible);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load your visibility setting.";
          setLoadError(message);
          toast.error(message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  async function updateVisibility(nextVisible: boolean) {
    if (visible === nextVisible || saving) return;

    setSaving(true);
    try {
      await saveChallengeStatusVisibility(nextVisible);
      setVisible(nextVisible);
      toast.success(
        nextVisible
          ? "Your joined challenge status is visible."
          : "Your joined challenge status is private."
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update your visibility setting."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-8">
      <header>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/profile" />}
          className="-ml-2 mb-2 w-fit px-2 text-muted-foreground"
        >
          <ArrowLeft />
          Back to profile
        </Button>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Visibility
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Choose whether other members can see that you joined a challenge.
        </p>
      </header>

      <Card className="gap-0 rounded-2xl p-4 sm:p-6" aria-busy={loading}>
        {loading ? (
          <div
            className="space-y-5"
            role="status"
            aria-label="Loading visibility settings"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="size-10 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-48 max-w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5 max-w-full" />
              </div>
            </div>
            <div className="flex min-h-14 items-center justify-between gap-4 rounded-xl border px-4 py-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-44 max-w-full" />
                <Skeleton className="h-3 w-52 max-w-full" />
              </div>
              <Skeleton className="h-5 w-8 shrink-0 rounded-full" />
            </div>
            <span className="sr-only">Loading visibility settings</span>
          </div>
        ) : loadError ? (
          <p role="alert" className="text-sm text-destructive">
            Unable to load your visibility setting: {loadError}
          </p>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {visible === false ? (
                  <EyeOff className="size-5" />
                ) : (
                  <Eye className="size-5" />
                )}
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold">Show my challenge status</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  When enabled, your display name and username may appear in the
                  participant list for challenges you join. Your tasks and activity
                  remain private.
                </p>
              </div>
            </div>

            <div className="mt-5 flex min-h-14 items-center justify-between gap-4 rounded-xl border bg-muted/30 px-4 py-3">
              <div className="min-w-0">
                <Label
                  htmlFor="challenge-status-visibility"
                  className="text-sm font-medium"
                >
                  Show my joined challenge status
                </Label>
                <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">
                  {saving
                    ? "Saving…"
                    : visible === true
                      ? "Yes, show my name and username."
                      : visible === false
                        ? "No, keep my status private."
                        : ""}
                </p>
              </div>
              <Switch
                id="challenge-status-visibility"
                checked={visible === true}
                onCheckedChange={(nextVisible) =>
                  void updateVisibility(nextVisible)
                }
                disabled={saving || visible === null}
                aria-label="Show my joined challenge status to other members"
              />
            </div>
          </>
        )}
      </Card>
    </main>
  );
}
