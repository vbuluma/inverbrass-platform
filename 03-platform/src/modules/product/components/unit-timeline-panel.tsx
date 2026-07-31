/**
 * Purpose:
 * Unit timeline panel for unit workspace.
 */

"use client";

import { useState } from "react";

import { PlatformEmptyState } from "@/components/platform";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { UnitTimelinePanelView } from "@/core/unit-timeline/types";
import { UNIT_TIMELINE_EVENT_TYPE_LABELS } from "@/core/unit-timeline/constants";
import { UNIT_UI_LABELS } from "@/modules/product/unit-ui-labels";

type UnitTimelinePanelProps = {
  initialData: UnitTimelinePanelView;
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

export function UnitTimelinePanel({ initialData }: UnitTimelinePanelProps) {
  const [panel] = useState(initialData);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{UNIT_UI_LABELS.timelineHeading}</CardTitle>
        <CardDescription>
          Lifecycle events for this unit — create, conversion, activation, archive.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {panel.events.length === 0 ? (
          <PlatformEmptyState
            title="No timeline events yet"
            description="Events appear when the unit is created or updated."
          />
        ) : (
          <ul className="space-y-3">
            {panel.events.map((event) => (
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
                  {UNIT_TIMELINE_EVENT_TYPE_LABELS[
                    event.eventType as keyof typeof UNIT_TIMELINE_EVENT_TYPE_LABELS
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
