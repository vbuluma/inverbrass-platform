"use client";

/**
 * Customer-scoped analytics panel for Customer 360 contribution.
 */

import { PlatformKpiCard } from "@/components/platform";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CrmCustomerAnalyticsView } from "@/modules/crm/analytics/types";

type CrmCustomerAnalyticsPanelProps = {
  data: CrmCustomerAnalyticsView;
};

export function CrmCustomerAnalyticsPanel({
  data,
}: CrmCustomerAnalyticsPanelProps) {
  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.widgets.map((widget) => (
          <PlatformKpiCard
            key={widget.id}
            label={widget.label}
            value={widget.value}
            variant={
              widget.tone === "warning"
                ? "warning"
                : widget.tone === "success"
                  ? "success"
                  : "default"
            }
          />
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Insights</CardTitle>
          <CardDescription>Rule-based customer health summary.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.insights.map((insight) => (
            <div key={insight.id} className="rounded-md border px-3 py-2 text-sm">
              <p className="font-medium">{insight.label}</p>
              <p className="text-muted-foreground">{insight.summary}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
