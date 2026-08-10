"use client";

import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState } from "@/components/platform/platform-empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CrmCommunicationSummaryView } from "@/modules/crm-communication/types";

type Props = { communications: CrmCommunicationSummaryView[]; activeView: string };

export function CrmCommunicationListPanel({ communications, activeView }: Props) {
  const title =
    activeView === "MY"
      ? "My Communications"
      : activeView === "OUTBOUND"
        ? "Outbound"
        : activeView === "INBOUND"
          ? "Inbound"
          : "All Communications";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/crm/communications" label="Back to Communications" />
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {communications.length === 0 ? (
        <PlatformEmptyState
          title="No communications found"
          description="Try another view or log a new interaction."
          actionLabel="Log Communication"
          actionHref="/crm/communications/new"
        />
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {communications.map((item) => (
            <li key={item.id}>
              <Link
                href={`/crm/communications/${item.id}`}
                className="flex flex-col gap-1 px-4 py-3 transition hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {item.subject || item.summary.slice(0, 80)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.channelTypeLabel} · {item.primaryPartyDisplayName}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">{item.directionLabel}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href="/crm/communications/new" className={cn(buttonVariants(), "w-fit")}>
        Log Communication
      </Link>
    </main>
  );
}
