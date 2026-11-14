"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck, UserPlus } from "lucide-react";

import { isSupabaseConfigured, useAuth } from "@/lib/auth";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export default function RegisterPage() {
  const { signUp, verifySignupOtp, resendSignupOtp, authError } = useAuth();
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [verificationEmail, setVerificationEmail] = React.useState<string | null>(
    null
  );
  const [verificationOtp, setVerificationOtp] = React.useState("");
  const [verificationError, setVerificationError] = React.useState<string | null>(
    null
  );
  const [verificationStatus, setVerificationStatus] = React.useState<
    string | null
  >(null);
  const [verifyingOtp, setVerifyingOtp] = React.useState(false);
  const [resendingOtp, setResendingOtp] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(0);
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
        setVerificationEmail(email.trim());
        setVerificationOtp("");
        setVerificationError(null);
        setVerificationStatus(null);
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

  async function handleVerifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!verificationEmail) return;
    if (verificationOtp.length !== 6) {
      setVerificationError("Enter the 6-digit code from your email.");
      return;
    }

    setVerifyingOtp(true);
    setVerificationError(null);
    try {
      await verifySignupOtp(verificationEmail, verificationOtp);
      router.replace("/tasks");
    } catch (error) {
      setVerificationError(
        error instanceof Error ? error.message : "Unable to verify your email."
      );
    } finally {
      setVerifyingOtp(false);
    }
  }

  async function handleResendOtp() {
    if (!verificationEmail) return;
    setResendingOtp(true);
    setVerificationError(null);
    setVerificationStatus(null);
    try {
      await resendSignupOtp(verificationEmail);
      setVerificationOtp("");
      setResendCooldown(60);
      setVerificationStatus("A new code has been sent.");
    } catch (error) {
      setVerificationError(
        error instanceof Error ? error.message : "Unable to resend the code."
      );
    } finally {
      setResendingOtp(false);
    }
  }

  return (
    <AuthLayout
      title={verificationEmail ? "Verify your email" : "Create your account"}
      footer={
        verificationEmail ? (
          <span>
            Already verified?{" "}
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
      {verificationEmail ? (
        <Dialog
          open
          disablePointerDismissal
          onOpenChange={(open) => {
            if (!open) {
              setVerificationEmail(null);
              setVerificationOtp("");
              setVerificationError(null);
              setVerificationStatus(null);
            }
          }}
        >
          <DialogContent showCloseButton={false}>
            <DialogHeader className="items-center text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MailCheck className="size-7" />
              </span>
              <DialogTitle className="text-xl leading-tight">
                Verify your email
              </DialogTitle>
              <DialogDescription>
                Enter the 6-digit code sent to {verificationEmail}.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={handleVerifyOtp}
              className="flex flex-col items-center gap-4"
            >
              {verificationError && (
                <p className="w-full text-sm text-destructive" role="alert">
                  {verificationError}
                </p>
              )}
              {verificationStatus && (
                <p className="w-full text-sm text-muted-foreground" role="status">
                  {verificationStatus}
                </p>
              )}
              <div className="flex flex-col items-center gap-2">
                <Label htmlFor="verification-code">Verification code</Label>
                <InputOTP
                  id="verification-code"
                  aria-label="6-digit verification code"
                  maxLength={6}
                  value={verificationOtp}
                  onChange={setVerificationOtp}
                >
                  <InputOTPGroup>
                    {Array.from({ length: 6 }, (_, index) => (
                      <InputOTPSlot key={index} index={index} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={verifyingOtp || verificationOtp.length !== 6}
              >
                {verifyingOtp ? "Verifying…" : "Verify email"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={resendingOtp || resendCooldown > 0}
                onClick={handleResendOtp}
              >
                {resendingOtp
                  ? "Sending new code…"
                  : resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : "Resend code"}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setPassword("");
                  setFormError(null);
                  setVerificationEmail(null);
                  setVerificationOtp("");
                  setVerificationError(null);
                }}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Entered the wrong details? Go back and change them
              </button>
            </form>
          </DialogContent>
        </Dialog>
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
        </form>
      )}
    </AuthLayout>
  );
}
