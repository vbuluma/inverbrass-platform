/**
 * UX-001.1e — Rule-based recommendations placeholder (future AI engine).
 */

"use client";

import { LightbulbIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type PlatformRecommendation = {
  id: string;
  message: string;
  severity?: "info" | "warning";
};

type PlatformRecommendationsCardProps = {
  recommendations: PlatformRecommendation[];
  title?: string;
};

export function PlatformRecommendationsCard({
  recommendations,
  title = "Recommendations",
}: PlatformRecommendationsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <LightbulbIcon className="size-4 text-amber-600" aria-hidden />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription>
          Rule-based suggestions. An AI engine will enhance these in a future release.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recommendations at this time.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {recommendations.map((item) => (
              <li
                key={item.id}
                className={
                  item.severity === "warning"
                    ? "text-amber-800 dark:text-amber-200"
                    : "text-muted-foreground"
                }
              >
                {item.message}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
