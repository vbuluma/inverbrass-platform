"use client";

import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  submitInternalEvaluationAction,
  submitSupplierSelfEvaluationAction,
  updatePerformanceControlAction,
} from "@/modules/procurement/actions/performance-actions";
import { procurementPerformanceMeasures } from "@/db/seeds/procurement-catalogues";
import type { SupplierProfilePerformanceView } from "@/modules/procurement/types";

type SupplierPerformanceReviewPanelProps = {
  profileId: string;
  performance: SupplierProfilePerformanceView;
  onUpdated?: (performance: SupplierProfilePerformanceView) => void;
};

export function SupplierPerformanceReviewPanel({
  profileId,
  performance,
  onUpdated,
}: SupplierPerformanceReviewPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [includeSupplier, setIncludeSupplier] = useState(
    performance.control.includeSupplierSelfEvalInAverage
  );
  const activeMeasures = useMemo(
    () => procurementPerformanceMeasures.filter((row) => row.isActive),
    []
  );
  const [ratings, setRatings] = useState<Record<string, string>>(
    Object.fromEntries(activeMeasures.map((row) => [row.code, "80"]))
  );

  const refreshLocal = (partial: Partial<SupplierProfilePerformanceView>) => {
    onUpdated?.({ ...performance, ...partial });
  };

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div>
        <h2 className="font-semibold">Performance reviews</h2>
        <p className="text-sm text-muted-foreground">
          One or more internal reviewers can score the supplier for this period. Supplier
          self-review is required; buyers choose whether supplier scores are averaged in (default:
          information only). This is separate from RFX bid evaluation.
        </p>
      </div>

      <div className="rounded-md border p-3 text-sm">
        <label className="flex items-center gap-2">
          <input
            checked={includeSupplier}
            disabled={!performance.canManagePerformance || isPending}
            type="checkbox"
            onChange={(event) => {
              const next = event.target.checked;
              setIncludeSupplier(next);
              startTransition(async () => {
                const result = await updatePerformanceControlAction(profileId, {
                  includeSupplierSelfEvalInAverage: next,
                });
                if (result.success) {
                  refreshLocal({ control: { ...performance.control, ...result.data } });
                }
              });
            }}
          />
          Include supplier self-review in the averaged score
        </label>
        {performance.pendingSupplierSelfEval ? (
          <p className="mt-2 text-amber-700">Supplier self-review is still required.</p>
        ) : null}
      </div>

      {performance.evaluations.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">Reviewer</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Composite</th>
              </tr>
            </thead>
            <tbody>
              {performance.evaluations.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2">{row.evaluatorLabel ?? row.evaluatorType}</td>
                  <td className="px-3 py-2">
                    {row.evaluatorType === "SUPPLIER" ? "Supplier self-review" : "Internal"}
                  </td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">{row.compositeScore ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No performance reviews submitted for this period yet.
        </p>
      )}

      {performance.canSubmitEvaluation ? (
        <div className="space-y-3 rounded-md border p-3">
          <h3 className="font-medium">Submit internal review</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {activeMeasures.map((measure) => (
              <div key={measure.code} className="space-y-1">
                <Label htmlFor={`rating-${measure.code}`}>{measure.name}</Label>
                <Input
                  id={`rating-${measure.code}`}
                  max={100}
                  min={0}
                  type="number"
                  value={ratings[measure.code] ?? "80"}
                  onChange={(event) =>
                    setRatings((current) => ({
                      ...current,
                      [measure.code]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await submitInternalEvaluationAction(profileId, {
                    ratings: activeMeasures.map((measure) => ({
                      measureCode: measure.code,
                      score: Number(ratings[measure.code] ?? "80"),
                    })),
                    evaluatorLabel: "Internal reviewer",
                  });
                  if (result.success) {
                    refreshLocal({
                      evaluations: [...performance.evaluations, result.data],
                    });
                  }
                })
              }
            >
              Submit my review
            </Button>
            <Button
              disabled={isPending}
              variant="outline"
              onClick={() =>
                startTransition(async () => {
                  const result = await submitSupplierSelfEvaluationAction(profileId, {
                    ratings: activeMeasures.map((measure) => ({
                      measureCode: measure.code,
                      score: Number(ratings[measure.code] ?? "75"),
                    })),
                    evaluatorLabel: "Supplier self-review",
                  });
                  if (result.success) {
                    refreshLocal({
                      evaluations: [...performance.evaluations, result.data],
                      pendingSupplierSelfEval: false,
                    });
                  }
                })
              }
            >
              Record supplier self-review
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
