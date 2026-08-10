"use client";

/**
 * CRM executive analytics dashboard.
 */

import { BarChart3Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import {
  PlatformKpiCard,
  PlatformProcessingButton,
  PROCESSING_LABELS,
  useAsyncAction,
} from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  exportCrmAnalyticsAction,
  refreshCrmAnalyticsAction,
} from "@/modules/crm/actions/crm-analytics-actions";
import { useCrmAnalyticsLabels } from "@/modules/crm/crm-terminology-labels";
import type { CrmAnalyticsDashboardView } from "@/modules/crm/analytics/types";

type CrmAnalyticsDashboardProps = {
  data: CrmAnalyticsDashboardView;
};

export function CrmAnalyticsDashboard({ data }: CrmAnalyticsDashboardProps) {
  const labels = useCrmAnalyticsLabels();
  const [dashboard, setDashboard] = useState(data);
  const [message, setMessage] = useState<string | null>(null);
  const { isProcessing, run } = useAsyncAction();

  async function handleRefresh() {
    setMessage(null);
    await run(async () => {
      const result = await refreshCrmAnalyticsAction(dashboard.filters);
      if (!result.success) {
        setMessage(result.error.message);
        return;
      }
      setDashboard(result.data);
      setMessage("Snapshots refreshed.");
    });
  }

  async function handleExport() {
    setMessage(null);
    await run(async () => {
      const result = await exportCrmAnalyticsAction(dashboard.filters);
      if (!result.success) {
        setMessage(result.error.message);
        return;
      }
      const blob = new Blob([result.data.csv], { type: result.data.contentType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.data.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("CSV export downloaded.");
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/dashboard" label={labels.backLabel} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-lg bg-violet-50 text-violet-900 ring-1 ring-violet-200">
              <BarChart3Icon className="size-5" aria-hidden />
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
          <div className="flex flex-wrap gap-2">
            <PlatformProcessingButton
              isProcessing={isProcessing}
              processingLabel={PROCESSING_LABELS.saving}
              idleLabel={labels.refreshLabel}
              onClick={handleRefresh}
            />
            <PlatformProcessingButton
              isProcessing={isProcessing}
              processingLabel={PROCESSING_LABELS.saving}
              idleLabel={labels.exportLabel}
              onClick={handleExport}
            />
          </div>
        </div>
      </div>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard label="Metric definitions" value={dashboard.metricDefinitionCount} />
        <PlatformKpiCard label="Snapshots" value={dashboard.snapshotCount} />
        <PlatformKpiCard
          label="Available KPIs"
          value={dashboard.kpis.filter((k) => k.available).length}
        />
        <PlatformKpiCard
          label="Pending sources"
          value={dashboard.kpis.filter((k) => !k.available).length}
        />
      </section>

      {dashboard.sections.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
            <CardDescription>
              {section.available
                ? section.description
                : section.pendingReason ?? labels.emptyPending}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {section.kpis.length === 0 ? (
              <p className="text-sm text-muted-foreground">{labels.emptyPending}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {section.kpis.map((kpi) => (
                  <div key={kpi.id} className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-xl font-semibold tabular-nums">
                      {kpi.available ? kpi.value : "—"}
                    </p>
                    {!kpi.available && kpi.pendingReason ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {kpi.pendingReason}
                      </p>
                    ) : null}
                    {kpi.drilldownHref ? (
                      <Link
                        href={kpi.drilldownHref}
                        className={cn(
                          buttonVariants({ variant: "link" }),
                          "h-auto px-0 text-xs"
                        )}
                      >
                        Drill down
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </main>
  );
}
