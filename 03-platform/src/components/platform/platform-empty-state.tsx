/**
 * UX-001g — Standard empty state with guided create action.
 */

"use client";

import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PlatformEmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
  compact?: boolean;
};

export function PlatformEmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
  compact = false,
}: PlatformEmptyStateProps) {
  const showAction = actionLabel && (actionHref || onAction);

  if (compact) {
    return (
      <div className={cn("space-y-3 py-4 text-center", className)}>
        <div className="space-y-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {showAction ? (
          actionHref ? (
            <Link
              href={actionHref}
              prefetch={false}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              {actionLabel}
            </Link>
          ) : (
            <Button type="button" size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )
        ) : null}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="text-center">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {showAction ? (
        <CardContent className="flex justify-center pb-6">
          {actionHref ? (
            <Link
              href={actionHref}
              prefetch={false}
              className={cn(buttonVariants())}
            >
              {actionLabel}
            </Link>
          ) : (
            <Button type="button" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </CardContent>
      ) : null}
    </Card>
  );
}
