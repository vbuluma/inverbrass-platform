"use client";

import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState } from "@/components/platform/platform-empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CrmCaseSummaryView } from "@/modules/crm-case/types";

type Props = { cases: CrmCaseSummaryView[]; activeView: string };

export function CrmCaseListPanel({ cases, activeView }: Props) {
  const title =
    activeView === "MY"
      ? "My Cases"
      : activeView === "QUEUE"
        ? "Unassigned Queue"
        : activeView === "OVERDUE"
          ? "Overdue Cases"
          : activeView === "ESCALATED"
            ? "Escalated Cases"
            : "All Cases";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/crm/cases" label="Back to Cases" />
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {cases.length === 0 ? (
        <PlatformEmptyState
          title="No cases found"
          description="Try another view or create a new case."
          actionLabel="Create Case"
          actionHref="/crm/cases/new"
        />
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {cases.map((item) => (
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
                    {item.isOverdue ? " · Overdue" : ""}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {item.statusLabel} · {item.priorityLabel}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href="/crm/cases/new" className={cn(buttonVariants(), "w-fit")}>
        Create Case
      </Link>
    </main>
  );
}
