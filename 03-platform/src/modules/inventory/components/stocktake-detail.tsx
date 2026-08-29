"use client";

/**
 * Purpose:
 * Stocktake detail — physical counts, variance, approval, and reconciliation.
 *
 * Implementation Package:
 * BP-008 / IP-06 – Stocktake & Inventory Reconciliation
 */

import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  approveStocktakeAction,
  cancelStocktakeAction,
  completeStocktakeAction,
  postStocktakeAction,
  recordStocktakeCountAction,
  recountStocktakeLineAction,
  rejectStocktakeAction,
  startStocktakeAction,
  submitStocktakeAction,
} from "@/modules/inventory/actions/inventory-stocktake-actions";
import type { InventoryStocktakeView } from "@/modules/inventory/types";

type StocktakeDetailProps = {
  stocktake: InventoryStocktakeView;
};

function statusLabel(status: string, approvalRequired: boolean): string {
  if (status === "DRAFT") return "Draft";
  if (status === "IN_PROGRESS") return "In progress";
  if (status === "SUBMITTED") return approvalRequired ? "Pending approval" : "Submitted";
  if (status === "APPROVAL_PENDING") return "Pending approval";
  if (status === "APPROVED") return "Approved";
  if (status === "POSTED") return "Reconciliation posted";
  if (status === "COMPLETED") return "Completed";
  if (status === "REJECTED") return "Rejected";
  if (status === "CANCELLED") return "Cancelled";
  return status;
}

function lineStatusLabel(status: string): string {
  if (status === "PENDING") return "Not counted";
  if (status === "COUNTED") return "Counted";
  if (status === "RECOUNTED") return "Recounted";
  return status;
}

export function StocktakeDetail({ stocktake }: StocktakeDetailProps) {
  const [detail, setDetail] = useState(stocktake);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [lotCodes, setLotCodes] = useState<Record<string, string>>({});
  const [unitCodes, setUnitCodes] = useState<Record<string, string>>({});
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inProgress = detail.status === "IN_PROGRESS";
  const canCancel =
    detail.status !== "POSTED" &&
    detail.status !== "COMPLETED" &&
    detail.status !== "CANCELLED";
  const pendingApproval = detail.status === "APPROVAL_PENDING";
  const canPost =
    detail.status === "SUBMITTED" || detail.status === "APPROVED";
  const canComplete = detail.status === "POSTED";

  function apply(
    result:
      | { success: true; data: InventoryStocktakeView }
      | { success: false; error: { message: string } },
    successMessage: string
  ) {
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setError(null);
    setMessage(successMessage);
    setDetail(result.data);
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory/stocktakes" label="Stocktakes" />
      <div>
        <h1 className="text-2xl font-semibold">{detail.documentNumber}</h1>
        <p className="text-sm text-muted-foreground">
          {detail.locationName} · {statusLabel(detail.status, detail.approvalRequired)}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-muted-foreground">Items</p>
          <p className="text-lg font-semibold">{detail.lineCount}</p>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-muted-foreground">Variances</p>
          <p className="text-lg font-semibold">{detail.varianceCount}</p>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-muted-foreground">Positive variance</p>
          <p className="text-lg font-semibold">{detail.totalPositiveVariance}</p>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-muted-foreground">Negative variance</p>
          <p className="text-lg font-semibold">{detail.totalNegativeVariance}</p>
        </div>
      </div>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold">Physical count</h2>
        {detail.lines.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Start the stocktake to capture system quantities and begin counting.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3 text-right">System qty</th>
                  <th className="py-2 pr-3 text-right">Counted qty</th>
                  <th className="py-2 pr-3">Batch</th>
                  <th className="py-2 pr-3">Serials</th>
                  <th className="py-2 pr-3 text-right">Variance</th>
                  <th className="py-2 pr-3">Unit</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {detail.lines.map((line) => (
                  <tr key={line.id} className="border-t">
                    <td className="py-2 pr-3 font-medium">{line.sku}</td>
                    <td className="py-2 pr-3 text-right">{line.snapshotQuantity}</td>
                    <td className="py-2 pr-3 text-right">
                      {inProgress ? (
                        <input
                          value={counts[line.id] ?? line.countedQuantity ?? ""}
                          onChange={(event) =>
                            setCounts((current) => ({ ...current, [line.id]: event.target.value }))
                          }
                          className="h-9 w-24 rounded-md border px-2 text-right"
                          inputMode="decimal"
                        />
                      ) : (
                        line.countedBaseQuantity ?? "—"
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {inProgress ? (
                        <input
                          value={lotCodes[line.id] ?? ""}
                          onChange={(event) =>
                            setLotCodes((current) => ({ ...current, [line.id]: event.target.value }))
                          }
                          className="h-9 w-28 rounded-md border px-2"
                          autoComplete="off"
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {inProgress ? (
                        <input
                          value={unitCodes[line.id] ?? ""}
                          onChange={(event) =>
                            setUnitCodes((current) => ({ ...current, [line.id]: event.target.value }))
                          }
                          className="h-9 w-32 rounded-md border px-2"
                          autoComplete="off"
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right">{line.varianceQuantity ?? "—"}</td>
                    <td className="py-2 pr-3">{line.baseUomCode}</td>
                    <td className="py-2">
                      <span>{lineStatusLabel(line.countStatus)}</span>
                      {inProgress ? (
                        <button
                          type="button"
                          className={cn(buttonVariants({ variant: "outline" }), "ml-2 h-8")}
                          disabled={isPending || !(counts[line.id] ?? line.countedQuantity)}
                          onClick={() =>
                            startTransition(async () => {
                              const quantity = counts[line.id] ?? line.countedQuantity ?? "";
                              const action =
                                line.countStatus === "PENDING"
                                  ? recordStocktakeCountAction
                                  : recountStocktakeLineAction;
                              apply(
                                await action(detail.id, line.id, {
                                  quantity,
                                  lotCode: lotCodes[line.id]?.trim() || null,
                                  unitCodes: (unitCodes[line.id] ?? "")
                                    .split(/[\s,]+/)
                                    .map((value) => value.trim())
                                    .filter(Boolean),
                                }),
                                line.countStatus === "PENDING" ? "Count recorded." : "Recount recorded."
                              );
                            })
                          }
                        >
                          {line.countStatus === "PENDING" ? "Enter count" : "Recount"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {detail.lines.some((line) => line.counts.length > 0) ? (
          <div className="mt-4 space-y-3">
            <h3 className="text-sm font-medium">Count history</h3>
            {detail.lines.map((line) =>
              line.counts.length === 0 ? null : (
                <div key={`${line.id}-history`} className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{line.sku}</p>
                  <ul className="mt-1 list-disc pl-5">
                    {line.counts.map((count) => (
                      <li key={`${line.id}-${count.sequence}`}>
                        {count.isRecount ? "Recount" : "Count"} {count.sequence}: {count.baseQuantity}{" "}
                        {line.baseUomCode}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            )}
          </div>
        ) : null}
      </section>
      <div className="flex flex-wrap gap-2">
        {detail.status === "DRAFT" ? (
          <button
            type="button"
            className={cn(buttonVariants(), "h-10")}
            disabled={isPending}
            onClick={() =>
              startTransition(async () => apply(await startStocktakeAction(detail.id), "Started."))
            }
          >
            Start
          </button>
        ) : null}
        {inProgress ? (
          <button
            type="button"
            className={cn(buttonVariants(), "h-10")}
            disabled={isPending}
            onClick={() =>
              startTransition(async () =>
                apply(
                  await submitStocktakeAction(detail.id),
                  detail.approvalRequired ? "Submitted for approval." : "Submitted."
                )
              )
            }
          >
            {detail.approvalRequired ? "Submit for approval" : "Submit"}
          </button>
        ) : null}
        {pendingApproval ? (
          <>
            <button
              type="button"
              className={cn(buttonVariants(), "h-10")}
              disabled={isPending}
              onClick={() =>
                startTransition(async () =>
                  apply(await approveStocktakeAction(detail.id), "Approved.")
                )
              }
            >
              Approve
            </button>
            <input
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Reason if rejecting"
              className="h-10 min-w-48 flex-1 rounded-md border px-3 text-sm"
            />
            <button
              type="button"
              className={cn(buttonVariants({ variant: "outline" }), "h-10")}
              disabled={isPending || !rejectReason.trim()}
              onClick={() =>
                startTransition(async () =>
                  apply(await rejectStocktakeAction(detail.id, rejectReason), "Rejected.")
                )
              }
            >
              Reject
            </button>
          </>
        ) : null}
        {canPost ? (
          <button
            type="button"
            className={cn(buttonVariants(), "h-10")}
            disabled={isPending}
            onClick={() =>
              startTransition(async () =>
                apply(await postStocktakeAction(detail.id), "Reconciliation posted.")
              )
            }
          >
            Post reconciliation
          </button>
        ) : null}
        {canComplete ? (
          <button
            type="button"
            className={cn(buttonVariants(), "h-10")}
            disabled={isPending}
            onClick={() =>
              startTransition(async () =>
                apply(await completeStocktakeAction(detail.id), "Completed.")
              )
            }
          >
            Complete
          </button>
        ) : null}
        {canCancel ? (
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline" }), "h-10")}
            disabled={isPending}
            onClick={() =>
              startTransition(async () =>
                apply(await cancelStocktakeAction(detail.id), "Cancelled.")
              )
            }
          >
            Cancel
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
    </main>
  );
}
