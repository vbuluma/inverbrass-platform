/**
 * Purpose:
 * Filterable activity list views.
 */

"use client";

import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState } from "@/components/platform/platform-empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CRM_ACTIVITY_LIST_VIEWS } from "@/modules/crm-activity/constants";
import type { CrmActivitySummaryView } from "@/modules/crm-activity/types";

type CrmActivityListPanelProps = {
  activities: CrmActivitySummaryView[];
  activeView: string;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const VIEW_LABELS: Record<string, string> = {
  [CRM_ACTIVITY_LIST_VIEWS.MY]: "My Activities",
  [CRM_ACTIVITY_LIST_VIEWS.OVERDUE]: "Overdue Activities",
  [CRM_ACTIVITY_LIST_VIEWS.ALL]: "All Activities",
};

export function CrmActivityListPanel({
  activities,
  activeView,
}: CrmActivityListPanelProps) {
  const title = VIEW_LABELS[activeView] ?? "Activities";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/crm/activities" label="Back to Dashboard" />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {activities.length} activit{activities.length === 1 ? "y" : "ies"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.values(CRM_ACTIVITY_LIST_VIEWS)
          .filter((view) => view !== CRM_ACTIVITY_LIST_VIEWS.TEAM)
          .map((view) => (
            <Link
              key={view}
              href={`/crm/activities?view=${view}`}
              className={cn(
                buttonVariants({
                  variant: activeView === view ? "default" : "outline",
                  size: "sm",
                })
              )}
            >
              {VIEW_LABELS[view] ?? view}
            </Link>
          ))}
      </div>

      {activities.length === 0 ? (
        <PlatformEmptyState
          title="No activities in this view"
          description="Try another filter or log a new activity."
          actionLabel="Log Activity"
          actionHref="/crm/activities/new"
        />
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {activities.map((activity) => (
            <li key={activity.id}>
              <Link
                href={`/crm/activities/${activity.id}`}
                className="flex flex-col gap-1 px-4 py-3 transition hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{activity.subject}</p>
                  <p className="text-sm text-muted-foreground">
                    {activity.activityNumber} · {activity.activityTypeLabel} ·{" "}
                    {activity.primaryPartyDisplayName}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  <span
                    className={cn(
                      activity.isOverdue && "font-medium text-destructive"
                    )}
                  >
                    {activity.statusLabel}
                  </span>
                  {" · "}
                  {activity.ownerDisplayName}
                  {" · Due "}
                  {formatDate(activity.dueDate)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
