"use client";

import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformKpiCard } from "@/components/platform";
import { Button } from "@/components/ui/button";
import { exportProcurementAnalyticsCsvAction } from "@/modules/procurement/actions/procurement-analytics-actions";
import type { ProcurementAnalyticsDashboardView } from "@/modules/procurement/types";

type ProcurementAnalyticsDashboardProps = {
  data: ProcurementAnalyticsDashboardView;
};

export function ProcurementAnalyticsDashboard({ data }: ProcurementAnalyticsDashboardProps) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/procurement" label="Procurement" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Procurement analytics</h1>
            <p className="text-sm text-muted-foreground">
              Operational intelligence from purchase requests through payment handoff.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              const result = await exportProcurementAnalyticsCsvAction();
              if (!result.success) {
                return;
              }
              const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = "procurement-analytics.csv";
              anchor.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {data.sections.map((section) => (
        <section key={section.id} className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <p className="text-sm text-muted-foreground">{section.description}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {section.kpis.map((kpi) => (
              <PlatformKpiCard
                key={kpi.id}
                label={kpi.label}
                value={kpi.value}
                description={kpi.formula ?? undefined}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="grid gap-4 lg:grid-cols-3">
        <SpendTable title="Spend by supplier" rows={data.spendBySupplier} />
        <SpendTable title="Spend by category" rows={data.spendByCategory} />
        <SpendTable title="Spend by business unit" rows={data.spendByBusinessUnit} />
      </section>
    </main>
  );
}

function SpendTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; amount: string }>;
}) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 font-medium">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No issued purchase orders yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {rows.slice(0, 8).map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-3">
              <span>{row.label}</span>
              <span className="font-medium">{row.amount}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
