"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  indicatorClassName?: string;
}

function Progress({ value = 0, max = 100, className, indicatorClassName, ...props }: ProgressProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
      {...props}
    >
      <div
        className={cn("h-full rounded-full bg-primary transition-all duration-500", indicatorClassName)}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export { Progress };