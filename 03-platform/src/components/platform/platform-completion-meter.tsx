/**
 * UX-001.1b — Reusable workspace profile completion meter.
 */

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type CompletionItem = {
  id: string;
  label: string;
  completed: boolean;
  href?: string;
};

type PlatformCompletionMeterProps = {
  title?: string;
  items: CompletionItem[];
  className?: string;
};

export function PlatformCompletionMeter({
  title = "Profile Completion",
  items,
  className,
}: PlatformCompletionMeterProps) {
  const completedCount = items.filter((item) => item.completed).length;
  const total = items.length;
  const percent = total === 0 ? 100 : Math.round((completedCount / total) * 100);
  const missing = items.filter((item) => !item.completed);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          {completedCount} of {total} items complete
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{percent}%</span>
            <span className="text-muted-foreground">{percent}% complete</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${title}: ${percent}%`}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all",
                percent >= 80 ? "bg-emerald-500" : percent >= 50 ? "bg-amber-500" : "bg-primary"
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {missing.length > 0 ? (
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Missing
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {missing.map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <span className="size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            Profile is complete.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
