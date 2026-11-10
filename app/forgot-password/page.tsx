"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

import { isSupabaseConfigured } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase/client";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [emailSent, setEmailSent] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFormError("Enter the email address associated with your account.");
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
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setEmailSent(true);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to send a password reset email."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title={emailSent ? "Check your email" : "Forgot your password?"}
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
      {emailSent ? (
        <div className="flex flex-col gap-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            If an account exists for <strong className="text-foreground">{email.trim()}</strong>,
            we&apos;ve sent a link to reset its password. Follow the link in the
            email to choose a new password.
          </p>
          <button
            type="button"
            onClick={() => setEmailSent(false)}
            className="self-start font-medium text-primary underline-offset-4 hover:underline"
          >
            Use a different email address
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isSupabaseConfigured && (
            <p
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              role="alert"
            >
              Supabase is not configured. Add its URL and anon key to .env.local
              and restart the app to enable password recovery.
            </p>
          )}
          {formError && (
            <p
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              role="alert"
            >
              {formError}
            </p>
          )}
          <p className="text-sm leading-relaxed text-muted-foreground">
            Enter your account email and we&apos;ll send you a link to reset
            your password.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={loading || !isSupabaseConfigured}
            className="mt-1"
          >
            <Mail />
            {loading ? "Sending link…" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
