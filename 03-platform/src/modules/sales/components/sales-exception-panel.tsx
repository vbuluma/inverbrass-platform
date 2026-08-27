"use client";

/**
 * Purpose:
 * Cancel, return/replace, and versioned quantity change on a sale.
 *
 * Implementation Package:
 * BP-006 / IP-04 – Amendments, Cancellation & Returns
 */

import { useState } from "react";

import { PlatformProcessingButton } from "@/components/platform";
import {
  approveSaleAmendmentAction,
  approveSaleCancellationAction,
  approveSaleDispositionAction,
  initiateSaleDispositionAction,
  proposeSaleAmendmentAction,
  requestSaleCancellationAction,
} from "@/modules/sales/actions/sales-order-actions";
import {
  SALES_CANCELLATION_REASON_CODES,
  SALES_CANCELLATION_REASON_LABELS,
  SALES_DISPOSITION_TYPES,
  SALES_INSTRUCTION_STATUS_CODES,
  SALES_ORDER_STATUS_CODES,
  SALES_RETURN_REASON_CODES,
  SALES_RETURN_REASON_LABELS,
} from "@/modules/sales/constants";
import { canCheckerApprove } from "@/modules/sales/services/handoff-rules";
import type { SalesOrderDetailView } from "@/modules/sales/types";

type SalesExceptionPanelProps = {
  order: SalesOrderDetailView;
  isPending: boolean;
  viewerUserId?: string | null;
  onRun: (
    action: () => ReturnType<typeof requestSaleCancellationAction>,
    successTitle: string
  ) => void;
};

const CANCEL_REASONS = Object.values(SALES_CANCELLATION_REASON_CODES);
const RETURN_REASONS = Object.values(SALES_RETURN_REASON_CODES);

export function SalesExceptionPanel({
  order,
  isPending,
  viewerUserId,
  onRun,
}: SalesExceptionPanelProps) {
  const [cancelReason, setCancelReason] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [amendQty, setAmendQty] = useState(order.lines[0]?.orderedQuantity ?? "1");
  const [amendReason, setAmendReason] = useState("");
  const isDraft =
    order.status === SALES_ORDER_STATUS_CODES.DRAFT ||
    order.status === SALES_ORDER_STATUS_CODES.SUBMITTED_FOR_CONFIRMATION;
  const isConfirmedOrLater =
    order.status === SALES_ORDER_STATUS_CODES.CONFIRMED ||
    order.status === SALES_ORDER_STATUS_CODES.IN_PROGRESS ||
    order.status === SALES_ORDER_STATUS_CODES.PARTIALLY_FULFILLED;
  const pendingCancel = (order.dispositions ?? []).find(
    (row) =>
      row.instructionType === SALES_DISPOSITION_TYPES.CANCEL &&
      row.status === SALES_INSTRUCTION_STATUS_CODES.PROPOSED
  );
  const pendingReturns = (order.dispositions ?? []).filter(
    (row) =>
      row.instructionType !== SALES_DISPOSITION_TYPES.CANCEL &&
      row.status === SALES_INSTRUCTION_STATUS_CODES.PROPOSED
  );
  const pendingAmendments = (order.amendments ?? []).filter(
    (row) => row.status === SALES_INSTRUCTION_STATUS_CODES.PROPOSED
  );

  return (
    <section className="flex flex-col gap-4 rounded-lg border p-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Changes, cancellation and returns
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          These requests do not refund money or move stock. Another authorised person
          must approve after confirmation.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          Cancellation reason
          <select
            className="rounded-md border px-3 py-2"
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
          >
            <option value="">Select a reason</option>
            {CANCEL_REASONS.map((code) => (
              <option key={code} value={code}>
                {SALES_CANCELLATION_REASON_LABELS[code] ?? code}
              </option>
            ))}
          </select>
        </label>
        {!pendingCancel ? (
          <PlatformProcessingButton
            type="button"
            isProcessing={isPending}
            processingLabel="Requesting…"
            idleLabel="Request cancellation"
            onClick={() =>
              onRun(
                () =>
                  requestSaleCancellationAction({
                    orderId: order.id,
                    reasonCode: cancelReason,
                  }),
                "Cancellation requested"
              )
            }
          />
        ) : canCheckerApprove({
            sodRequired: true,
            submittedBy: pendingCancel.submittedBy,
            viewerUserId,
          }) ? (
          <PlatformProcessingButton
            type="button"
            isProcessing={isPending}
            processingLabel="Cancelling…"
            idleLabel="Approve cancellation"
            onClick={() =>
              onRun(
                () => approveSaleCancellationAction(order.id),
                "Sale cancelled"
              )
            }
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Another authorised person must approve this cancellation.
          </p>
        )}
      </div>

      {isConfirmedOrLater
        ? order.lines
            .filter((line) => Number(line.openRejectedQuantity) > 0)
            .map((line) => (
              <div key={line.id} className="rounded-md border p-3">
                <p className="font-medium">
                  {line.description ?? line.offeringName ?? "Item"} —{" "}
                  {line.openRejectedQuantity} rejected waiting for a decision
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <label className="flex flex-col gap-1 text-sm">
                    Reason
                    <select
                      className="rounded-md border px-3 py-2"
                      value={returnReason}
                      onChange={(event) => setReturnReason(event.target.value)}
                    >
                      <option value="">Select a reason</option>
                      {RETURN_REASONS.map((code) => (
                        <option key={code} value={code}>
                          {SALES_RETURN_REASON_LABELS[code] ?? code}
                        </option>
                      ))}
                    </select>
                  </label>
                  <PlatformProcessingButton
                    type="button"
                    isProcessing={isPending}
                    processingLabel="Requesting…"
                    idleLabel="Return and replace"
                    onClick={() =>
                      onRun(
                        () =>
                          initiateSaleDispositionAction({
                            orderId: order.id,
                            orderLineId: line.id,
                            instructionType: SALES_DISPOSITION_TYPES.RETURN_REPLACE,
                            reasonCode: returnReason,
                          }),
                        "Replace requested"
                      )
                    }
                  />
                  <PlatformProcessingButton
                    type="button"
                    isProcessing={isPending}
                    processingLabel="Requesting…"
                    idleLabel="Return and credit"
                    onClick={() =>
                      onRun(
                        () =>
                          initiateSaleDispositionAction({
                            orderId: order.id,
                            orderLineId: line.id,
                            instructionType: SALES_DISPOSITION_TYPES.RETURN_CREDIT,
                            reasonCode: returnReason,
                          }),
                        "Credit requested"
                      )
                    }
                  />
                </div>
              </div>
            ))
        : null}

      {pendingReturns.map((row) =>
        canCheckerApprove({
          sodRequired: true,
          submittedBy: row.submittedBy,
          viewerUserId,
        }) ? (
          <PlatformProcessingButton
            key={row.id}
            type="button"
            isProcessing={isPending}
            processingLabel="Approving…"
            idleLabel={`Approve ${row.instructionTypeLabel}`}
            onClick={() =>
              onRun(
                () =>
                  approveSaleDispositionAction({
                    orderId: order.id,
                    instructionId: row.id,
                  }),
                "Decision approved"
              )
            }
          />
        ) : (
          <p key={row.id} className="text-sm text-muted-foreground">
            Another authorised person must approve this return.
          </p>
        )
      )}

      {isConfirmedOrLater && order.lines[0] ? (
        <div className="rounded-md border p-3">
          <p className="font-medium">Request a quantity change</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This creates a new version and a new commercial total. It does not edit
            the confirmed amounts in place.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-sm">
              New quantity
              <input
                className="w-28 rounded-md border px-3 py-2"
                value={amendQty}
                onChange={(event) => setAmendQty(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Reason
              <input
                className="rounded-md border px-3 py-2"
                value={amendReason}
                onChange={(event) => setAmendReason(event.target.value)}
              />
            </label>
            <PlatformProcessingButton
              type="button"
              isProcessing={isPending}
              processingLabel="Requesting…"
              idleLabel="Request change"
              onClick={() =>
                onRun(
                  () =>
                    proposeSaleAmendmentAction({
                      orderId: order.id,
                      orderLineId: order.lines[0]!.id,
                      quantity: Number(amendQty),
                      reason: amendReason,
                    }),
                  "Change requested"
                )
              }
            />
          </div>
        </div>
      ) : null}

      {pendingAmendments.map((row) =>
        canCheckerApprove({
          sodRequired: true,
          submittedBy: row.proposedBy,
          viewerUserId,
        }) ? (
          <PlatformProcessingButton
            key={row.id}
            type="button"
            isProcessing={isPending}
            processingLabel="Approving…"
            idleLabel={`Approve version ${row.versionNumber}`}
            onClick={() =>
              onRun(
                () =>
                  approveSaleAmendmentAction({
                    orderId: order.id,
                    amendmentId: row.id,
                  }),
                "Change approved"
              )
            }
          />
        ) : (
          <p key={row.id} className="text-sm text-muted-foreground">
            Another authorised person must approve this change.
          </p>
        )
      )}

      {isDraft ? (
        <p className="text-sm text-muted-foreground">
          Draft sales can still be edited before confirmation.
        </p>
      ) : null}
    </section>
  );
}
