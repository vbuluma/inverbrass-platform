"use client";

import { AlertCircleIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState } from "@/components/platform/platform-empty-state";
import { PlatformKpiCard } from "@/components/platform/platform-kpi-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CRM_CASE_LIST_VIEWS } from "@/modules/crm-case/constants";
import type { CrmCaseDashboardView } from "@/modules/crm-case/types";

type Props = { data: CrmCaseDashboardView };

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function CrmCaseDashboard({ data }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/dashboard" label="Back to Dashboard" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-lg bg-sky-50 text-sky-900 ring-1 ring-sky-200">
                <AlertCircleIcon className="size-5" aria-hidden />
              </span>
              <h1 className="text-2xl font-semibold tracking-tight">Cases</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Enquiries, complaints, feedback, and service requests with SLA tracking.
            </p>
          </div>
          <Link
            href="/crm/cases/new"
            className={cn(buttonVariants({ variant: "default" }), "gap-2")}
          >
            <PlusIcon className="size-4" aria-hidden />
            Create Case
          </Link>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard label="Open" value={data.openCount} />
        <PlatformKpiCard label="Escalated" value={data.escalatedCount} />
        <PlatformKpiCard label="Overdue" value={data.overdueCount} />
        <PlatformKpiCard label="Unassigned" value={data.unassignedCount} />
      </section>

      <section className="flex flex-wrap gap-2">
        <Link
          href={`/crm/cases?view=${CRM_CASE_LIST_VIEWS.MY}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          My Cases
        </Link>
        <Link
          href={`/crm/cases?view=${CRM_CASE_LIST_VIEWS.QUEUE}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Queue
        </Link>
        <Link
          href={`/crm/cases?view=${CRM_CASE_LIST_VIEWS.OVERDUE}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Overdue
        </Link>
        <Link
          href={`/crm/cases?view=${CRM_CASE_LIST_VIEWS.ESCALATED}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Escalated
        </Link>
        <Link
          href={`/crm/cases?view=${CRM_CASE_LIST_VIEWS.ALL}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          All
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Recent Cases</h2>
        {data.recentCases.length === 0 ? (
          <PlatformEmptyState
            title="No cases yet"
            description="Register an enquiry, complaint, feedback, or service request."
            actionLabel="Create Case"
            actionHref="/crm/cases/new"
          />
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {data.recentCases.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/crm/cases/${item.id}`}
                  className="flex flex-col gap-1 px-4 py-3 transition hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{item.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.caseNumber} · {item.caseTypeLabel} ·{" "}
                      {item.primaryPartyDisplayName}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {item.statusLabel} · {formatDate(item.openedAt)}
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
