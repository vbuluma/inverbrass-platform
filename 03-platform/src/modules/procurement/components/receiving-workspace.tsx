"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { PageBackLink } from "@/components/platform/page-back-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  confirmReceiptAction,
  recordInspectionAction,
  rejectReceiptAction,
} from "@/modules/procurement/actions/receiving-actions";
import type { ReceiptView } from "@/modules/procurement/types";

type ReceivingWorkspaceProps = {
  receipt: ReceiptView;
};

export function ReceivingWorkspace({ receipt }: ReceivingWorkspaceProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ success: boolean; error?: { message: string } }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error?.message ?? "The receipt could not be updated.");
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/procurement/receiving" label="Receiving" />
      <div>
        <p className="text-sm text-muted-foreground">{receipt.receiptNumber}</p>
        <h1 className="text-2xl font-semibold">{receipt.supplierName}</h1>
        <p className="text-sm text-muted-foreground">
          {receipt.statusLabel} · PO {receipt.poNumber}
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <section className="rounded-lg border p-4">
        <h2 className="font-semibold">Receipt details</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Type</dt>
            <dd>{receipt.receiptType.replaceAll("_", " ")}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Date</dt>
            <dd>{receipt.receiptDate}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Inspection</dt>
            <dd>{receipt.inspectionStatus}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Over delivery</dt>
            <dd>{receipt.overDeliveryFlag ? "Yes" : "No"}</dd>
          </div>
        </dl>
      </section>
      <section className="rounded-lg border p-4">
        <h2 className="font-semibold">Lines</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 pr-4">Qty</th>
                <th className="py-2 pr-4">Handoff</th>
              </tr>
            </thead>
            <tbody>
              {receipt.lines.map((line) => (
                <tr key={line.id} className="border-t">
                  <td className="py-2 pr-4">{line.description}</td>
                  <td className="py-2 pr-4">
                    {line.quantityReceived} {line.uom}
                  </td>
                  <td className="py-2 pr-4">
                    {line.handoff
                      ? `${line.handoff.status}${line.handoff.downstreamReference ? ` · ${line.handoff.downstreamReference}` : ""}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="flex flex-wrap gap-2">
        {receipt.canConfirm ? (
          <Button disabled={isPending} onClick={() => run(() => confirmReceiptAction(receipt.id))}>
            Confirm receipt
          </Button>
        ) : null}
        {receipt.canReject ? (
          <>
            <Input
              className="max-w-xs"
              placeholder="Rejection reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            <Button
              variant="outline"
              disabled={isPending || !reason.trim()}
              onClick={() => run(() => rejectReceiptAction(receipt.id, { reason }))}
            >
              Reject
            </Button>
          </>
        ) : null}
      </div>
      {receipt.canRecordInspection ? (
        <section className="rounded-lg border p-4">
          <h2 className="font-semibold">Inspection</h2>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="inspectionNotes">Notes</Label>
              <Input
                id="inspectionNotes"
                value={inspectionNotes}
                onChange={(event) => setInspectionNotes(event.target.value)}
              />
            </div>
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() =>
                run(() =>
                  recordInspectionAction(receipt.id, {
                    inspectionStatus: "PASSED",
                    inspectionNotes,
                  })
                )
              }
            >
              Mark passed
            </Button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
