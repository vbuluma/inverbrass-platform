/**
 * Purpose:
 * Offering Analytics Dashboard — business-wide KPI overview.
 *
 * Implementation Package:
 * BP-003 / IP-012 – Offering Analytics & Performance
 */

"use client";

import { BarChart3Icon } from "lucide-react";
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
import { OFFERING_ANALYTICS_UI_LABELS } from "@/modules/product/offering-analytics-ui-labels";
import type { OfferingAnalyticsDashboardView } from "@/modules/product/types";

type OfferingAnalyticsDashboardProps = {
  data: OfferingAnalyticsDashboardView;
};

export function OfferingAnalyticsDashboard({
  data,
}: OfferingAnalyticsDashboardProps) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink
          href="/products"
          label={`Back to ${data.catalogueLabel.toLowerCase()}`}
        />
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-sky-50 text-sky-800 ring-1 ring-sky-200">
            <BarChart3Icon className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {OFFERING_ANALYTICS_UI_LABELS.dashboardTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              {OFFERING_ANALYTICS_UI_LABELS.dashboardDescription}
            </p>
          </div>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard
          label={OFFERING_ANALYTICS_UI_LABELS.metricsTotal}
          value={data.metricDefinitionCount}
        />
        <PlatformKpiCard
          label={OFFERING_ANALYTICS_UI_LABELS.snapshotsTotal}
          value={data.snapshotCount}
        />
        <PlatformKpiCard
          label={OFFERING_ANALYTICS_UI_LABELS.offeringsTracked}
          value={data.offeringsTracked}
        />
        <PlatformKpiCard
          label="Categories"
          value={data.categorySummary.length}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Metric Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {data.categorySummary.length === 0 ? (
            <PlatformEmptyState
              title="No metric definitions yet"
              description="Open an offering workspace and refresh analytics to bootstrap metrics."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.categorySummary.map((item) => (
                <div key={item.category} className="rounded-lg border p-4">
                  <div className="font-medium">{item.categoryLabel}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.count} definition{item.count === 1 ? "" : "s"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recently Refreshed</CardTitle>
          <CardDescription>Latest immutable metric snapshots</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentlyRefreshed.length === 0 ? (
            <PlatformEmptyState
              title={OFFERING_ANALYTICS_UI_LABELS.noSnapshots}
              description={OFFERING_ANALYTICS_UI_LABELS.noSnapshotsHint}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-2 py-2">Offering</th>
                    <th className="px-2 py-2">Metric</th>
                    <th className="px-2 py-2">Value</th>
                    <th className="px-2 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentlyRefreshed.map((snapshot) => (
                    <tr key={snapshot.id} className="border-b">
                      <td className="px-2 py-3">
                        <Link
                          href={`/products/${snapshot.offeringId}?tab=analytics`}
                          className="font-medium text-primary hover:underline"
                        >
                          {snapshot.offeringName}
                        </Link>
                      </td>
                      <td className="px-2 py-3">{snapshot.metricName}</td>
                      <td className="px-2 py-3">{snapshot.displayValue}</td>
                      <td className="px-2 py-3">{snapshot.snapshotDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
