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
        "size-7 rounded-md [&_[data-slot=checkbox-indicator]>svg]:!size-5",
        className
      )}
    />
  );
}
