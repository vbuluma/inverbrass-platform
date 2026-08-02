/**
 * Purpose:
 * Offering Governance Dashboard — business-wide governance overview.
 *
 * Implementation Package:
 * BP-003 / IP-013 – Offering Governance
 */

"use client";

import { ShieldCheckIcon } from "lucide-react";
import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState, PlatformKpiCard } from "@/components/platform";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useProductUiLabels } from "@/modules/product/product-terminology-labels";
import type { OfferingGovernanceDashboardView } from "@/modules/product/types";

type OfferingGovernanceDashboardProps = {
  data: OfferingGovernanceDashboardView;
};

export function OfferingGovernanceDashboard({
  data,
}: OfferingGovernanceDashboardProps) {
  const labels = useProductUiLabels();
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink
          href="/products"
          label={labels.governance.backLabel}
        />
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-sky-50 text-sky-800 ring-1 ring-sky-200">
            <ShieldCheckIcon className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {labels.governance.dashboardTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              {labels.governance.dashboardDescription}
            </p>
          </div>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard
          label={labels.governance.offeringsGoverned}
          value={data.governanceCount}
        />
        <PlatformKpiCard
          label={labels.governance.readyCount}
          value={data.readyCount}
        />
        <PlatformKpiCard
          label={labels.governance.nonCompliantCount}
          value={data.nonCompliantCount}
        />
        <PlatformKpiCard
          label={labels.governance.averageReadiness}
          value={`${data.averageReadiness}%`}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Governance Status Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {data.statusSummary.length === 0 ? (
            <PlatformEmptyState
              title="No governance records yet"
              description={labels.governance.emptyRecordsDescription}
            />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {data.statusSummary.map((row) => (
                <li
                  key={row.status}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span>{row.statusLabel}</span>
                  <span className="font-medium">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Governance Activity</CardTitle>
          <CardDescription>
            Latest offerings with governance records and readiness scores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentGovernance.length === 0 ? (
            <PlatformEmptyState
              title="No recent activity"
              description={labels.governance.recentActivityDescription}
            />
          ) : (
            <ul className="space-y-2">
              {data.recentGovernance.map((row) => (
                <li key={row.offeringId}>
                  <Link
                    href={`/products/${row.offeringId}?tab=governance`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <span>
                      <span className="font-medium">{row.offeringCode}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        — {row.offeringName}
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      {row.governanceStatusLabel} · {row.readinessScore}%
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
