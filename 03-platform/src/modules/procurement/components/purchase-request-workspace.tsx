"use client";

/**
 * Purpose:
 * Purchase request detail — submit, approve, reject, return, cancel.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { PageBackLink } from "@/components/platform/page-back-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  approvePurchaseRequestAction,
  attachPurchaseRequestDocumentAction,
  cancelPurchaseRequestAction,
  rejectPurchaseRequestAction,
  returnPurchaseRequestAction,
  submitPurchaseRequestAction,
} from "@/modules/procurement/actions/purchase-request-actions";
import type { PurchaseRequestView } from "@/modules/procurement/types";

type PurchaseRequestWorkspaceProps = {
  request: PurchaseRequestView;
};

export function PurchaseRequestWorkspace({ request }: PurchaseRequestWorkspaceProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [fileName, setFileName] = useState("");
  const [storageReference, setStorageReference] = useState("");
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ success: boolean; error?: { message: string } }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error?.message ?? "The request could not be updated.");
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/procurement/requests" label="Purchase requests" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{request.requestNumber}</p>
          <h1 className="text-2xl font-semibold">{request.lines[0]?.description ?? "Request"}</h1>
          <p className="text-sm text-muted-foreground">
            {request.statusLabel} · {request.originLabel}
            {request.readyForSourcing ? " · Ready for sourcing" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {request.canSubmit ? (
            <Button
              disabled={isPending}
              onClick={() => run(() => submitPurchaseRequestAction(request.id))}
            >
              Submit
            </Button>
          ) : null}
          {request.canApprove ? (
            <Button
              disabled={isPending}
              onClick={() => run(() => approvePurchaseRequestAction(request.id))}
            >
              Approve
            </Button>
          ) : null}
          {request.canApprove ? (
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() =>
                run(() => rejectPurchaseRequestAction(request.id, { reason }))
              }
            >
              Reject
            </Button>
          ) : null}
          {request.canApprove ? (
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() =>
                run(() => returnPurchaseRequestAction(request.id, { reason }))
              }
            >
              Return
            </Button>
          ) : null}
          {request.canCancel ? (
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() =>
                run(() => cancelPurchaseRequestAction(request.id, { reason }))
              }
            >
              Cancel
            </Button>
          ) : null}
          {request.readyForSourcing ? (
            <Link
              href={`/procurement/sourcing/new?requestId=${request.id}`}
              className={cn(buttonVariants(), "h-9")}
            >
              Start sourcing
            </Link>
          ) : null}
        </div>
      </div>

      {request.canApprove || request.canCancel ? (
        <div className="space-y-2">
          <Label htmlFor="reason">Reason for reject, return, or cancel</Label>
          <Input
            id="reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
      ) : null}

      <section className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
        <p>
          <span className="text-muted-foreground">Value</span>
          <br />
          {request.currencyCode} {request.estimatedValue}
        </p>
        <p>
          <span className="text-muted-foreground">Budget</span>
          <br />
          {request.budgetSourceLabel} · {request.budgetCheckLabel}
        </p>
        <p>
          <span className="text-muted-foreground">Budget reference</span>
          <br />
          {request.budgetReference || "—"}
        </p>
        <p>
          <span className="text-muted-foreground">Type</span>
          <br />
          {request.procurementTypeLabel}
        </p>
        <p className="sm:col-span-2">
          <span className="text-muted-foreground">Justification</span>
          <br />
          {request.justification || "—"}
        </p>
        {request.originReference ? (
          <p className="sm:col-span-2">
            <span className="text-muted-foreground">Origin reference</span>
            <br />
            {request.originReference}
            {request.originType === "INVENTORY_REORDER" ? " (inventory reorder)" : ""}
          </p>
        ) : null}
        {request.decisionReason ? (
          <p className="sm:col-span-2">
            <span className="text-muted-foreground">Decision</span>
            <br />
            {request.decisionReason}
          </p>
        ) : null}
        {request.suggestedProfileId ? (
          <p className="sm:col-span-2">
            <span className="text-muted-foreground">Suggested supplier</span>
            <br />
            {request.suggestedSupplierEligible === false
              ? request.suggestedSupplierReason ?? "Not eligible"
              : "Recorded"}
          </p>
        ) : null}
      </section>

      <section className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Need</th>
              <th className="px-4 py-3 font-medium">Qty</th>
              <th className="px-4 py-3 font-medium">UOM</th>
              <th className="px-4 py-3 font-medium">Estimate</th>
            </tr>
          </thead>
          <tbody>
            {request.lines.map((line) => (
              <tr key={line.id} className="border-t">
                <td className="px-4 py-3">{line.description}</td>
                <td className="px-4 py-3">{line.quantity}</td>
                <td className="px-4 py-3">{line.uom}</td>
                <td className="px-4 py-3">
                  {request.currencyCode} {line.estimatedValue}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-base font-semibold">Supporting documents</h2>
        {request.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents attached.</p>
        ) : (
          <ul className="text-sm">
            {request.documents.map((document) => (
              <li key={document.id}>{document.originalFileName}</li>
            ))}
          </ul>
        )}
        {request.canEdit ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="fileName">File name</Label>
              <Input
                id="fileName"
                value={fileName}
                onChange={(event) => setFileName(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="storageReference">Document reference</Label>
              <Input
                id="storageReference"
                value={storageReference}
                onChange={(event) => setStorageReference(event.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                run(() =>
                  attachPurchaseRequestDocumentAction(request.id, {
                    documentTypeCode: "PURCHASE_REQUEST_SUPPORTING",
                    originalFileName: fileName,
                    storageReference,
                  })
                )
              }
            >
              Attach document
            </Button>
          </div>
        ) : null}
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </main>
  );
}
