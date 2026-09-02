"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  approveInvoiceAction,
  captureInvoiceAction,
  rejectInvoiceAction,
  runInvoiceMatchAction,
} from "@/modules/procurement/actions/invoice-actions";
import type { InvoiceView } from "@/modules/procurement/types";

type InvoiceWorkspaceProps = {
  invoice: InvoiceView;
};

export function InvoiceWorkspace({ invoice }: InvoiceWorkspaceProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<{ success: boolean; error?: { message: string } }>) => {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error?.message ?? "Action failed.");
        return;
      }
      setError(null);
      router.refresh();
    });
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/procurement/invoices" label="Supplier invoices" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{invoice.internalInvoiceNumber}</h1>
          <p className="text-sm text-muted-foreground">
            Supplier ref {invoice.supplierInvoiceNumber} · {invoice.supplierName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {invoice.canCapture ? (
            <Button disabled={isPending} onClick={() => run(() => captureInvoiceAction(invoice.id))}>
              Capture &amp; match
            </Button>
          ) : null}
          {invoice.canMatch ? (
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => run(() => runInvoiceMatchAction(invoice.id))}
            >
              Re-run match
            </Button>
          ) : null}
          {invoice.canApprove ? (
            <Button disabled={isPending} onClick={() => run(() => approveInvoiceAction(invoice.id))}>
              Approve
            </Button>
          ) : null}
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <section className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd>{invoice.statusLabel}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Match outcome</dt>
            <dd>{invoice.matchOutcome ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Matching mode</dt>
            <dd>{invoice.matchingMode ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Invoice date</dt>
            <dd>{invoice.invoiceDate}</dd>
          </div>
        </dl>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Purchase order</dt>
            <dd>
              {invoice.purchaseOrderId ? (
                <Link className="text-primary hover:underline" href={`/procurement/orders/${invoice.purchaseOrderId}`}>
                  {invoice.poNumber}
                </Link>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Total</dt>
            <dd>
              {invoice.currencyCode} {invoice.totalAmount}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Tax reference</dt>
            <dd>{invoice.taxReference ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Attachment</dt>
            <dd>{invoice.attachmentDocumentId ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="font-semibold">Invoice lines</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 pr-4">Qty</th>
                <th className="py-2 pr-4">Unit price</th>
                <th className="py-2 pr-4">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line) => (
                <tr key={line.id} className="border-t">
                  <td className="py-2 pr-4">{line.description}</td>
                  <td className="py-2 pr-4">
                    {line.quantity} {line.uom}
                  </td>
                  <td className="py-2 pr-4">{line.unitPrice}</td>
                  <td className="py-2 pr-4">{line.lineTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {invoice.latestMatch ? (
        <section className="rounded-lg border p-4">
          <h2 className="font-semibold">Match workbench</h2>
          <p className="mt-1 text-sm text-muted-foreground">{invoice.latestMatch.summary}</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-4">Line</th>
                  <th className="py-2 pr-4">PO qty</th>
                  <th className="py-2 pr-4">Receipt qty</th>
                  <th className="py-2 pr-4">Invoice qty</th>
                  <th className="py-2 pr-4">Variance</th>
                  <th className="py-2 pr-4">Within tolerance</th>
                </tr>
              </thead>
              <tbody>
                {invoice.latestMatch.lines.map((line) => (
                  <tr key={line.id} className="border-t">
                    <td className="py-2 pr-4">{line.description}</td>
                    <td className="py-2 pr-4">{line.poQuantity ?? "—"}</td>
                    <td className="py-2 pr-4">{line.receiptQuantity ?? "—"}</td>
                    <td className="py-2 pr-4">{line.invoiceQuantity}</td>
                    <td className="py-2 pr-4">
                      {line.varianceType ? `${line.varianceType} ${line.varianceAmount ?? ""}` : "—"}
                    </td>
                    <td className="py-2 pr-4">{line.withinTolerance ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {invoice.apHandoff ? (
        <section className="rounded-lg border p-4">
          <h2 className="font-semibold">Payment-ready handoff</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd>{invoice.apHandoff.status}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Downstream reference</dt>
              <dd>{invoice.apHandoff.downstreamReference ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Amount</dt>
              <dd>
                {invoice.apHandoff.currencyCode} {invoice.apHandoff.amount}
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

      {invoice.canReject ? (
        <section className="rounded-lg border p-4">
          <h2 className="font-semibold">Reject invoice</h2>
          <div className="mt-3 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="rejectReason">Reason</Label>
              <Input
                id="rejectReason"
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
              />
            </div>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() =>
                run(() => rejectInvoiceAction(invoice.id, { reason: rejectReason || null }))
              }
            >
              Reject
            </Button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
