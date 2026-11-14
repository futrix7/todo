import { Skeleton } from "@/components/ui/skeleton";

type SkeletonVariant =
  | "page"
  | "tasks"
  | "calendar"
  | "habits"
  | "streak"
  | "profile"
  | "analytics"
  | "days";

const fullBleedRoot =
  "-mx-3 -my-4 flex min-h-dvh w-[calc(100%+1.5rem)] min-w-0 flex-col bg-background sm:-mx-4 sm:-my-6 sm:w-[calc(100%+2rem)] md:-mx-6 md:-my-8 md:w-[calc(100%+3rem)] lg:-mx-8 lg:-my-6 lg:w-[calc(100%+4rem)]";

const chartColumns = "sm:grid-cols-2";

export function PageLoadingSkeleton({
  label,
  variant = "page",
}: {
  label: string;
  variant?: SkeletonVariant;
}) {
  if (variant === "tasks") {
    return (
      <div
        className="flex h-full min-h-0 w-full min-w-0 flex-col items-stretch gap-4 lg:flex-row lg:gap-0"
        role="status"
        aria-label={label}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden px-1 pt-0 pb-2 sm:px-2 sm:gap-4 lg:gap-6 lg:py-4 lg:pl-2 lg:pr-5">
          <div className="flex flex-col gap-2 sm:gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-2">
                <Skeleton className="hidden h-6 w-36 lg:block" />
                <Skeleton className="h-3 w-12 lg:h-4 lg:w-20" />
              </div>
              <Skeleton className="hidden h-9 w-32 rounded-lg md:block" />
            </div>
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-1.5 w-full rounded-full lg:h-3" />
            <div className="grid h-8 grid-cols-3 gap-1 rounded-xl border p-1 lg:h-10">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-full rounded-lg" />
              ))}
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto">
            {Array.from({ length: 7 }, (_, index) => (
              <div
                key={index}
                className="flex min-h-14 items-center gap-3 rounded-xl bg-card/40 px-3 py-3"
              >
                <Skeleton className="size-4 shrink-0 rounded-sm" />
                <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/5 max-w-64" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="hidden h-4 w-20 sm:block" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden w-[360px] shrink-0 flex-col gap-5 border-l p-4 lg:flex">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <div className="space-y-3 rounded-lg border p-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-5 w-full" />
            ))}
          </div>
        </div>
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] right-2 z-30 flex flex-col gap-2 md:hidden">
          <Skeleton className="size-12 rounded-2xl" />
          <Skeleton className="size-12 rounded-2xl" />
        </div>
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  if (variant === "calendar") {
    return (
      <div
        className="flex min-h-[calc(100dvh-5rem)] w-full min-w-0 flex-col bg-background px-3 py-3 pb-4 sm:px-4 sm:py-4 md:px-5 md:py-5 lg:h-full lg:min-h-0 lg:px-0 lg:py-0"
        role="status"
        aria-label={label}
      >
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 pb-3 sm:min-h-16 sm:pb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="size-5 rounded-md" />
              <Skeleton className="h-7 w-28" />
            </div>
            <Skeleton className="h-4 w-56 max-w-full" />
          </div>
          <Skeleton className="h-8 w-16 rounded-lg sm:h-9 sm:w-20" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
          <section className="flex min-w-0 flex-1 flex-col">
            <div className="overflow-hidden rounded-xl border bg-card/10">
              <div className="flex min-h-12 items-center justify-between border-b px-2 sm:min-h-14 sm:px-3">
                <Skeleton className="h-5 w-36" />
                <div className="flex gap-1">
                  <Skeleton className="size-9 rounded-lg" />
                  <Skeleton className="size-9 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-7 border-b">
                {Array.from({ length: 7 }, (_, index) => (
                  <div key={index} className="flex justify-center py-2">
                    <Skeleton className="h-3 w-5 sm:w-8" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: 35 }, (_, index) => (
                  <div
                    key={index}
                    className="flex min-h-[52px] min-w-0 flex-col gap-2 border-b border-r p-1.5 sm:min-h-[76px] sm:p-2"
                  >
                    <Skeleton className="size-6 rounded-full sm:size-7" />
                    <Skeleton className="hidden h-3 w-14 max-w-full sm:block" />
                    <div className="flex gap-0.5 sm:hidden">
                      {[0, 1, 2].map((dot) => (
                        <Skeleton key={dot} className="size-1 rounded-full" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="hidden shrink-0 flex-col overflow-hidden border-l bg-card/40 lg:flex lg:h-full lg:w-80 xl:w-96">
            <div className="flex min-h-14 items-center justify-between border-b px-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="size-8 rounded-lg" />
            </div>
            <div className="flex-1 divide-y">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="flex items-start gap-3 px-4 py-4">
                  <Skeleton className="mt-0.5 size-4 shrink-0 rounded-sm" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  if (variant === "habits") {
    const habitColumns = "minmax(14rem, 1fr) repeat(31, 2.75rem)";

    return (
      <div className={fullBleedRoot} role="status" aria-label={label}>
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b bg-background px-3 py-3 sm:px-4 md:px-6 lg:px-8">
          <Skeleton className="h-7 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>

        <section className="overflow-hidden border-y bg-background">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 shrink-0 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-36" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="size-9 rounded-lg" />
              <Skeleton className="size-9 rounded-lg" />
              <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
          </div>
          <div className="overflow-x-auto overscroll-x-contain">
            <div className="min-w-max">
              <div
                className="grid border-b p-2"
                style={{ gridTemplateColumns: habitColumns }}
              >
                {Array.from({ length: 32 }, (_, index) => (
                  <div
                    key={index}
                    className="flex h-12 items-center justify-center border-r px-2"
                  >
                    <Skeleton
                      className={
                        index === 0 ? "h-4 w-16" : "size-7 rounded-md"
                      }
                    />
                  </div>
                ))}
              </div>
              {Array.from({ length: 4 }, (_, row) => (
                <div
                  key={row}
                  className="grid border-b p-2 last:border-b-0"
                  style={{ gridTemplateColumns: habitColumns }}
                >
                  {Array.from({ length: 32 }, (_, column) => (
                    <div
                      key={column}
                      className="flex h-12 items-center justify-center border-r px-2"
                    >
                      {column === 0 ? (
                        <div className="flex w-full items-center gap-2">
                          <Skeleton className="size-8 shrink-0 rounded-lg" />
                          <Skeleton className="h-4 min-w-0 flex-1" />
                        </div>
                      ) : (
                        <Skeleton className="size-7 rounded-md" />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/25 px-5 py-3 sm:px-6">
            <Skeleton className="h-3 w-64 max-w-full" />
            <Skeleton className="h-3 w-44 max-w-full" />
          </div>
        </section>

        <section className="grid grid-cols-3 border-b bg-background">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="space-y-2 border-r px-2.5 py-3 last:border-r-0 sm:px-4 md:px-6 lg:px-8"
            >
              <Skeleton className="h-4 w-20 max-w-full" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </section>

        <section className="overflow-hidden border-y bg-background">
          <div className="flex flex-col gap-4 border-b bg-muted/20 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
            <div className="flex gap-2">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-10 w-24 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="space-y-3 px-3 py-3 sm:px-6">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 border-b py-4 last:border-b-0"
              >
                <Skeleton className="size-10 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-40 max-w-full" />
                  <Skeleton className="h-3 w-56 max-w-full" />
                </div>
                <Skeleton className="h-9 w-20 rounded-lg" />
              </div>
            ))}
          </div>
        </section>
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  if (variant === "streak") {
    return (
      <div
        className="flex w-full min-w-0 flex-col gap-4 sm:gap-6"
        role="status"
        aria-label={label}
      >
        <div className="flex items-center gap-3 rounded-xl border p-4">
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <Skeleton className="h-5 min-w-0 flex-1" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="size-4 shrink-0" />
        </div>
        <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center">
          <Skeleton className="size-10 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl sm:h-24" />
          ))}
        </div>
        <div className="rounded-xl border p-4">
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {Array.from({ length: 35 }, (_, index) => (
              <Skeleton key={index} className="aspect-square min-h-8 rounded-md" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border">
          <div className="divide-y">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="flex min-h-14 items-center gap-3 px-4 py-3"
              >
                <Skeleton className="h-4 min-w-0 flex-1" />
                <Skeleton className="h-3 w-24 shrink-0" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-[210px] w-full rounded-lg sm:h-[260px]" />
        </div>
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  if (variant === "profile") {
    return (
      <div className={fullBleedRoot} role="status" aria-label={label}>
        <div className="flex flex-col items-center gap-4 border-b px-4 py-8 text-center sm:gap-5 sm:py-10">
          <Skeleton className="size-40 rounded-full sm:size-44" />
          <div className="flex w-full flex-col items-center gap-2">
            <Skeleton className="h-7 w-48 max-w-full sm:h-8" />
            <Skeleton className="h-4 w-56 max-w-full" />
            <Skeleton className="mt-2 h-4 w-full max-w-2xl" />
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
        <div className="px-4 py-4 md:px-6 lg:px-8">
          <Skeleton className="h-11 w-full rounded-lg sm:ml-auto sm:w-36" />
        </div>
        <div className="grid grid-cols-2 gap-3 border-b p-4 sm:grid-cols-4 sm:gap-4 md:px-6 lg:px-8">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="min-h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-4 px-4 py-5 sm:grid-cols-2 sm:gap-5 md:px-6 lg:px-8">
          <div className="min-w-0 space-y-3 py-2">
            <Skeleton className="h-5 w-28" />
            <div className="overflow-hidden rounded-2xl border">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton
                  key={index}
                  className="h-14 rounded-none border-b last:border-b-0"
                />
              ))}
            </div>
          </div>
          <div className="min-w-0 space-y-3 py-2">
            <Skeleton className="h-5 w-32" />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-20 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  if (variant === "analytics") {
    return (
      <div
        className="-mx-3 -my-4 flex w-[calc(100%+1.5rem)] min-w-0 flex-col sm:-mx-4 sm:-my-6 sm:w-[calc(100%+2rem)] md:-mx-6 md:-my-8 md:w-[calc(100%+3rem)] lg:-mx-8 lg:-my-6 lg:w-[calc(100%+4rem)]"
        role="status"
        aria-label={label}
      >
        <div className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b px-3 pb-3 pt-5 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-52 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>

        <div className="grid grid-cols-2 border-b sm:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="border-b p-3 sm:border-b-0 sm:border-r sm:p-4">
              <Skeleton className="h-4 w-24 max-w-full" />
              <Skeleton className="mt-2 h-7 w-16" />
              <Skeleton className="mt-2 h-3 w-full" />
            </div>
          ))}
        </div>

        <div className={`grid min-w-0 grid-cols-1 ${chartColumns}`}>
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="min-w-0 border-b p-3 sm:p-4 md:p-6">
              <Skeleton className="mb-3 h-5 w-40" />
              <Skeleton className="h-[320px] w-full rounded-xl" />
            </div>
          ))}
        </div>

        <div className="border-b px-3 py-4 sm:px-4 md:px-6 lg:px-8">
          <div className="mb-3 flex items-center justify-between gap-2">
            <Skeleton className="h-5 w-52 max-w-full" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className={`grid min-w-0 gap-3 ${chartColumns}`}>
            {Array.from({ length: 2 }, (_, index) => (
              <div key={index} className="space-y-3 rounded-xl border p-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-7 shrink-0 rounded-lg" />
                  <Skeleton className="h-4 min-w-0 flex-1" />
                  <Skeleton className="h-4 w-10 shrink-0" />
                </div>
                <Skeleton className="h-[140px] w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  if (variant === "days") {
    return (
      <div
        className="flex w-full min-w-0 flex-col gap-4 sm:gap-6"
        role="status"
        aria-label={label}
      >
        <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-3">
          <div className="space-y-5 rounded-2xl border p-4 sm:p-6 lg:col-span-2">
            <div className="flex items-start justify-between gap-3 border-b pb-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-48 max-w-full" />
              </div>
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-28" />
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-16 rounded-xl sm:h-20" />
              ))}
            </div>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <div className="flex justify-end gap-2">
              <Skeleton className="h-10 w-24 rounded-lg" />
              <Skeleton className="h-10 w-32 rounded-lg" />
            </div>
          </div>
          <div className="space-y-4 rounded-2xl border p-4 sm:p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-20 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-2xl border p-4 sm:p-6">
          <Skeleton className="mb-4 h-5 w-40" />
          <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-3">
            <Skeleton className="h-[210px] w-full rounded-xl sm:h-[260px] lg:col-span-2" />
            <Skeleton className="h-[210px] w-full rounded-xl sm:h-[260px]" />
          </div>
        </div>
        <div className="space-y-3 rounded-2xl border p-4 sm:p-6">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  return (
    <div
      className="flex w-full min-w-0 flex-col gap-5 sm:gap-6"
      role="status"
      aria-label={label}
    >
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="space-y-3 rounded-xl border p-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-52 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
