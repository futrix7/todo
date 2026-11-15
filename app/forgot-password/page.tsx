"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck, Send } from "lucide-react";

import { isSupabaseConfigured, useAuth } from "@/lib/auth";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFormError("Enter the email address associated with your account.");
      return;
    }

    setLoading(true);
    setFormError(null);
    try {
      await sendPasswordReset(trimmedEmail);
      setSentTo(trimmedEmail);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to send the password reset email."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title={sentTo ? "Check your email" : "Forgot your password?"}
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
      {!isSupabaseConfigured && (
        <p
          className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          role="alert"
        >
          Supabase is not configured. Add its URL and anon key to .env.local
          and restart the app to enable password recovery.
        </p>
      )}
      {formError && (
        <p
          className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          role="alert"
        >
          {formError}
        </p>
      )}

      {sentTo ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MailCheck className="size-7" />
            </span>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We sent a password reset link to{" "}
              <strong className="font-medium text-foreground">{sentTo}</strong>.
              Open it to choose a new password.
            </p>
          </div>

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            The link expires in 1 hour and can only be used once. If it
            doesn&apos;t arrive, check your spam folder.
          </p>

          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSentTo(null);
              setFormError(null);
            }}
          >
            Use a different email address
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            <Send />
            {loading ? "Sending reset link…" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
