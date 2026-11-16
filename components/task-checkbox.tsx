"use client";

import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function TaskCheckbox({
  className,
  ...props
}: React.ComponentProps<typeof Checkbox>) {
  return (
    <Checkbox
      {...props}
      className={cn(
        "size-9 rounded-lg border-foreground/35 bg-background shadow-xs transition-colors hover:border-foreground/55 sm:size-7 sm:rounded-md",
        "data-checked:border-primary data-checked:bg-primary",
        "[&_[data-slot=checkbox-indicator]>svg]:!size-6 sm:[&_[data-slot=checkbox-indicator]>svg]:!size-5",
        className
      )}
    />
  );
}
