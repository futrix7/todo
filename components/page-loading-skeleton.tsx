import { Skeleton } from "@/components/ui/skeleton";

type SkeletonVariant =
  | "page"
  | "tasks"
  | "streak"
  | "profile"
  | "analytics"
  | "days";

export function PageLoadingSkeleton({
  label,
  variant = "page",
}: {
  label: string;
  variant?: SkeletonVariant;
}) {
  if (variant === "tasks") {
    return (
      <div className="flex w-full flex-col gap-5" role="status" aria-label={label}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="grid h-10 grid-cols-3 gap-1 rounded-xl border p-1">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-full rounded-lg" />
          ))}
        </div>
        <div className="flex min-w-0 items-stretch">
          <div className="min-w-0 flex-1 space-y-1">
            {Array.from({ length: 7 }, (_, index) => (
              <div key={index} className="flex min-h-14 items-center gap-3 border-b px-3 py-3">
                <Skeleton className="size-4 shrink-0 rounded-sm" />
                <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <Skeleton className="h-4 w-2/5 max-w-64" />
                  <Skeleton className="hidden h-4 w-20 sm:block" />
                </div>
              </div>
            ))}
          </div>
          <div className="ml-4 hidden w-[360px] shrink-0 space-y-5 border-l p-4 lg:block">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <div className="space-y-3 rounded-lg border p-3">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-5 w-full" />
              ))}
            </div>
          </div>
        </div>
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  if (variant === "streak") {
    return (
      <div className="flex w-full min-w-0 flex-col gap-5" role="status" aria-label={label}>
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
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl sm:h-24" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {Array.from({ length: 35 }, (_, index) => (
            <Skeleton key={index} className="aspect-square min-h-8 rounded-md" />
          ))}
        </div>
        <div className="rounded-xl border p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-[210px] w-full rounded-lg sm:h-[260px]" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-14 rounded-lg" />
          ))}
        </div>
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  if (variant === "profile") {
    return (
      <div className="flex w-full min-w-0 flex-col gap-5 sm:gap-6" role="status" aria-label={label}>
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-6">
            <Skeleton className="size-16 shrink-0 rounded-2xl" />
            <div className="min-w-0 flex-1 space-y-2 pt-1">
              <Skeleton className="h-6 w-40 max-w-full" />
              <Skeleton className="h-4 w-56 max-w-full" />
            </div>
            <Skeleton className="size-10 shrink-0 rounded-full" />
          </div>
          <div className="flex justify-between gap-3 border-t px-4 py-3 sm:px-6">
            <Skeleton className="h-4 w-36 max-w-[55%]" />
            <Skeleton className="h-4 w-28 max-w-[40%]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-3 rounded-xl border p-4 lg:col-span-2">
            <Skeleton className="h-5 w-28" />
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-14 rounded-lg" />
            ))}
          </div>
          <div className="space-y-3 rounded-xl border p-4">
            <Skeleton className="h-5 w-32" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-28 rounded-xl" />
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
      <div className="-mx-3 -my-4 flex min-h-dvh w-[calc(100%+1.5rem)] min-w-0 flex-col sm:-mx-4 sm:-my-6 sm:w-[calc(100%+2rem)] md:-mx-6 md:-my-8 md:w-[calc(100%+3rem)] lg:-mx-8 lg:-my-6 lg:w-[calc(100%+4rem)]" role="status" aria-label={label}>
        <div className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b pb-3 pt-2">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-52 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 border-b sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="border-b p-3 sm:border-b-0 sm:border-r sm:p-4">
              <Skeleton className="h-4 w-24 max-w-full" />
              <Skeleton className="mt-2 h-7 w-16" />
              <Skeleton className="mt-2 h-3 w-full" />
            </div>
          ))}
        </div>
        <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="min-w-0 border-b p-3 sm:p-4 md:p-6">
              <Skeleton className="mb-4 h-5 w-40" />
              <Skeleton className="h-[320px] w-full rounded-xl" />
            </div>
          ))}
        </div>
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  if (variant === "days") {
    return (
      <div className="flex w-full min-w-0 flex-col gap-4 sm:gap-6" role="status" aria-label={label}>
        <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-3">
          <div className="space-y-5 rounded-xl border p-4 sm:p-6 lg:col-span-2">
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
          <div className="space-y-4 rounded-xl border p-4 sm:p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-20 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4 rounded-xl border p-4 sm:p-6">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-[260px] w-full rounded-xl" />
        </div>
        <div className="space-y-3 rounded-xl border p-4 sm:p-6">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 4 }, (_, index) => (
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
