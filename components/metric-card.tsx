import type { ComponentType } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { FadeIn } from "@/components/motion-fade";

export function MetricCard({
  label,
  value,
  icon: Icon,
  detail,
  delay = 0,
  compact = false,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  detail?: string;
  delay?: number;
  compact?: boolean;
}) {
  return (
    <FadeIn delay={delay} className="h-full">
      <Card className={`h-full ${compact ? "py-2" : ""}`}>
        <CardContent
          className={`flex h-full flex-col ${
            compact
              ? "gap-1 p-2.5 sm:p-3"
              : "min-h-[132px] p-3 sm:min-h-[148px] sm:p-4"
          }`}
        >
          <div className="flex min-w-0 items-start justify-between gap-2">
            <p
              className={`min-w-0 flex-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground sm:text-sm sm:leading-5 ${
                compact ? "" : "h-8 sm:h-10"
              }`}
            >
              {label}
            </p>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:size-9">
              <Icon className="size-4" />
            </span>
          </div>
          <p
            className={`font-heading text-xl font-semibold leading-7 tracking-tight tabular-nums sm:text-2xl ${
              compact ? "pt-1" : "mt-auto min-h-8 pt-1"
            }`}
          >
            {value}
          </p>
          <p
            className={`line-clamp-2 text-[10px] leading-4 text-muted-foreground sm:text-xs ${
              compact ? "" : "mt-1 min-h-8"
            }`}
          >
            {detail ?? "\u00a0"}
          </p>
        </CardContent>
      </Card>
    </FadeIn>
  );
}
