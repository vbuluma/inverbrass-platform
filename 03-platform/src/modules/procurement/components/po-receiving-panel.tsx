"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createReceiptAction } from "@/modules/procurement/actions/receiving-actions";
import type { PoFulfilmentSummaryView } from "@/modules/procurement/types";

type PoReceivingPanelProps = {
  fulfilment: PoFulfilmentSummaryView;
};

export function PoReceivingPanel({ fulfilment }: PoReceivingPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  return (
    <section className="rounded-lg border p-4">
      <h2 className="font-semibold">Fulfilment</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Status: {fulfilment.fulfilmentStatusLabel}
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-2 pr-4">Line</th>
              <th className="py-2 pr-4">Ordered</th>
              <th className="py-2 pr-4">Received</th>
              <th className="py-2 pr-4">Outstanding</th>
              <th className="py-2 pr-4">Receive now</th>
            </tr>
          </thead>
          <tbody>
            {fulfilment.lines.map((line) => (
              <tr key={line.poLineId} className="border-t">
                <td className="py-2 pr-4">{line.description}</td>
                <td className="py-2 pr-4">
                  {line.orderedQuantity} ({line.lineType})
                </td>
                <td className="py-2 pr-4">{line.receivedQuantity}</td>
                <td className="py-2 pr-4">{line.outstandingQuantity}</td>
                <td className="py-2 pr-4">
                  <Input
                    className="max-w-[120px]"
                    inputMode="decimal"
                    placeholder="0"
                    value={quantities[line.poLineId] ?? ""}
                    onChange={(event) =>
                      setQuantities((current) => ({
                        ...current,
                        [line.poLineId]: event.target.value,
                      }))
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-4">
        <Button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const lines = fulfilment.lines
                .map((line) => ({
                  poLineId: line.poLineId,
                  quantityReceived: quantities[line.poLineId]?.trim() ?? "",
                }))
                .filter((line) => line.quantityReceived);
              if (lines.length === 0) {
                setError("Enter a quantity for at least one line.");
                return;
              }
              const serviceLine = fulfilment.lines.find(
                (line) => line.lineType === "SERVICE" && quantities[line.poLineId]?.trim()
              );
              const result = await createReceiptAction({
                purchaseOrderId: fulfilment.purchaseOrderId,
                lines,
                servicePeriodStart: serviceLine ? "2026-09-01" : undefined,
                servicePeriodEnd: serviceLine ? "2026-09-30" : undefined,
              });
              if (!result.success) {
                setError(result.error.message);
                return;
              }
              setError(null);
              router.refresh();
            })
          }
        >
          Confirm receipt
        </Button>
      </div>
      {fulfilment.receipts.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-medium">Related receipts</h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {fulfilment.receipts.map((row) => (
              <li key={row.id}>
                {row.receiptNumber} · {row.status} · {row.receiptDate}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
