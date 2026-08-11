"use client";

import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState } from "@/components/platform/platform-empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CrmVisitSummaryView } from "@/modules/crm-visit/types";

type Props = { visits: CrmVisitSummaryView[]; activeView: string };

export function CrmVisitListPanel({ visits, activeView }: Props) {
  const title =
    activeView === "MY"
      ? "My Visits"
      : activeView === "PENDING_APPROVAL"
        ? "Pending Approval"
        : "All Visits";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/crm/visits" label="Back to Visits" />
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {visits.length === 0 ? (
        <PlatformEmptyState
          title="No visits found"
          description="Try another view or log a new visit."
          actionLabel="Log Visit"
          actionHref="/crm/visits/new"
        />
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {visits.map((visit) => (
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
                <div className="text-sm text-muted-foreground">{visit.statusLabel}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href="/crm/visits/new" className={cn(buttonVariants(), "w-fit")}>
        Log Visit
      </Link>
    </main>
  );
}
