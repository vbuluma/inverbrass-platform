"use client";

import { MessageSquareIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState } from "@/components/platform/platform-empty-state";
import { PlatformKpiCard } from "@/components/platform/platform-kpi-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CRM_COMMUNICATION_LIST_VIEWS } from "@/modules/crm-communication/constants";
import type { CrmCommunicationDashboardView } from "@/modules/crm-communication/types";

type Props = { data: CrmCommunicationDashboardView };

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

export function CrmCommunicationDashboard({ data }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/dashboard" label="Back to Dashboard" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-lg bg-amber-50 text-amber-900 ring-1 ring-amber-200">
                <MessageSquareIcon className="size-5" aria-hidden />
              </span>
              <h1 className="text-2xl font-semibold tracking-tight">
                Communications
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Omnichannel interaction log with consent-aware outbound checks.
            </p>
          </div>
          <Link
            href="/crm/communications/new"
            className={cn(buttonVariants({ variant: "default" }), "gap-2")}
          >
            <PlusIcon className="size-4" aria-hidden />
            Log Communication
          </Link>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard label="Last 30 Days" value={data.totalLast30Days} />
        <PlatformKpiCard label="Outbound" value={data.outboundLast30Days} />
        <PlatformKpiCard label="Inbound" value={data.inboundLast30Days} />
        <PlatformKpiCard
          label="Consent Blocked"
          value={data.consentBlockedLast30Days}
        />
      </section>

      <section className="flex flex-wrap gap-2">
        <Link
          href={`/crm/communications?view=${CRM_COMMUNICATION_LIST_VIEWS.MY}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          My Log
        </Link>
        <Link
          href={`/crm/communications?view=${CRM_COMMUNICATION_LIST_VIEWS.OUTBOUND}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Outbound
        </Link>
        <Link
          href={`/crm/communications?view=${CRM_COMMUNICATION_LIST_VIEWS.INBOUND}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Inbound
        </Link>
        <Link
          href={`/crm/communications?view=${CRM_COMMUNICATION_LIST_VIEWS.ALL}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          All
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Recent Communications</h2>
        {data.recentCommunications.length === 0 ? (
          <PlatformEmptyState
            title="No communications yet"
            description="Log email, phone, SMS, or in-person interactions against a customer."
            actionLabel="Log Communication"
            actionHref="/crm/communications/new"
          />
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {data.recentCommunications.map((item) => (
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
                      {item.channelTypeLabel} · {item.directionLabel} ·{" "}
                      {item.primaryPartyDisplayName}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(item.communicatedAt)}
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
