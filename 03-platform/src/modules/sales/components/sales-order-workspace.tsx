"use client";

/**
 * Purpose:
 * Sale detail — confirmation, lifecycle, line fulfilment, and completion readiness.
 *
 * Implementation Package:
 * BP-006 / IP-01 – Sales & Order Creation
 * BP-006 / IP-02 – Order Lifecycle & Fulfilment
 * BP-006 / IP-03 – Delivery, Inspection & Service Completion
 * BP-006 / IP-04 – Amendments, Cancellation & Returns
 * BP-006 / IP-05 – Downstream Handoff & Sales Workspace
 */

import { useRef, useState, useTransition } from "react";
import Link from "next/link";

import {
  PlatformFormActionFooter,
  PlatformProcessingButton,
} from "@/components/platform";
import { PageBackLink } from "@/components/platform/page-back-link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  platformError,
  platformSuccess,
} from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
import { cn } from "@/lib/utils";
import {
  addSaleNoteAction,
  approveSaleCompletionAction,
  approveSaleConfirmationAction,
  rejectSaleCompletionAction,
  rejectSaleConfirmationAction,
  requestSaleCompletionAction,
  submitSaleConfirmationAction,
} from "@/modules/sales/actions/sales-order-actions";
import { SalesDeliveryPanel } from "@/modules/sales/components/sales-delivery-panel";
import { SalesExceptionPanel } from "@/modules/sales/components/sales-exception-panel";
import { canCheckerApprove } from "@/modules/sales/services/handoff-rules";
import {
  SALES_LIFECYCLE_STEPS,
  SALES_ORDER_STATUS_CODES,
  SALES_ORDER_STATUS_LABELS,
} from "@/modules/sales/constants";
import type { SalesOrderDetailView } from "@/modules/sales/types";

type SalesOrderWorkspaceProps = {
  initialOrder: SalesOrderDetailView;
};

const LIFECYCLE_STEP_INDEX: Record<string, number> = {
  [SALES_ORDER_STATUS_CODES.CONFIRMED]: 0,
  [SALES_ORDER_STATUS_CODES.IN_PROGRESS]: 1,
  [SALES_ORDER_STATUS_CODES.PARTIALLY_FULFILLED]: 2,
  [SALES_ORDER_STATUS_CODES.COMPLETED]: 3,
  [SALES_ORDER_STATUS_CODES.FULFILLED]: 3,
};

export function SalesOrderWorkspace({ initialOrder }: SalesOrderWorkspaceProps) {
  const [order, setOrder] = useState(initialOrder);
  const [isPending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const [actionResult, setActionResult] = useState<PlatformActionResult | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [noteBody, setNoteBody] = useState("");

  const isDraft = order.status === SALES_ORDER_STATUS_CODES.DRAFT;
  const isSubmitted =
    order.status === SALES_ORDER_STATUS_CODES.SUBMITTED_FOR_CONFIRMATION;
  const isConfirmedOrLater =
    order.status === SALES_ORDER_STATUS_CODES.CONFIRMED ||
    order.status === SALES_ORDER_STATUS_CODES.IN_PROGRESS ||
    order.status === SALES_ORDER_STATUS_CODES.PARTIALLY_FULFILLED ||
    order.status === SALES_ORDER_STATUS_CODES.COMPLETED ||
    order.status === SALES_ORDER_STATUS_CODES.FULFILLED;
  const isCancelled = order.status === SALES_ORDER_STATUS_CODES.CANCELLED;
  const isCompleted =
    order.status === SALES_ORDER_STATUS_CODES.COMPLETED ||
    order.status === SALES_ORDER_STATUS_CODES.FULFILLED;
  const completionPending = Boolean(order.completionSubmittedBy) && !isCompleted;
  const canConfirm = canCheckerApprove({
    sodRequired: order.confirmationRequiresSod,
    submittedBy: order.submittedBy,
    viewerUserId: order.viewerUserId,
  });
  const canComplete = canCheckerApprove({
    sodRequired: order.completionRequiresSod,
    submittedBy: order.completionSubmittedBy,
    viewerUserId: order.viewerUserId,
  });
  const showCompletionRequest =
    !isCompleted &&
    !isCancelled &&
    !isDraft &&
    !isSubmitted &&
    !completionPending &&
    (order.readiness.readyForCompletion || order.fulfilment.completion.completionBlocked);
  const showCompletionApprove = completionPending;

  function run(
    action: () => ReturnType<typeof submitSaleConfirmationAction>,
    successTitle: string
  ) {
    if (inFlight.current || isPending) {
      return;
    }
    inFlight.current = true;
    setActionResult(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) {
          setActionResult(
            platformError(
              "Action blocked",
              `${result.error.message}${result.error.nextAction ? ` ${result.error.nextAction}` : ""}`,
              result.error.field
            )
          );
          return;
        }
        setOrder(result.data);
        setActionResult(platformSuccess(successTitle, result.data.nextAction));
      } finally {
        inFlight.current = false;
      }
    });
  }

  const activeStep = LIFECYCLE_STEP_INDEX[order.status] ?? -1;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/sales" label="Sales" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{order.statusLabel}</p>
          <h1 className="text-2xl font-semibold">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{order.nextAction}</p>
        </div>
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
          Payment not yet recorded — collection is not available yet.
        </p>
      </div>

      <section className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Customer</p>
          <p className="font-medium">{order.customerName ?? order.customerId}</p>
          {order.crmRecordId ? (
            <Link href={`/customers/${order.crmRecordId}`} className="text-sm underline">
              Open customer
            </Link>
          ) : null}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Expected total</p>
          <p className="text-xl font-semibold">
            {order.currencyCode} {order.expectedAmount}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Order date</p>
          <p className="font-medium">{order.orderDate.slice(0, 10)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Current status</p>
          <p className="font-medium">{order.statusLabel}</p>
          {order.sourceType === "QUOTATION" && order.quotationId ? (
            <Link href={`/quotations/${order.quotationId}`} className="text-sm underline">
              Open quotation
            </Link>
          ) : null}
        </div>
      </section>

      {isConfirmedOrLater || isCancelled ? (
        <section className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Sale progress</p>
          <ol className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {SALES_LIFECYCLE_STEPS.map((step, index) => {
              const reached = activeStep >= index;
              const current = activeStep === index;
              return (
                <li key={step} className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1",
                      current
                        ? "bg-emerald-700 text-white"
                        : reached
                          ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {SALES_ORDER_STATUS_LABELS[step] ?? step}
                  </span>
                  {index < SALES_LIFECYCLE_STEPS.length - 1 ? (
                    <span className="hidden text-muted-foreground sm:inline" aria-hidden>
                      →
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
          {isCancelled ? (
            <p className="mt-3 text-sm text-muted-foreground">
              This sale is cancelled. Delivery cannot continue.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Item</th>
              <th className="px-3 py-2 font-medium">Ordered</th>
              {isConfirmedOrLater || isCancelled ? (
                <>
                  <th className="px-3 py-2 font-medium">Delivered</th>
                  <th className="px-3 py-2 font-medium">Accepted</th>
                  <th className="px-3 py-2 font-medium">Rejected</th>
                  <th className="px-3 py-2 font-medium">Missing</th>
                  <th className="px-3 py-2 font-medium">Outstanding</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </>
              ) : (
                <th className="px-3 py-2 font-medium">Line total</th>
              )}
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => (
              <tr key={line.id} className="border-t">
                <td className="px-3 py-2">
                  <Link href={`/products/${line.offeringId}`} className="hover:underline">
                    {line.description ?? line.offeringName ?? line.offeringId}
                  </Link>
                </td>
                <td className="px-3 py-2">{line.orderedQuantity}</td>
                {isConfirmedOrLater || isCancelled ? (
                  <>
                    <td className="px-3 py-2">{line.deliveredQuantity}</td>
                    <td className="px-3 py-2">{line.acceptedQuantity}</td>
                    <td className="px-3 py-2">{line.rejectedQuantity}</td>
                    <td className="px-3 py-2">{line.missingQuantity}</td>
                    <td className="px-3 py-2">{line.outstandingQuantity}</td>
                    <td className="px-3 py-2">{line.fulfilmentStatusLabel}</td>
                  </>
                ) : (
                  <td className="px-3 py-2">
                    {line.currencyCode} {line.commercialLineAmount}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {isConfirmedOrLater && !isCompleted && !isCancelled ? (
        <SalesDeliveryPanel
          order={order}
          isPending={isPending}
          viewerUserId={order.viewerUserId}
          onRun={run}
        />
      ) : null}

      {!isCompleted && !isCancelled ? (
        <SalesExceptionPanel
          order={order}
          isPending={isPending}
          viewerUserId={order.viewerUserId}
          onRun={run}
        />
      ) : null}

      <section className="rounded-lg border p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Notes do not change the expected total or move stock.
        </p>
        {(order.notes ?? []).length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm">
            {order.notes.map((note) => (
              <li key={note.id} className="rounded-md bg-muted/40 p-2">
                {note.body}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No notes yet.</p>
        )}
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex min-w-64 flex-1 flex-col gap-1 text-sm">
            Add a note
            <textarea
              className="min-h-16 rounded-md border px-3 py-2"
              value={noteBody}
              onChange={(event) => setNoteBody(event.target.value)}
            />
          </label>
          <PlatformProcessingButton
            type="button"
            isProcessing={isPending}
            processingLabel="Saving…"
            idleLabel="Save note"
            onClick={() =>
              run(
                () =>
                  addSaleNoteAction({
                    orderId: order.id,
                    body: noteBody,
                  }),
                "Note saved"
              )
            }
          />
        </div>
      </section>

      {isConfirmedOrLater && !isCompleted ? (
        <section className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Completion readiness
          </p>
          {order.fulfilment.completion.eligible ? (
            <p className="mt-2 text-sm">This sale is ready to complete.</p>
          ) : (
            <div className="mt-2">
              <p className="font-medium">Completion blocked</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {order.fulfilment.completion.blockerLabels.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : null}

      {isConfirmedOrLater && !isCompleted ? (
        <p className="text-sm text-muted-foreground">
          Customer, products, quantities and the expected total cannot be changed in place
          on a confirmed sale. Request a versioned change if needed. Payment collection is
          a later step.
        </p>
      ) : null}

      {isCompleted ? (
        <p className="text-sm text-muted-foreground">
          This sale is completed and cannot be edited as an ordinary record. Payment is not yet
          recorded.
        </p>
      ) : null}

      <PlatformFormActionFooter
        result={actionResult}
        isProcessing={isPending}
        processingLabel="Working…"
        onDismiss={() => setActionResult(null)}
      >
        <div className="flex w-full flex-col gap-3">
          {(isSubmitted && canConfirm) || (showCompletionApprove && canComplete) ? (
            <textarea
              className="min-h-20 rounded-md border px-3 py-2 text-sm"
              placeholder={
                showCompletionApprove
                  ? "Reason if you send this completion request back"
                  : "Reason if you send this sale back to draft"
              }
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            {isDraft ? (
              <PlatformProcessingButton
                type="button"
                isProcessing={isPending}
                processingLabel="Submitting…"
                idleLabel="Submit for confirmation"
                onClick={() =>
                  run(
                    () => submitSaleConfirmationAction(order.id),
                    "Submitted for confirmation"
                  )
                }
              />
            ) : null}
            {isSubmitted && canConfirm ? (
              <>
                <PlatformProcessingButton
                  type="button"
                  isProcessing={isPending}
                  processingLabel="Confirming…"
                  idleLabel="Confirm sale"
                  onClick={() =>
                    run(
                      () => approveSaleConfirmationAction(order.id),
                      "Sale confirmed"
                    )
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    run(
                      () => rejectSaleConfirmationAction(order.id, rejectReason),
                      "Confirmation rejected"
                    )
                  }
                >
                  Send back to draft
                </Button>
              </>
            ) : null}
            {isSubmitted && !canConfirm ? (
              <p className="text-sm text-muted-foreground">
                Another authorised person must confirm this sale.
              </p>
            ) : null}
            {showCompletionRequest && order.readiness.readyForCompletion ? (
              <PlatformProcessingButton
                type="button"
                isProcessing={isPending}
                processingLabel="Requesting…"
                idleLabel={
                  order.completionRequiresSod ? "Request completion" : "Complete sale"
                }
                onClick={() =>
                  run(
                    () => requestSaleCompletionAction(order.id),
                    order.completionRequiresSod
                      ? "Completion requested"
                      : "Sale completed"
                  )
                }
              />
            ) : null}
            {showCompletionApprove && canComplete ? (
              <>
                <PlatformProcessingButton
                  type="button"
                  isProcessing={isPending}
                  processingLabel="Completing…"
                  idleLabel="Complete sale"
                  onClick={() =>
                    run(
                      () => approveSaleCompletionAction(order.id),
                      "Sale completed"
                    )
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    run(
                      () => rejectSaleCompletionAction(order.id, rejectReason),
                      "Completion rejected"
                    )
                  }
                >
                  Send completion back
                </Button>
              </>
            ) : null}
            {showCompletionApprove && !canComplete ? (
              <p className="text-sm text-muted-foreground">
                Another authorised person must complete this sale.
              </p>
            ) : null}
            <Link href="/sales" className={cn(buttonVariants({ variant: "ghost" }))}>
              All sales
            </Link>
          </div>
        </div>
      </PlatformFormActionFooter>
    </main>
  );
}
