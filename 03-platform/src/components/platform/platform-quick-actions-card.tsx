/**
 * UX-001.1c — Contextual quick actions for workspace sidebars.
 */

"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PlatformActionLink } from "@/core/platform/types";
import { cn } from "@/lib/utils";

type PlatformQuickActionsCardProps = {
  actions: PlatformActionLink[];
  title?: string;
  description?: string;
};

export function PlatformQuickActionsCard({
  actions,
  title = "Quick Actions",
  description = "Common tasks for this workspace.",
}: PlatformQuickActionsCardProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {actions.map((action) => {
          if (action.href) {
            return (
              <Link
                key={action.label}
                href={action.href}
                prefetch={false}
                className={cn(
                  buttonVariants({ variant: action.variant ?? "outline", size: "sm" }),
                  "justify-start"
                )}
              >
                {action.label}
              </Link>
            );
          }
          return (
            <button
              key={action.label}
              type="button"
              className={cn(
                buttonVariants({ variant: action.variant ?? "outline", size: "sm" }),
                "justify-start"
              )}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
