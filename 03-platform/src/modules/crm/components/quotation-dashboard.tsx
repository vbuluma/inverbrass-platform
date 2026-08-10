"use client";

/**
 * Quotation list dashboard.
 */

import { FileTextIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformKpiCard } from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCrmQuotationLabels } from "@/modules/crm/crm-terminology-labels";
import type { QuotationDashboardView } from "@/modules/crm/quotation/types";

type QuotationDashboardProps = {
  data: QuotationDashboardView;
};

export function QuotationDashboard({ data }: QuotationDashboardProps) {
  const labels = useCrmQuotationLabels();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/dashboard" label="Dashboard" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-lg bg-sky-50 text-sky-800 ring-1 ring-sky-200">
              <FileTextIcon className="size-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {labels.dashboardTitle}
              </h1>
              <p className="text-sm text-muted-foreground">
                {labels.dashboardDescription}
              </p>
            </div>
          </div>
          <Link
            href="/quotations/new"
            className={cn(buttonVariants({ variant: "default" }), "gap-2")}
          >
            <PlusIcon className="size-4" aria-hidden />
            {labels.createLabel}
          </Link>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <PlatformKpiCard label={labels.metrics.total} value={data.totalQuotations} />
        <PlatformKpiCard label={labels.metrics.draft} value={data.draftCount} />
        <PlatformKpiCard label={labels.metrics.sent} value={data.sentCount} />
        <PlatformKpiCard label={labels.metrics.accepted} value={data.acceptedCount} />
        <PlatformKpiCard
          label={labels.metrics.pendingApproval}
          value={data.pendingApprovalCount}
        />
        <PlatformKpiCard
          label={labels.metrics.quotedValue}
          value={data.totalQuotedValue.toFixed(2)}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Recent Quotations</CardTitle>
          <CardDescription>Latest quotation activity for your business.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.recentQuotations.length === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.emptyTitle}</p>
          ) : (
            data.recentQuotations.map((item) => (
              <Link
                key={item.id}
                href={`/quotations/${item.id}`}
                className="flex items-center justify-between rounded-lg border px-4 py-3 transition hover:bg-muted/40"
              >
                <div>
                  <p className="font-medium">{item.quotationNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.partyDisplayName ?? item.partyId} · {item.statusLabel}
                  </p>
                </div>
                <p className="text-sm font-medium">
                  {item.grandTotal.toFixed(2)} {item.currencyCode}
                </p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
}
