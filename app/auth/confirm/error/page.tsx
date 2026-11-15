import Link from "next/link";
import { ArrowLeft, Link2Off } from "lucide-react";

import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";

export default function ConfirmLinkErrorPage() {
  return (
    <AuthLayout
      title="This link has expired"
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
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <Link2Off className="size-7" />
          </span>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The confirmation or password reset link is invalid, has already been
            used, or has expired.
          </p>
        </div>

        <Button
          size="lg"
          nativeButton={false}
          render={<Link href="/forgot-password" />}
        >
          Request a new reset link
        </Button>
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          Signing up again with the same address sends a fresh confirmation
          email.
        </p>
      </div>
    </AuthLayout>
  );
}
