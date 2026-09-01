"use client";

/**
 * Purpose:
 * Purchase order detail — submit, approve, issue, amend, cancel, close.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { PageBackLink } from "@/components/platform/page-back-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  approvePurchaseOrderAction,
  cancelPurchaseOrderAction,
  closePurchaseOrderAction,
  issuePurchaseOrderAction,
  rejectPurchaseOrderApprovalAction,
  submitPurchaseOrderAction,
} from "@/modules/procurement/actions/purchase-order-actions";
import type { PoFulfilmentSummaryView, PurchaseOrderView } from "@/modules/procurement/types";
import { PoReceivingPanel } from "@/modules/procurement/components/po-receiving-panel";

type PurchaseOrderWorkspaceProps = {
  order: PurchaseOrderView;
  fulfilment?: PoFulfilmentSummaryView | null;
};

export function PurchaseOrderWorkspace({ order, fulfilment }: PurchaseOrderWorkspaceProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ success: boolean; error?: { message: string } }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error?.message ?? "The purchase order could not be updated.");
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  const version = order.currentVersion;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/procurement/orders" label="Purchase orders" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{order.poNumber}</p>
          <h1 className="text-2xl font-semibold">{order.supplierName}</h1>
          <p className="text-sm text-muted-foreground">
            {order.statusLabel} · {order.currencyCode} {order.totalAmount}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {order.canSubmit ? (
            <Button
              disabled={isPending}
              onClick={() => run(() => submitPurchaseOrderAction(order.id))}
            >
              Submit
            </Button>
          ) : null}
          {order.canApprove ? (
            <>
              <Button
                disabled={isPending}
                onClick={() => run(() => approvePurchaseOrderAction(order.id))}
              >
                Approve
              </Button>
              <Button
                variant="outline"
                disabled={isPending || !reason.trim()}
                onClick={() =>
                  run(() => rejectPurchaseOrderApprovalAction(order.id, { reason }))
                }
              >
                Return
              </Button>
            </>
          ) : null}
          {order.canIssue ? (
            <Button
              disabled={isPending}
              onClick={() =>
                run(() => issuePurchaseOrderAction(order.id, { idempotencyKey: order.id }))
              }
            >
              Issue
            </Button>
          ) : null}
          {order.canCancel ? (
            <Button
              variant="outline"
              disabled={isPending || !reason.trim()}
              onClick={() => run(() => cancelPurchaseOrderAction(order.id, { reason }))}
            >
              Cancel
            </Button>
          ) : null}
          {order.canClose ? (
            <Button
              variant="outline"
              disabled={isPending || !reason.trim()}
              onClick={() => run(() => closePurchaseOrderAction(order.id, { reason }))}
            >
              Close
            </Button>
          ) : null}
        </div>
      </div>

      {(order.canApprove || order.canCancel || order.canClose) && (
        <div className="max-w-md space-y-2">
          <Label htmlFor="reason">Reason (required for return, cancel, or close)</Label>
          <Input
            id="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Enter a reason"
          />
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="rounded-lg border p-4">
        <h2 className="font-medium">Order details</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Source</dt>
            <dd>{order.sourceType}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Delivery location</dt>
            <dd>{order.deliveryLocation ?? "—"}</dd>
          </div>
          {order.awardId ? (
            <div>
              <dt className="text-muted-foreground">Award reference</dt>
              <dd className="font-mono text-xs">{order.awardId}</dd>
            </div>
          ) : null}
          {order.purchaseRequestId ? (
            <div>
              <dt className="text-muted-foreground">Purchase request</dt>
              <dd className="font-mono text-xs">{order.purchaseRequestId}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {version ? (
        <section className="rounded-lg border p-4">
          <h2 className="font-medium">Lines (version {version.versionNumber})</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4">Description</th>
                  <th className="py-2 pr-4">Qty</th>
                  <th className="py-2 pr-4">Unit price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {version.lines.map((line) => (
                  <tr key={line.id} className="border-b">
                    <td className="py-2 pr-4">{line.description}</td>
                    <td className="py-2 pr-4">
                      {line.quantity} {line.uom}
                    </td>
                    <td className="py-2 pr-4">{line.unitPrice}</td>
                    <td className="py-2 text-right">{line.lineTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {version.paymentTerms.length > 0 ? (
            <div className="mt-4">
              <h3 className="text-sm font-medium">Payment terms</h3>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {version.paymentTerms.map((term) => (
                  <li key={term.sequence}>
                    {term.milestoneName} — {term.percentage}%
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {fulfilment ? <PoReceivingPanel fulfilment={fulfilment} /> : null}

      {order.versions.length > 1 ? (
        <section className="rounded-lg border p-4">
          <h2 className="font-medium">Version history</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {order.versions.map((row) => (
              <li key={row.id}>
                v{row.versionNumber} — {row.status}
                {row.supersededAt ? " (superseded)" : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
