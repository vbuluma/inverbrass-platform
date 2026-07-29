/**
 * UX-001.1d — Recent activity card consuming timeline events.
 */

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type RecentActivityItem = {
  id: string;
  summary: string;
  eventDateTime: string;
};

type PlatformRecentActivityCardProps = {
  events: RecentActivityItem[];
  title?: string;
  maxItems?: number;
};

function formatDayGroup(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
  } catch {
    return iso;
  }
}

function groupByDay(events: RecentActivityItem[]): Map<string, RecentActivityItem[]> {
  const groups = new Map<string, RecentActivityItem[]>();
  for (const event of events) {
    const key = formatDayGroup(event.eventDateTime);
    const list = groups.get(key) ?? [];
    list.push(event);
    groups.set(key, list);
  }
  return groups;
}

export function PlatformRecentActivityCard({
  events,
  title = "Recent Activity",
  maxItems = 5,
}: PlatformRecentActivityCardProps) {
  const trimmed = events.slice(0, maxItems);
  const groups = groupByDay(trimmed);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Latest workspace events from the timeline.</CardDescription>
      </CardHeader>
      <CardContent>
        {trimmed.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity yet.</p>
        ) : (
          <div className="space-y-3">
            {[...groups.entries()].map(([day, dayEvents]) => (
              <div key={day}>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {day}
                </p>
                <ul className="space-y-1.5 text-sm">
                  {dayEvents.map((event) => (
                    <li key={event.id} className="text-foreground">
                      {event.summary}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
