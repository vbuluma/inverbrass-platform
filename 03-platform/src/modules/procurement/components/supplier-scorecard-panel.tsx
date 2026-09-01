"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { refreshSupplierScorecardAction } from "@/modules/procurement/actions/performance-actions";
import type { SupplierScorecardView } from "@/modules/procurement/types";

type SupplierScorecardPanelProps = {
  profileId: string;
  scorecard: SupplierScorecardView | null;
  onUpdated?: (scorecard: SupplierScorecardView) => void;
};

export function SupplierScorecardPanel({
  profileId,
  scorecard,
  onUpdated,
}: SupplierScorecardPanelProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Performance scorecard</h2>
          <p className="text-sm text-muted-foreground">
            Measures are accumulated from receipts, invoices, and exceptions.
          </p>
        </div>
        <Button
          disabled={isPending}
          variant="outline"
          onClick={() =>
            startTransition(async () => {
              const result = await refreshSupplierScorecardAction(profileId);
              if (result.success) {
                onUpdated?.(result.data);
              }
            })
          }
        >
          Refresh scorecard
        </Button>
      </div>
      {scorecard ? (
        <>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Composite score</dt>
              <dd className="text-lg font-semibold">{scorecard.compositeScore}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Period</dt>
              <dd>
                {scorecard.periodStart} → {scorecard.periodEnd}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Computed</dt>
              <dd>{scorecard.computedAt.slice(0, 10)}</dd>
            </div>
          </dl>
          {scorecard.evaluationSummary ? (
            <div className="rounded-md border p-3 text-sm">
              <p>
                Internal reviewers: {scorecard.evaluationSummary.internalEvaluatorCount} (avg{" "}
                {scorecard.evaluationSummary.internalAverageComposite ?? "—"})
              </p>
              <p>
                Supplier self-review:{" "}
                {scorecard.evaluationSummary.supplierEvaluationSubmitted
                  ? scorecard.evaluationSummary.supplierCompositeScore
                  : "Pending"}
                {scorecard.evaluationSummary.supplierIncludedInAverage
                  ? " — included in average"
                  : " — information only"}
              </p>
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2">Measure</th>
                  <th className="px-3 py-2">Events</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Weight</th>
                </tr>
              </thead>
              <tbody>
                {scorecard.measures.map((row) => (
                  <tr key={row.measureCode} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium">{row.measureName}</div>
                      <div className="text-xs text-muted-foreground">{row.dimension}</div>
                    </td>
                    <td className="px-3 py-2">{row.eventCount}</td>
                    <td className="px-3 py-2">{row.score}</td>
                    <td className="px-3 py-2">{row.weight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          No scorecard yet. Refresh to compute from transactional events.
        </p>
      )}
    </section>
  );
}
