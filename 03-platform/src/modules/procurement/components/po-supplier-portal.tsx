"use client";

/**
 * Purpose:
 * Supplier PO portal — accept, reject, or request change.
 */

import { useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  acceptPoByTokenAction,
  rejectPoByTokenAction,
  requestPoChangeByTokenAction,
} from "@/modules/procurement/actions/purchase-order-actions";
import type { PoSupplierPortalView } from "@/modules/procurement/types";

type PoSupplierPortalProps = {
  token: string;
  initial: PoSupplierPortalView;
};

export function PoSupplierPortal({ token, initial }: PoSupplierPortalProps) {
  const [view, setView] = useState(initial);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function apply(next: PoSupplierPortalView) {
    setView(next);
    setError(null);
  }

  function onAccept(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await acceptPoByTokenAction(token);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      apply(result.data);
    });
  }

  function onReject(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await rejectPoByTokenAction(token, { reason });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      apply(result.data);
    });
  }

  function onRequestChange(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await requestPoChangeByTokenAction(token, { reason });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      apply(result.data);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <div>
        <p className="text-sm text-muted-foreground">Purchase order</p>
        <h1 className="text-2xl font-semibold">{view.poNumber}</h1>
        <p className="text-sm text-muted-foreground">
          {view.supplierName} · {view.statusLabel}
        </p>
      </div>

      <section className="rounded-lg border p-4">
        <p className="text-lg font-medium">
          {view.currencyCode} {view.totalAmount}
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 pr-4">Qty</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {view.lines.map((line) => (
                <tr key={line.id} className="border-b">
                  <td className="py-2 pr-4">{line.description}</td>
                  <td className="py-2 pr-4">
                    {line.quantity} {line.uom}
                  </td>
                  <td className="py-2 text-right">{line.lineTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {view.canAccept || view.canReject || view.canRequestChange ? (
        <div className="space-y-4">
          {view.canAccept ? (
            <form onSubmit={onAccept}>
              <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                Accept purchase order
              </Button>
            </form>
          ) : null}

          {(view.canReject || view.canRequestChange) && (
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (required to reject or request change)</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Explain your response"
              />
              <div className="flex flex-wrap gap-2">
                {view.canReject ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending || !reason.trim()}
                    onClick={onReject}
                  >
                    Reject
                  </Button>
                ) : null}
                {view.canRequestChange ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending || !reason.trim()}
                    onClick={onRequestChange}
                  >
                    Request change
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          This purchase order is {view.statusLabel.toLowerCase()}. No further action is required.
        </p>
      )}
    </main>
  );
}
