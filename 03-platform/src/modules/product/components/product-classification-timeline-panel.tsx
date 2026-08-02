/**
 * Purpose:
 * Catalogue Structure timeline panel for classification workspace.
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
import type { ClassificationTimelinePanelView } from "@/core/product-classification-timeline";
import { useBusinessTerminology } from "@/core/industry-experience/business-terminology-context";
import { useProductUiLabels } from "@/modules/product/product-terminology-labels";

type ProductClassificationTimelinePanelProps = {
  initialData: ClassificationTimelinePanelView;
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

export function ProductClassificationTimelinePanel({
  initialData,
}: ProductClassificationTimelinePanelProps) {
  const labels = useProductUiLabels();
  const terminology = useBusinessTerminology();
  const [panel] = useState(initialData);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.catalogueStructure.timelineHeading}</CardTitle>
        <CardDescription>
          Lifecycle events for this catalogue node — create, update, move, assignments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {panel.events.length === 0 ? (
          <PlatformEmptyState
            title="No Timeline Events Yet"
            description={`Events appear when this catalogue node is created, updated, moved, or receives ${terminology.offerings.plural.toLowerCase()} assignments.`}
          />
        ) : (
          <ul className="divide-y">
            {panel.events.map((event) => (
              <li key={event.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{event.summary}</p>
                    <p className="text-sm text-muted-foreground">
                      {event.eventType.replaceAll("_", " ")}
                    </p>
                  </div>
                  <time
                    className="text-sm text-muted-foreground"
                    dateTime={event.eventDateTime}
                  >
                    {formatDateTime(event.eventDateTime)}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
