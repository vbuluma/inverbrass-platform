/**
 * Purpose:
 * Product Workspace Analytics panel — KPI cards, trends, filters, refresh.
 *
 * Implementation Package:
 * BP-003 / IP-012 – Offering Analytics & Performance
 */

"use client";

import { BarChart3Icon, DownloadIcon } from "lucide-react";
import { useMemo, useState } from "react";

import {
  PlatformEmptyState,
  PlatformKpiCard,
  PlatformProcessingButton,
  PlatformSearchState,
  usePanelFeedback,
} from "@/components/platform";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  exportOfferingAnalyticsAction,
  getProductAnalyticsPanelAction,
  refreshOfferingAnalyticsAction,
} from "@/modules/product/actions/offering-analytics-actions";
import { OFFERING_ANALYTICS_UI_LABELS } from "@/modules/product/offering-analytics-ui-labels";
import {
  OFFERING_METRIC_CATEGORIES,
  OFFERING_SNAPSHOT_PERIODS,
} from "@/modules/product/constants";
import type { ProductAnalyticsPanelView } from "@/modules/product/types";

type ProductAnalyticsPanelProps = {
  productId: string;
  initialData: ProductAnalyticsPanelView;
};

function formatDateTime(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ProductAnalyticsPanel({
  productId,
  initialData,
}: ProductAnalyticsPanelProps) {
  const [panel, setPanel] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [dateFrom, setDateFrom] = useState(initialData.dateFrom);
  const [dateTo, setDateTo] = useState(initialData.dateTo);
  const [metricCategory, setMetricCategory] = useState("");
  const [snapshotPeriod, setSnapshotPeriod] = useState(initialData.snapshotPeriod);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const {
    isPending,
    runPanelAction,
    FormFeedback,
  } = usePanelFeedback<ProductAnalyticsPanelView>();

  const filteredSections = useMemo(() => {
    if (!metricCategory) {
      return panel.sections;
    }
    return panel.sections.filter((section) => section.category === metricCategory);
  }, [panel.sections, metricCategory]);

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setPanel(initialData);
  }

  function applyPanel(data: ProductAnalyticsPanelView) {
    setPanel(data);
    setDateFrom(data.dateFrom);
    setDateTo(data.dateTo);
    setSnapshotPeriod(data.snapshotPeriod);
  }

  function reloadPanel() {
    runPanelAction(
      () =>
        getProductAnalyticsPanelAction(productId, {
          dateFrom,
          dateTo,
          metricCategory: metricCategory || undefined,
          snapshotPeriod,
        }),
      {
        successTitle: "Analytics updated.",
        successMessage: "Filters applied to the analytics panel.",
        onSuccess: applyPanel,
      }
    );
  }

  function onRefresh() {
    runPanelAction(
      async () => {
        const refreshResult = await refreshOfferingAnalyticsAction({
          offeringId: productId,
          snapshotPeriod,
        });
        if (!refreshResult.success) {
          return refreshResult;
        }
        return getProductAnalyticsPanelAction(productId, {
          dateFrom,
          dateTo,
          metricCategory: metricCategory || undefined,
          snapshotPeriod,
        });
      },
      {
        successTitle: "Analytics refreshed.",
        successMessage: "Metric snapshots were generated for this offering.",
        onSuccess: applyPanel,
      }
    );
  }

  function onExport() {
    void exportOfferingAnalyticsAction(productId, {
      dateFrom,
      dateTo,
      metricCategory: metricCategory || undefined,
      snapshotPeriod,
    }).then((result) => {
      if (!result.success) {
        setExportNote(result.error.message);
        return;
      }
      setExportNote(result.data.note);
    });
  }

  const hasSnapshots = panel.snapshots.length > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <BarChart3Icon className="size-5 text-sky-700" aria-hidden />
          <h2 className="text-lg font-semibold tracking-tight">
            {OFFERING_ANALYTICS_UI_LABELS.panelTitle}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {OFFERING_ANALYTICS_UI_LABELS.panelDescription}
        </p>
      </div>

      <FormFeedback />

      <div className="flex flex-wrap gap-2">
        <PlatformProcessingButton
          type="button"
          isProcessing={isPending}
          processingLabel="Refreshing…"
          idleLabel={OFFERING_ANALYTICS_UI_LABELS.refreshAnalytics}
          onClick={onRefresh}
        />
        <Button type="button" variant="outline" onClick={onExport}>
          <DownloadIcon className="mr-1 size-4" aria-hidden />
          {OFFERING_ANALYTICS_UI_LABELS.exportAnalytics}
        </Button>
      </div>

      {exportNote ? (
        <p className="text-sm text-muted-foreground">{exportNote}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="analytics-date-from">
              {OFFERING_ANALYTICS_UI_LABELS.filterDateFrom}
            </Label>
            <Input
              id="analytics-date-from"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="analytics-date-to">
              {OFFERING_ANALYTICS_UI_LABELS.filterDateTo}
            </Label>
            <Input
              id="analytics-date-to"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="analytics-category">
              {OFFERING_ANALYTICS_UI_LABELS.filterCategory}
            </Label>
            <select
              id="analytics-category"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={metricCategory}
              onChange={(event) => setMetricCategory(event.target.value)}
            >
              <option value="">All categories</option>
              {Object.values(OFFERING_METRIC_CATEGORIES).map((category) => (
                <option key={category} value={category}>
                  {category.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="analytics-period">
              {OFFERING_ANALYTICS_UI_LABELS.filterPeriod}
            </Label>
            <select
              id="analytics-period"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={snapshotPeriod}
              onChange={(event) => setSnapshotPeriod(event.target.value)}
            >
              {Object.values(OFFERING_SNAPSHOT_PERIODS).map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-4">
            <Button type="button" variant="outline" disabled={isPending} onClick={reloadPanel}>
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">
          {OFFERING_ANALYTICS_UI_LABELS.sectionPerformanceSummary}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PlatformKpiCard label="Status" value={panel.statusName} />
          <PlatformKpiCard
            label={OFFERING_ANALYTICS_UI_LABELS.lastRefreshed}
            value={formatDateTime(panel.lastRefreshedAt)}
          />
          <PlatformKpiCard label="Snapshots" value={panel.snapshots.length} />
          <PlatformKpiCard label="Period" value={panel.snapshotPeriodLabel} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">
          {OFFERING_ANALYTICS_UI_LABELS.sectionKpiCards}
        </h3>
        {!hasSnapshots ? (
          <PlatformEmptyState
            title={OFFERING_ANALYTICS_UI_LABELS.noSnapshots}
            description={OFFERING_ANALYTICS_UI_LABELS.noSnapshotsHint}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {panel.kpiCards.map((kpi) => (
              <PlatformKpiCard
                key={kpi.metricCode}
                label={kpi.label}
                value={kpi.value}
                description={kpi.helperText ?? kpi.categoryLabel}
              />
            ))}
          </div>
        )}
      </section>

      {filteredSections.map((section) => (
        <Card key={section.category}>
          <CardHeader>
            <CardTitle>{section.categoryLabel}</CardTitle>
            <CardDescription>
              {section.kpis.length} metric{section.kpis.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {section.kpis.length === 0 ? (
              <PlatformSearchState status="empty" emptyTitle="No metrics in this category." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {section.kpis.map((kpi) => (
                  <PlatformKpiCard
                    key={`${section.category}-${kpi.metricCode}`}
                    label={kpi.label}
                    value={kpi.value}
                    description={kpi.helperText ?? undefined}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>{OFFERING_ANALYTICS_UI_LABELS.sectionTrends}</CardTitle>
          <CardDescription>Recent immutable snapshots</CardDescription>
        </CardHeader>
        <CardContent>
          {panel.trends.length === 0 ? (
            <PlatformEmptyState
              title={OFFERING_ANALYTICS_UI_LABELS.noSnapshots}
              description={OFFERING_ANALYTICS_UI_LABELS.noSnapshotsHint}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-2 py-2">Date</th>
                    <th className="px-2 py-2">Metric</th>
                    <th className="px-2 py-2">Value</th>
                    <th className="px-2 py-2">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {panel.trends.map((snapshot) => (
                    <tr key={snapshot.id} className="border-b">
                      <td className="px-2 py-3">{snapshot.snapshotDate}</td>
                      <td className="px-2 py-3">{snapshot.metricName}</td>
                      <td className="px-2 py-3">{snapshot.displayValue}</td>
                      <td className="px-2 py-3">{snapshot.metricCategoryLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
