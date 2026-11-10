"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";

import { isSupabaseConfigured } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase/client";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] =
    React.useState(isSupabaseConfigured);
  const [hasSession, setHasSession] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [updated, setUpdated] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(
    isSupabaseConfigured
      ? null
      : "Supabase is not configured. Add its URL and anon key to .env.local."
  );

  React.useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setHasSession(Boolean(session));
      setCheckingSession(false);
    });

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setFormError(error.message);
        setHasSession(Boolean(data.session));
        setCheckingSession(false);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setFormError(
          error instanceof Error
            ? error.message
            : "Unable to verify the password reset link."
        );
        setCheckingSession(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 6) {
      setFormError("Password should be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setFormError(
        "Supabase is not configured. Add its URL and anon key to .env.local."
      );
      return;
    }

    setLoading(true);
    setFormError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setUpdated(true);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to update your password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title={updated ? "Password updated" : "Choose a new password"}
      footer={
        <Link
          href="/login"
          className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-3.5" />
          Back to login
        </Link>
      }
    >
      {checkingSession ? (
        <div
          className="flex flex-col gap-3 py-4"
          role="status"
          aria-label="Verifying your reset link"
        >
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
          <span className="sr-only">Verifying your reset link</span>
        </div>
      ) : updated ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your password has been changed. You can now sign in with your new
            password.
          </p>
          <Button
            type="button"
            size="lg"
            onClick={() => router.replace("/tasks")}
          >
            <Check />
            Continue to Taskflow
          </Button>
        </div>
      ) : hasSession ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {formError && (
            <p
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              role="alert"
            >
              {formError}
            </p>
          )}
          <p className="text-sm leading-relaxed text-muted-foreground">
            Choose a new password for your account.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>
          <Button type="submit" size="lg" disabled={loading}>
            <Check />
            {loading ? "Updating password…" : "Update password"}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-destructive" role="alert">
            {formError ??
              "This password reset link is invalid or has expired. Request a new one to continue."}
          </p>
          <Button
            type="button"
            size="lg"
            nativeButton={false}
            render={<Link href="/forgot-password" />}
          >
            Request a new reset link
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}
