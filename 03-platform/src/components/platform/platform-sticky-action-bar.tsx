/**
 * UX-001i — Sticky action bar for long forms.
 */

"use client";

import { cn } from "@/lib/utils";

type PlatformStickyActionBarProps = {
  children: React.ReactNode;
  className?: string;
};

export function PlatformStickyActionBar({
  children,
  className,
}: PlatformStickyActionBarProps) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 -mx-4 mt-4 border-t bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-6 sm:px-6",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
