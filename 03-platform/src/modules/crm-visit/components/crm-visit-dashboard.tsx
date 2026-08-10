"use client";

import { MapPinIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState } from "@/components/platform/platform-empty-state";
import { PlatformKpiCard } from "@/components/platform/platform-kpi-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CRM_VISIT_LIST_VIEWS } from "@/modules/crm-visit/constants";
import type { CrmVisitDashboardView } from "@/modules/crm-visit/types";

type Props = { data: CrmVisitDashboardView };

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(iso)
    );
  } catch {
    return iso;
  }
}

export function CrmVisitDashboard({ data }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/dashboard" label="Back to Dashboard" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
                <MapPinIcon className="size-5" aria-hidden />
              </span>
              <h1 className="text-2xl font-semibold tracking-tight">
                Visits & Call Reports
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Collaborative visit documentation, action items, and approval workflow.
            </p>
          </div>
          <Link
            href="/crm/visits/new"
            className={cn(buttonVariants({ variant: "default" }), "gap-2")}
          >
            <PlusIcon className="size-4" aria-hidden />
            Log Visit
          </Link>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard label="Draft / In Progress" value={data.totalDraft} />
        <PlatformKpiCard label="Pending Approval" value={data.pendingApproval} />
        <PlatformKpiCard label="My Open Actions" value={data.myOpenActionItems} />
        <PlatformKpiCard label="Approved (Month)" value={data.approvedThisMonth} />
      </section>

      <section className="flex flex-wrap gap-2">
        <Link
          href={`/crm/visits?view=${CRM_VISIT_LIST_VIEWS.MY}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          My Visits
        </Link>
        <Link
          href={`/crm/visits?view=${CRM_VISIT_LIST_VIEWS.PENDING_APPROVAL}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Pending Approval
        </Link>
        <Link
          href={`/crm/visits?view=${CRM_VISIT_LIST_VIEWS.ALL}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          All Visits
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Recent Visits</h2>
        {data.recentVisits.length === 0 ? (
          <PlatformEmptyState
            title="No visits yet"
            description="Log a customer visit or create one from a completed appointment."
            actionLabel="Log Visit"
            actionHref="/crm/visits/new"
          />
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {data.recentVisits.map((visit) => (
              <li key={visit.id}>
                <Link
                  href={`/crm/visits/${visit.id}`}
                  className="flex flex-col gap-1 px-4 py-3 transition hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{visit.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      {visit.visitTypeLabel} · {visit.primaryPartyDisplayName}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {visit.statusLabel} · {formatDate(visit.visitDate)}
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
