"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, Mail } from "lucide-react";

import { isSupabaseConfigured } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase/client";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [emailSent, setEmailSent] = React.useState(false);
  const [otpVerified, setOtpVerified] = React.useState(false);
  const [passwordUpdated, setPasswordUpdated] = React.useState(false);
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

  async function sendResetCode() {
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
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
      if (error) throw error;
      setEmailSent(true);
      setResendCooldown(60);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to send a password reset code."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendResetCode();
  }

  async function handleVerifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (otp.length !== 6) {
      setFormError("Enter the 6-digit code from your email.");
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
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp,
        type: "recovery",
      });
      if (error) throw error;
      setOtpVerified(true);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Unable to verify the code."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePassword(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    if (newPassword.length < 6) {
      setFormError("Password should be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
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
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setPasswordUpdated(true);
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

  function startOver() {
    setEmailSent(false);
    setOtpVerified(false);
    setPasswordUpdated(false);
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setFormError(null);
  }

  const title = passwordUpdated
    ? "Password updated"
    : otpVerified
      ? "Choose a new password"
      : emailSent
        ? "Check your email"
        : "Forgot your password?";

  return (
    <AuthLayout
      title={title}
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

      {passwordUpdated ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your password has been changed. You can now continue to Taskflow.
          </p>
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href="/tasks" />}
          >
            <CheckCircle2 />
            Continue to Taskflow
          </Button>
        </div>
      ) : otpVerified ? (
        <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Choose a new password for {email.trim()}.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
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
            <KeyRound />
            {loading ? "Updating password…" : "Update password"}
          </Button>
        </form>
      ) : emailSent ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            If an account exists for{" "}
            <strong className="text-foreground">{email.trim()}</strong>, we sent
            a 6-digit reset code. Enter it below to choose a new password.
          </p>
          <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2">
              <Label htmlFor="reset-code">Reset code</Label>
              <InputOTP
                id="reset-code"
                aria-label="6-digit password reset code"
                maxLength={6}
                value={otp}
                onChange={setOtp}
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
              size="lg"
              disabled={loading || otp.length !== 6}
            >
              <Mail />
              {loading ? "Verifying code…" : "Verify code"}
            </Button>
          </form>
          <Button
            type="button"
            variant="ghost"
            disabled={loading || resendCooldown > 0}
            onClick={() => void sendResetCode()}
          >
            {resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : "Resend code"}
          </Button>
          <button
            type="button"
            onClick={startOver}
            className="self-start text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Use a different email address
          </button>
        </div>
      ) : (
        <form onSubmit={handleRequestCode} className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Enter your account email and we&apos;ll send you a reset code.
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
            {loading ? "Sending code…" : "Send reset code"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
