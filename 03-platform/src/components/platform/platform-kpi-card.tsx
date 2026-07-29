/**
 * UX-001.1f — Reusable KPI metric card.
 */

"use client";

import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type PlatformKpiMetric = {
  label: string;
  value: number | string;
  description?: string;
  variant?: "default" | "success" | "warning" | "destructive";
};

type PlatformKpiCardProps = {
  label: string;
  value: number | string;
  description?: string;
  icon?: LucideIcon;
  variant?: PlatformKpiMetric["variant"];
  className?: string;
};

const variantClasses: Record<NonNullable<PlatformKpiMetric["variant"]>, string> = {
  default: "text-foreground",
  success: "text-emerald-700 dark:text-emerald-300",
  warning: "text-amber-700 dark:text-amber-300",
  destructive: "text-destructive",
};

export function PlatformKpiCard({
  label,
  value,
  description,
  icon: Icon,
  variant = "default",
  className,
}: PlatformKpiCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between gap-2">
          <CardDescription>{label}</CardDescription>
          {Icon ? <Icon className="size-4 text-muted-foreground" aria-hidden /> : null}
        </div>
        <CardTitle className={cn("text-2xl tabular-nums", variantClasses[variant])}>
          {value}
        </CardTitle>
      </CardHeader>
      {description ? (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

type PlatformKpiGridProps = {
  metrics: PlatformKpiMetric[];
  className?: string;
};

export function PlatformKpiGrid({ metrics, className }: PlatformKpiGridProps) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {metrics.map((metric) => (
        <PlatformKpiCard key={metric.label} {...metric} />
      ))}
    </div>
  );
}
