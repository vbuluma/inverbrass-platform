"use client";

/**
 * Purpose:
 * Reservation detail — quantities, fulfilment, release, and approval.
 *
 * Implementation Package:
 * BP-008 / IP-03 – Stock Reservation & Sales Deduction
 */

import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  approveReservationAction,
  fulfilReservationAction,
  rejectReservationAction,
  releaseReservationAction,
} from "@/modules/inventory/actions/inventory-reservation-actions";
import type { InventoryReservationView } from "@/modules/inventory/types";

type ReservationDetailProps = {
  reservation: InventoryReservationView;
};

function statusLabel(status: string): string {
  if (status === "PARTIALLY_FULFILLED") {
    return "Partially fulfilled";
  }
  if (status === "FULFILLED") {
    return "Fulfilled";
  }
  if (status === "RELEASED") {
    return "Reservation released";
  }
  if (status === "REQUESTED") {
    return "Pending approval";
  }
  if (status === "RESERVED") {
    return "Reserved";
  }
  if (status === "REJECTED") {
    return "Rejected";
  }
  if (status === "EXPIRED") {
    return "Expired";
  }
  return status;
}

export function ReservationDetail({ reservation }: ReservationDetailProps) {
  const [detail, setDetail] = useState(reservation);
  const [quantity, setQuantity] = useState(reservation.remainingQuantity);
  const [fulfilmentReference, setFulfilmentReference] = useState("");
  const [lotCode, setLotCode] = useState("");
  const [unitCodes, setUnitCodes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const pendingApproval = detail.status === "REQUESTED";
  const canRelease = detail.status === "RESERVED" || detail.status === "PARTIALLY_FULFILLED";
  const canFulfil = canRelease;

  function apply(
    result:
      | { success: true; data: InventoryReservationView }
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
    setQuantity(result.data.remainingQuantity);
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory/reservations" label="Reservations" />
      <div>
        <h1 className="text-2xl font-semibold">{detail.documentNumber}</h1>
        <p className="text-sm text-muted-foreground">
          {detail.sku} · {detail.locationName} · {statusLabel(detail.status)}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-muted-foreground">Requested</p>
          <p className="text-lg font-semibold">
            {detail.requestedQuantity} {detail.uomCode}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-muted-foreground">Reserved</p>
          <p className="text-lg font-semibold">
            {detail.reservedQuantity} {detail.baseUomCode}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-muted-foreground">Fulfilled</p>
          <p className="text-lg font-semibold">
            {detail.fulfilledQuantity} {detail.baseUomCode}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p className="text-lg font-semibold">
            {detail.remainingQuantity} {detail.baseUomCode}
          </p>
        </div>
      </div>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold">Sale / Order</h2>
        <p className="mt-2 text-sm">{detail.salesOrderNumber ?? "No sale linked"}</p>
        <p className="text-sm text-muted-foreground">
          Created {new Date(detail.createdAt).toLocaleString()}
        </p>
      </section>
      {pendingApproval ? (
        <section className="rounded-xl border bg-white p-4">
          <h2 className="text-base font-semibold">Approval</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This reservation must be approved before stock is held.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className={cn(buttonVariants(), "h-10")}
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  apply(await approveReservationAction(detail.id), "Reserved");
                })
              }
            >
              Approve
            </button>
            <input
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              className="h-10 min-w-48 flex-1 rounded-md border px-3"
              placeholder="Reason if rejecting"
            />
            <button
              type="button"
              className={cn(buttonVariants({ variant: "outline" }), "h-10")}
              disabled={isPending || !rejectReason.trim()}
              onClick={() =>
                startTransition(async () => {
                  apply(await rejectReservationAction(detail.id, rejectReason), "Rejected");
                })
              }
            >
              Reject
            </button>
          </div>
        </section>
      ) : null}
      {canFulfil ? (
        <section className="rounded-xl border bg-white p-4">
          <h2 className="text-base font-semibold">Deduct stock</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Stock is deducted and the reservation is reduced. Partial fulfilment is allowed.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Quantity
              <input
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="h-10 rounded-md border px-3"
                inputMode="decimal"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Fulfilment reference
              <input
                value={fulfilmentReference}
                onChange={(event) => setFulfilmentReference(event.target.value)}
                className="h-10 rounded-md border px-3"
                placeholder="FUL-000001"
                autoComplete="off"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Batch
              <input
                value={lotCode}
                onChange={(event) => setLotCode(event.target.value)}
                className="h-10 rounded-md border px-3"
                autoComplete="off"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Serials
              <input
                value={unitCodes}
                onChange={(event) => setUnitCodes(event.target.value)}
                className="h-10 rounded-md border px-3"
                autoComplete="off"
              />
            </label>
          </div>
          <button
            type="button"
            className={cn(buttonVariants(), "mt-4 h-10")}
            disabled={isPending || !quantity.trim() || !fulfilmentReference.trim()}
            onClick={() =>
              startTransition(async () => {
                apply(
                  await fulfilReservationAction(detail.id, {
                    quantity,
                    fulfilmentReference,
                    lotCode: lotCode.trim() || null,
                    unitCodes: unitCodes
                      .split(/[\s,]+/)
                      .map((value) => value.trim())
                      .filter(Boolean),
                  }),
                  "Stock deducted"
                );
              })
            }
          >
            Deduct stock
          </button>
        </section>
      ) : null}
      {canRelease ? (
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline" }), "h-10 w-fit")}
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              apply(await releaseReservationAction(detail.id), "Reservation released");
            })
          }
        >
          Release reservation
        </button>
      ) : null}
      {detail.fulfilments.length > 0 ? (
        <section className="rounded-xl border bg-white p-4">
          <h2 className="text-base font-semibold">Stock deducted</h2>
          <ul className="mt-3 divide-y">
            {detail.fulfilments.map((row) => (
              <li key={row.id} className="flex justify-between gap-3 py-2 text-sm">
                <span>{row.fulfilmentReference}</span>
                <span>
                  {row.baseQuantity} {detail.baseUomCode}
                </span>
              </li>
            ))}
          </ul>
        </section>
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
