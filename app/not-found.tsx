import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16 text-center">
      <div className="max-w-lg">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
          404 error
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          This page could not be found.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          The page you were looking for may have moved, been removed, or never existed.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Go home
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted"
          >
            Open login
          </Link>
        </div>
      </div>
    </main>
  );
}
