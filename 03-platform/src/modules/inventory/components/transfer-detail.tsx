"use client";

/**
 * Purpose:
 * Transfer detail — dispatch, receive, approve, reject, and cancel.
 *
 * Implementation Package:
 * BP-008 / IP-04 – Stock Transfers & Multi-Location
 */

import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  approveTransferAction,
  cancelTransferAction,
  dispatchTransferAction,
  receiveTransferAction,
  rejectTransferAction,
} from "@/modules/inventory/actions/inventory-transfer-actions";
import { INVENTORY_TRANSFER_STATUS_LABELS } from "@/modules/inventory/constants";
import type { InventoryTransferStatus } from "@/modules/inventory/constants";
import type { InventoryTransferView } from "@/modules/inventory/types";

type TransferDetailProps = {
  transfer: InventoryTransferView;
};

function statusLabel(status: string): string {
  return INVENTORY_TRANSFER_STATUS_LABELS[status as InventoryTransferStatus] ?? status;
}

function formatWhen(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "—";
}

export function TransferDetail({ transfer }: TransferDetailProps) {
  const [detail, setDetail] = useState(transfer);
  const [received, setReceived] = useState<Record<string, string>>(
    Object.fromEntries(transfer.lines.map((line) => [line.id, line.baseQuantity]))
  );
  const [rejectReason, setRejectReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canApprove = detail.status === "APPROVAL_PENDING";
  const canDispatch = detail.status === "REQUESTED" || detail.status === "APPROVED";
  const canReceive = detail.status === "IN_TRANSIT" || detail.status === "DISPATCHED";
  const canCancel =
    detail.status === "DRAFT" || detail.status === "REQUESTED" || detail.status === "APPROVED";

  function apply(
    result:
      | { success: true; data: InventoryTransferView }
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
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory/transfers" label="Transfers" />
      <div>
        <h1 className="text-2xl font-semibold">Transfer {detail.transferNumber}</h1>
        <p className="text-sm text-muted-foreground">
          From: {detail.sourceLocationName}
          <br />
          To: {detail.destinationLocationName}
        </p>
        <p className="mt-2 text-sm">Status: {statusLabel(detail.status)}</p>
      </div>

      <ul className="divide-y rounded-xl border bg-white">
        <li className="hidden grid-cols-3 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid">
          <span>Product</span>
          <span>Qty</span>
          <span>Received</span>
        </li>
        {detail.lines.map((line) => (
          <li key={line.id} className="grid gap-1 px-4 py-3 sm:grid-cols-3 sm:items-center">
            <p className="font-medium">{line.sku}</p>
            <p className="text-sm">
              {line.baseQuantity} {line.baseUomCode ?? ""}
            </p>
            <p className="text-sm text-muted-foreground">{line.receivedQuantity ?? "—"}</p>
          </li>
        ))}
      </ul>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-muted-foreground">Dispatched by</p>
          <p className="text-sm font-medium">{detail.dispatchedBy ?? "—"}</p>
          <p className="text-xs text-muted-foreground">Dispatched: {formatWhen(detail.dispatchedAt)}</p>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-muted-foreground">Received</p>
          <p className="text-sm font-medium">
            {detail.totalReceived} / {detail.totalQuantity}
          </p>
          <p className="text-xs text-muted-foreground">Received: {formatWhen(detail.receivedAt)}</p>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-muted-foreground">Discrepancy</p>
          <p className="text-lg font-semibold">{detail.totalDiscrepancy}</p>
          <p className="text-xs text-muted-foreground">In transit: {detail.inTransitQuantity}</p>
        </div>
      </div>

      {canApprove ? (
        <section className="space-y-3 rounded-xl border bg-white p-4">
          <h2 className="text-base font-semibold">Approval</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={cn(buttonVariants(), "h-10")}
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  apply(await approveTransferAction(detail.id), "Transfer approved.");
                })
              }
            >
              Approve transfer
            </button>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            Rejection reason
            <input
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              className="h-10 rounded-md border px-3"
            />
          </label>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline" }), "h-10")}
            disabled={isPending || !rejectReason.trim()}
            onClick={() =>
              startTransition(async () => {
                apply(await rejectTransferAction(detail.id, rejectReason), "Transfer rejected.");
              })
            }
          >
            Reject transfer
          </button>
        </section>
      ) : null}

      {canDispatch ? (
        <button
          type="button"
          className={cn(buttonVariants(), "h-10 w-fit")}
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              apply(await dispatchTransferAction(detail.id), "Transfer dispatched.");
            })
          }
        >
          Dispatch transfer
        </button>
      ) : null}

      {canReceive ? (
        <section className="space-y-3 rounded-xl border bg-white p-4">
          <h2 className="text-base font-semibold">Receive transfer</h2>
          {detail.lines.map((line) => (
            <label key={line.id} className="flex flex-col gap-1 text-sm">
              {line.sku} received
              <input
                value={received[line.id] ?? line.baseQuantity}
                onChange={(event) =>
                  setReceived((current) => ({ ...current, [line.id]: event.target.value }))
                }
                className="h-10 rounded-md border px-3"
                inputMode="decimal"
              />
              <span className="text-xs text-muted-foreground">
                Dispatched: {line.baseQuantity}
              </span>
            </label>
          ))}
          <label className="flex flex-col gap-1 text-sm">
            Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-20 rounded-md border px-3 py-2"
            />
          </label>
          <button
            type="button"
            className={cn(buttonVariants(), "h-10")}
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                apply(
                  await receiveTransferAction({
                    transferId: detail.id,
                    notes,
                    lines: detail.lines.map((line) => ({
                      lineId: line.id,
                      receivedQuantity: received[line.id] ?? line.baseQuantity,
                    })),
                  }),
                  "Transfer received."
                );
              })
            }
          >
            Receive transfer
          </button>
        </section>
      ) : null}

      {canCancel ? (
        <section className="space-y-3 rounded-xl border bg-white p-4">
          <h2 className="text-base font-semibold">Cancel transfer</h2>
          <label className="flex flex-col gap-1 text-sm">
            Cancellation reason
            <input
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              className="h-10 rounded-md border px-3"
            />
          </label>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline" }), "h-10")}
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                apply(await cancelTransferAction(detail.id, cancelReason), "Transfer cancelled.");
              })
            }
          >
            Cancel transfer
          </button>
        </section>
      ) : null}

      {detail.status === "DISCREPANCY" ? (
        <p className="text-sm text-amber-800">
          Dispatched: {detail.totalQuantity}. Received: {detail.totalReceived}. Discrepancy:{" "}
          {detail.totalDiscrepancy}. This transfer stays open until the shortage is investigated.
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
    </main>
  );
}
