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

export default function RegisterPage() {
  const { signUp, authError } = useAuth();
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [verificationEmail, setVerificationEmail] = React.useState<string | null>(
    null
  );
  const [formError, setFormError] = React.useState<string | null>(null);

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
            if (!open) setVerificationEmail(null);
          }}
        >
          <DialogContent showCloseButton={false}>
            <DialogHeader className="items-center text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MailCheck className="size-7" />
              </span>
              <DialogTitle className="text-xl leading-tight">
                Sent verification link to {verificationEmail}
              </DialogTitle>
              <DialogDescription>
                Go to your email and follow the verification link. Once your
                email is verified, come back here to sign in.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setPassword("");
                  setFormError(null);
                  setVerificationEmail(null);
                }}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Entered the wrong details? Go back and change them
              </button>
            </div>
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
