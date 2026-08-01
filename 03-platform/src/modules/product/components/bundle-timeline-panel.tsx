/**
 * Purpose:
 * Bundle timeline panel for bundle workspace.
 */

"use client";

import { PlatformEmptyState } from "@/components/platform";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BUNDLE_TIMELINE_EVENT_TYPE_LABELS,
} from "@/core/bundle-timeline/constants";
import type { BundleTimelinePanelView } from "@/core/bundle-timeline/types";
import { BUNDLE_UI_LABELS } from "@/modules/product/bundle-ui-labels";

type BundleTimelinePanelProps = {
  initialData: BundleTimelinePanelView;
};

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function BundleTimelinePanel({ initialData }: BundleTimelinePanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{BUNDLE_UI_LABELS.timelineHeading}</CardTitle>
        <CardDescription>Lifecycle and configuration events for this bundle.</CardDescription>
      </CardHeader>
      <CardContent>
        {initialData.events.length === 0 ? (
          <PlatformEmptyState
            title="No timeline events yet"
            description="Events appear when the bundle is created or updated."
          />
        ) : (
          <ul className="space-y-3">
            {initialData.events.map((event) => (
              <li
                key={event.id}
                className="rounded-lg border border-border/60 px-4 py-3"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium">{event.summary}</p>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(event.eventDateTime)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {BUNDLE_TIMELINE_EVENT_TYPE_LABELS[
                    event.eventType as keyof typeof BUNDLE_TIMELINE_EVENT_TYPE_LABELS
                  ] ?? event.eventType}
                  {event.description ? ` — ${event.description}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
