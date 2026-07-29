/**
 * UX-001.1a — Contextual completion card after successful create actions.
 */

"use client";

import Link from "next/link";
import { CheckCircle2Icon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { PlatformActionLink } from "@/core/platform/types";
import { cn } from "@/lib/utils";

export type PlatformCompletionSummaryItem = {
  label: string;
  value: string;
};

type PlatformCompletionCardProps = {
  title: string;
  summary: PlatformCompletionSummaryItem[];
  nextActions?: PlatformActionLink[];
  className?: string;
};

export function PlatformCompletionCard({
  title,
  summary,
  nextActions = [],
  className,
}: PlatformCompletionCardProps) {
  return (
    <Card className={cn("border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
          <div className="space-y-1">
            <CardTitle className="text-base text-emerald-900 dark:text-emerald-100">
              {title}
            </CardTitle>
            <CardDescription>Review the summary below and continue with recommended next steps.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Summary
          </p>
          <dl className="space-y-2 text-sm">
            {summary.map((item) => (
              <div
                key={item.label}
                className="flex items-start justify-between gap-4 border-b border-border/40 pb-2 last:border-0 last:pb-0"
              >
                <dt className="text-muted-foreground">{item.label}</dt>
                <dd className="text-right font-medium">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {nextActions.length > 0 ? (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Recommended Next Steps
              </p>
              <div className="flex flex-wrap gap-2">
                {nextActions.map((action) => {
                  const variant = action.variant ?? "default";
                  if (action.href) {
                    return (
                      <Link
                        key={action.label}
                        href={action.href}
                        prefetch={false}
                        className={cn(buttonVariants({ variant, size: "sm" }))}
                      >
                        {action.label}
                      </Link>
                    );
                  }
                  return (
                    <Button
                      key={action.label}
                      type="button"
                      size="sm"
                      variant={variant}
                      onClick={action.onClick}
                    >
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
