"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck, Send, UserPlus } from "lucide-react";

import { isSupabaseConfigured, useAuth } from "@/lib/auth";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const { signUp, resendSignupEmail, authError } = useAuth();
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [pendingEmail, setPendingEmail] = React.useState<string | null>(null);
  const [resending, setResending] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(0);
  const [resendStatus, setResendStatus] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(
      () => setResendCooldown((current) => Math.max(0, current - 1)),
      1000
    );
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setFormError("Please fill in all the fields.");
      return;
    }
    if (password.length < 6) {
      setFormError("Password should be at least 6 characters.");
      return;
    }

    setLoading(true);
    setFormError(null);
    try {
      const result = await signUp(name, email.trim(), password);
      if (result.verificationRequired) {
        setPendingEmail(email.trim());
        setResendStatus(null);
        setResendCooldown(60);
      } else {
        router.replace("/tasks");
      }
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to create account."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!pendingEmail) return;
    setResending(true);
    setFormError(null);
    setResendStatus(null);
    try {
      await resendSignupEmail(pendingEmail);
      setResendCooldown(60);
      setResendStatus("Confirmation email sent again.");
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to resend the confirmation email."
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthLayout
      title={pendingEmail ? "Confirm your email" : "Create your account"}
      footer={
        pendingEmail ? (
          <span>
            Already confirmed?{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </span>
        ) : (
          <span>
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Login
            </Link>
          </span>
        )
      }
    >
      {pendingEmail ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MailCheck className="size-7" />
            </span>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We sent a confirmation link to{" "}
              <strong className="font-medium text-foreground">
                {pendingEmail}
              </strong>
              . Open it to activate your account and sign in automatically.
            </p>
          </div>

          {formError && (
            <p
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              role="alert"
            >
              {formError}
            </p>
          )}
          {resendStatus && (
            <p
              className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground"
              role="status"
            >
              {resendStatus}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={resending || resendCooldown > 0}
              onClick={handleResend}
            >
              <Send />
              {resending
                ? "Sending…"
                : resendCooldown > 0
                  ? `Resend email in ${resendCooldown}s`
                  : "Resend confirmation email"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={resending}
              onClick={() => {
                setPendingEmail(null);
                setPassword("");
                setFormError(null);
                setResendStatus(null);
                setResendCooldown(0);
              }}
            >
              Use a different email address
            </Button>
          </div>

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            The link expires in 24 hours. If it doesn&apos;t arrive, check your
            spam folder.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isSupabaseConfigured && (
            <p
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              role="alert"
            >
              Supabase is not configured. Add its URL and anon key to .env.local
              and restart the app to enable registration.
            </p>
          )}
          {authError && (
            <p
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              role="alert"
            >
              Session verification failed: {authError}
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Alex Johnson"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={loading || !isSupabaseConfigured}
            className="mt-1"
          >
            <UserPlus />
            {loading ? "Creating account…" : "Create account"}
          </Button>

          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            We&apos;ll email you a confirmation link before you can sign in.
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
