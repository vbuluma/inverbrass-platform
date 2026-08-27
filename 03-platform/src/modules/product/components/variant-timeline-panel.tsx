/**
 * Purpose:
 * Variant timeline panel for variant workspace.
 *
 * Implementation Package:
 * BP-003 / IP-005 – Product Variants Engine
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
  VARIANT_TIMELINE_EVENT_TYPE_LABELS,
} from "@/core/variant-timeline/constants";
import type { VariantTimelinePanelView } from "@/core/variant-timeline/types";
import { useProductUiLabels } from "@/modules/product/product-terminology-labels";

type VariantTimelinePanelProps = {
  initialData: VariantTimelinePanelView;
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

export function VariantTimelinePanel({ initialData }: VariantTimelinePanelProps) {
  const labels = useProductUiLabels();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.variant.timelineHeading}</CardTitle>
        <CardDescription>
          Lifecycle and configuration events for this variant.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {initialData.events.length === 0 ? (
          <PlatformEmptyState
            title="No timeline events yet"
            description="Events appear when the variant is created or updated."
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
                  {VARIANT_TIMELINE_EVENT_TYPE_LABELS[
                    event.eventType as keyof typeof VARIANT_TIMELINE_EVENT_TYPE_LABELS
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
