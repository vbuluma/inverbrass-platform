/**
 * Purpose:
 * Customer 360 timeline section — consumes BP-002 Party Timeline only.
 *
 * CRM modules append events to Party Timeline; Customer 360 reads that feed.
 * Full timeline depth lives on the dedicated Timeline workspace tab.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

"use client";

import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PartyTimelineEventView } from "@/core/party-timeline";
import { PartyTimelinePanel } from "@/modules/party/components/party-timeline-panel";
import type { PartyTimelinePanelView } from "@/modules/party/types";

type Customer360TimelineSectionProps = {
  partyId: string;
  timelinePanel: PartyTimelinePanelView;
  previewEvents: PartyTimelineEventView[];
  sourceLabel: string;
  title?: string;
};

export function Customer360TimelineSection({
  partyId,
  timelinePanel,
  previewEvents,
  sourceLabel,
  title = "Activity timeline",
}: Customer360TimelineSectionProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Consumes {sourceLabel}. CRM does not maintain a separate timeline store.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {previewEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No timeline events yet.</p>
          ) : (
            previewEvents.map((event) => (
              <div key={event.id} className="rounded-lg border px-3 py-2 text-sm">
                <div className="font-medium">{event.summary}</div>
                <div className="text-muted-foreground">
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(event.eventDateTime))}{" "}
                  · {event.sourceModuleLabel}
                </div>
              </div>
            ))
          )}
          <Link
            href={`?tab=timeline`}
            className="inline-block text-sm text-primary hover:underline"
          >
            Open full Party Timeline tab
          </Link>
        </CardContent>
      </Card>

      <details className="rounded-lg border bg-muted/10 p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Expand embedded Party Timeline panel
        </summary>
        <div className="mt-4">
          <PartyTimelinePanel partyId={partyId} initialData={timelinePanel} />
        </div>
      </details>
    </div>
  );
}
