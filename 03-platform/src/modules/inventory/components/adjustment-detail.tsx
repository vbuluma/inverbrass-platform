"use client";

/**
 * Purpose:
 * Stock adjustment detail — quantities, approval, posting, and history.
 *
 * Implementation Package:
 * BP-008 / IP-05 – Stock Adjustments, Damage, Loss & Returns
 */

import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  approveAdjustmentAction,
  cancelAdjustmentAction,
  postAdjustmentAction,
  rejectAdjustmentAction,
  submitAdjustmentAction,
} from "@/modules/inventory/actions/inventory-adjustment-actions";
import type { InventoryAdjustmentView } from "@/modules/inventory/types";

type AdjustmentDetailProps = {
  adjustment: InventoryAdjustmentView;
};

function statusLabel(status: string, approvalRequired: boolean): string {
  if (status === "DRAFT") {
    return "Draft";
  }
  if (status === "SUBMITTED") {
    return approvalRequired ? "Pending approval" : "Submitted";
  }
  if (status === "APPROVED") {
    return "Approved";
  }
  if (status === "POSTED") {
    return "Posted";
  }
  if (status === "REJECTED") {
    return "Rejected";
  }
  if (status === "CANCELLED") {
    return "Cancelled";
  }
  return status;
}

function movementDirection(adjustmentType: string): string {
  if (adjustmentType === "POSITIVE_ADJUSTMENT" || adjustmentType === "CUSTOMER_RETURN") {
    return "Increase";
  }
  return "Decrease";
}

export function AdjustmentDetail({ adjustment }: AdjustmentDetailProps) {
  const [detail, setDetail] = useState(adjustment);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const draft = detail.status === "DRAFT";
  const submitted = detail.status === "SUBMITTED";
  const canPost =
    detail.status !== "POSTED" &&
    detail.status !== "CANCELLED" &&
    detail.status !== "REJECTED";

  function apply(
    result:
      | { success: true; data: InventoryAdjustmentView }
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
      <PageBackLink href="/inventory/adjustments" label="Adjustments" />
      <div>
        <h1 className="text-2xl font-semibold">{detail.documentNumber}</h1>
        <p className="text-sm text-muted-foreground">
          {detail.adjustmentTypeLabel} · {detail.locationName} ·{" "}
          {statusLabel(detail.status, detail.approvalRequired)}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-muted-foreground">Type</p>
          <p className="text-lg font-semibold">{detail.adjustmentTypeLabel}</p>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-muted-foreground">Quantity</p>
          <p className="text-lg font-semibold">
            {detail.totalQuantity} {detail.lines[0]?.baseUomCode ?? ""}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-muted-foreground">Movement</p>
          <p className="text-lg font-semibold">{movementDirection(detail.adjustmentType)}</p>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <p className="text-xs text-muted-foreground">Approval</p>
          <p className="text-lg font-semibold">
            {detail.status === "APPROVED" || detail.status === "POSTED"
              ? "Approved"
              : detail.approvalRequired
                ? "Checker required"
                : "Not required"}
          </p>
        </div>
      </div>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold">Reason and origin</h2>
        <p className="mt-2 text-sm">{detail.reason}</p>
        {detail.notes ? <p className="text-sm text-muted-foreground">{detail.notes}</p> : null}
        <p className="mt-2 text-sm text-muted-foreground">
          Reference {detail.externalReference ?? "None"} · Origin {detail.originId ?? "None"}
        </p>
        <p className="text-sm text-muted-foreground">
          Created {new Date(detail.createdAt).toLocaleString()}
          {detail.createdBy ? ` · ${detail.createdBy}` : ""}
        </p>
      </section>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold">Lines</h2>
        <ul className="mt-3 divide-y">
          {detail.lines.map((line) => (
            <li key={line.id} className="grid gap-2 py-3 text-sm sm:grid-cols-3">
              <div>
                <p className="font-medium">{line.sku}</p>
                <p className="text-muted-foreground">
                  Entered {line.quantity} {line.uomCode}
                </p>
              </div>
              <div>
                <p>
                  Base {line.baseQuantity} {line.baseUomCode}
                </p>
                <p className="text-muted-foreground">
                  {movementDirection(detail.adjustmentType)} {line.baseQuantity} {line.baseUomCode}
                </p>
              </div>
              <div>
                <p>Before on-hand {line.onHandBefore ?? "—"}</p>
                <p>Resulting on-hand {line.onHandAfter ?? "—"}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold">History</h2>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li>Created {new Date(detail.createdAt).toLocaleString()}</li>
          {detail.submittedAt ? (
            <li>Submitted {new Date(detail.submittedAt).toLocaleString()}</li>
          ) : null}
          {detail.approvedAt ? (
            <li>Approved {new Date(detail.approvedAt).toLocaleString()}</li>
          ) : null}
          {detail.postedAt ? <li>Posted {new Date(detail.postedAt).toLocaleString()}</li> : null}
          {detail.rejectedAt ? (
            <li>
              Rejected {new Date(detail.rejectedAt).toLocaleString()}
              {detail.rejectionReason ? ` · ${detail.rejectionReason}` : ""}
            </li>
          ) : null}
          {detail.cancelledAt ? (
            <li>Cancelled {new Date(detail.cancelledAt).toLocaleString()}</li>
          ) : null}
        </ul>
      </section>
      <div className="flex flex-wrap gap-2">
        {draft ? (
          <button
            type="button"
            className={cn(buttonVariants(), "h-10")}
            disabled={isPending}
            onClick={() =>
              startTransition(async () =>
                apply(await submitAdjustmentAction(detail.id), "Submitted.")
              )
            }
          >
            Submit
          </button>
        ) : null}
        {submitted ? (
          <>
            <button
              type="button"
              className={cn(buttonVariants(), "h-10")}
              disabled={isPending}
              onClick={() =>
                startTransition(async () =>
                  apply(await approveAdjustmentAction(detail.id), "Approved.")
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
                  apply(await rejectAdjustmentAction(detail.id, rejectReason), "Rejected.")
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
                apply(await postAdjustmentAction(detail.id), "Posted.")
              )
            }
          >
            Post to stock
          </button>
        ) : null}
        {canPost ? (
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline" }), "h-10")}
            disabled={isPending}
            onClick={() =>
              startTransition(async () =>
                apply(await cancelAdjustmentAction(detail.id), "Cancelled.")
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
