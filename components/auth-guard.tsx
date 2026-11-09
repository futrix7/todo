"use client";

import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

/**
 * The server Proxy is the access-control boundary. This guard mirrors the
 * validated client auth state during hydration and client-side navigation.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, authReady, authError } = useAuth();

  if (authError) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center"
        role="alert"
      >
        <p className="max-w-md text-sm text-destructive">
          Your session could not be verified: {authError}
        </p>
        <a className="text-sm font-medium text-primary underline" href="/login">
          Return to sign in
        </a>
      </div>
    );
  }

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Sign in to access your tasks.
        </p>
        <a
          className="text-sm font-medium text-primary underline"
          href="/login"
        >
          Return to sign in
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
