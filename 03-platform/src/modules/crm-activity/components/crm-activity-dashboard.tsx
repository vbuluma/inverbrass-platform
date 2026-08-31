/**
 * Purpose:
 * Activity dashboard — KPIs, overdue visibility, and recent activities.
 *
 * Implementation Package:
 * BP-004 / IP-05 – Activity & Task Management
 */

"use client";

import { CheckSquareIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState } from "@/components/platform/platform-empty-state";
import { PlatformKpiCard } from "@/components/platform/platform-kpi-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CRM_ACTIVITY_LIST_VIEWS } from "@/modules/crm-activity/constants";
import type { CrmActivityDashboardView } from "@/modules/crm-activity/types";

type CrmActivityDashboardProps = {
  data: CrmActivityDashboardView;
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

export function CrmActivityDashboard({ data }: CrmActivityDashboardProps) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/crm" label="Back to CRM" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-lg bg-sky-50 text-sky-800 ring-1 ring-sky-200">
                <CheckSquareIcon className="size-5" aria-hidden />
              </span>
              <h1 className="text-2xl font-semibold tracking-tight">
                Activities & Tasks
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Track customer-facing work, follow-ups, and overdue items across your team.
            </p>
          </div>
          <Link
            href="/crm/activities/new"
            prefetch={false}
            className={cn(buttonVariants({ variant: "default" }), "gap-2")}
          >
            <PlusIcon className="size-4" aria-hidden />
            Log Activity
          </Link>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <PlatformKpiCard label="Open Activities" value={data.totalOpen} />
        <PlatformKpiCard label="My Open" value={data.myOpen} />
        <PlatformKpiCard label="Overdue" value={data.overdue} />
        <PlatformKpiCard label="Due This Week" value={data.dueThisWeek} />
        <PlatformKpiCard
          label="Completed This Month"
          value={data.completedThisMonth}
        />
      </section>

      <section className="flex flex-wrap gap-2">
        <Link
          href={`/crm/activities?view=${CRM_ACTIVITY_LIST_VIEWS.MY}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          My Activities
        </Link>
        <Link
          href={`/crm/activities?view=${CRM_ACTIVITY_LIST_VIEWS.OVERDUE}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Overdue
        </Link>
        <Link
          href={`/crm/activities?view=${CRM_ACTIVITY_LIST_VIEWS.ALL}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          All Activities
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Recent Activities</h2>
        {data.recentActivities.length === 0 ? (
          <PlatformEmptyState
            title="No activities yet"
            description="Log your first customer activity to start building engagement history."
            actionLabel="Log Activity"
            actionHref="/crm/activities/new"
          />
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {data.recentActivities.map((activity) => (
              <li key={activity.id}>
                <Link
                  href={`/crm/activities/${activity.id}`}
                  className="flex flex-col gap-1 px-4 py-3 transition hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{activity.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.activityTypeLabel} · {activity.primaryPartyDisplayName}
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
                    {" · Due "}
                    {formatDate(activity.dueDate)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
