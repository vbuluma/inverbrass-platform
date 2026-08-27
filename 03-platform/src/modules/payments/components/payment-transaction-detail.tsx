"use client";

/**
 * Purpose:
 * Staff payment-transaction detail. No provider secrets.
 *
 * Implementation Package:
 * BP-007 / IP-02 – Payment Initiation & Processing
 */

import { useState, useTransition } from "react";
import { BanknoteIcon } from "lucide-react";
import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { refreshPaymentStatusAction } from "@/modules/payments/actions/payment-initiation-actions";
import {
  queryExceptionProviderAction,
  retryExceptionPaymentAction,
} from "@/modules/payments/actions/payment-exception-actions";
import { issueReceiptAction } from "@/modules/payments/actions/payment-receipt-actions";
import {
  approveRefundAction,
  requestRefundAction,
} from "@/modules/payments/actions/payment-refund-actions";
import type {
  PaymentExceptionView,
  PaymentTransactionView,
  ReceiptView,
  RefundEligibilityView,
  SettlementView,
} from "@/modules/payments/types";

type PaymentTransactionDetailProps = {
  data: PaymentTransactionView;
  receipt?: ReceiptView | null;
  refunds?: RefundEligibilityView | null;
  settlement?: SettlementView | null;
  exceptions?: PaymentExceptionView[];
};

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid gap-1 border-b py-3 sm:grid-cols-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium sm:col-span-2">{value || "—"}</p>
    </div>
  );
}

export function PaymentTransactionDetail({
  data,
  receipt = null,
  refunds = null,
  settlement = null,
  exceptions = [],
}: PaymentTransactionDetailProps) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState(data.customerMessage);
  const [statusLabel, setStatusLabel] = useState(data.statusLabel);
  const [providerRef, setProviderRef] = useState(data.providerTransactionReference);
  const [refundType, setRefundType] = useState("FULL_REFUND");
  const [refundAmount, setRefundAmount] = useState(refunds?.refundableAmount ?? "");
  const [refundReason, setRefundReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const canRefresh =
    data.captureMode !== "MANUAL" &&
    data.status !== "SUCCESSFUL" &&
    data.status !== "FAILED" &&
    data.status !== "EXPIRED";

  function onRefresh() {
    setError(null);
    startTransition(async () => {
      const result = await refreshPaymentStatusAction(data.id);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setMessage(result.data.transaction.customerMessage);
      setStatusLabel(result.data.transaction.statusLabel);
      setProviderRef(result.data.transaction.providerTransactionReference);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href={`/payments/${data.obligationId}`} label="Payment due" />
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
          <BanknoteIcon className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">{data.transactionNumber}</h1>
          <p className="text-sm text-muted-foreground">{statusLabel}</p>
        </div>
      </div>

      <p className="text-sm">{message}</p>
      {data.status === "SUCCESSFUL" ? (
        <p className="text-sm">
          {receipt ? (
            <>
              Receipt available.{" "}
              <Link href={`/receipts/${receipt.id}`} className="underline">
                View receipt {receipt.receiptNumber}
              </Link>
            </>
          ) : (
            "Payment successful. A receipt can be opened from this payment."
          )}
        </p>
      ) : data.status === "PENDING" || data.status === "INITIATED" ? (
        <p className="text-sm text-muted-foreground">
          Payment pending. Receipt will be available after payment confirmation.
        </p>
      ) : null}

      <section className="rounded-xl border bg-white px-4">
        <Row label="Payment reference" value={data.transactionNumber} />
        <Row label="Amount due record" value={data.obligationNumber} />
        <Row label="Sale" value={data.orderNumber} />
        <Row label="Customer" value={data.customerId} />
        <Row label="Amount" value={`${data.currencyCode} ${data.amount}`} />
        <Row
          label="Applied to amount due"
          value={`${data.currencyCode} ${data.allocatedAmount}`}
        />
        <Row
          label="Not yet applied"
          value={`${data.currencyCode} ${data.unallocatedAmount}`}
        />
        <Row label="How they paid" value={data.methodName} />
        <Row label="Network" value={data.networkName} />
        <Row label="Provider" value={data.providerName} />
        <Row label="Channel" value={data.channelName} />
        <Row label="Status" value={statusLabel} />
        <Row
          label="Review status"
          value={exceptions[0]?.statusLabel ?? (data.status === "UNKNOWN" ? "Needs review" : null)}
        />
        <Row label="Review type" value={exceptions[0]?.exceptionTypeLabel} />
        <Row label="Review reason" value={exceptions[0]?.reason} />
        <Row label="Provider reference" value={providerRef} />
        <Row
          label="Started"
          value={data.initiatedAt ? new Date(data.initiatedAt).toLocaleString() : null}
        />
        <Row
          label="Completed"
          value={data.completedAt ? new Date(data.completedAt).toLocaleString() : null}
        />
        <Row label="Failure reason" value={data.failureReason} />
      </section>

      {settlement ? (
        <section className="rounded-xl border bg-white px-4">
          <Row label="Payment Status" value={statusLabel} />
          <Row label="Settlement Status" value={settlement.settlementStatusLabel} />
          <Row label="Payment Amount" value={`${data.currencyCode} ${data.amount}`} />
          <Row
            label="Expected Settlement"
            value={`${settlement.currencyCode} ${settlement.expectedAmount}`}
          />
          <Row
            label="Actual Settlement"
            value={
              settlement.receivedAmount
                ? `${settlement.currencyCode} ${settlement.receivedAmount}`
                : null
            }
          />
          <Row
            label="Variance"
            value={
              settlement.varianceAmount
                ? `${settlement.currencyCode} ${settlement.varianceAmount}`
                : null
            }
          />
          <Row label="Settlement Reference" value={settlement.settlementReference} />
          <Row label="Settlement Batch" value={settlement.settlementBatchReference} />
          <Row
            label="Settlement Date"
            value={
              settlement.settlementDate
                ? new Date(settlement.settlementDate).toLocaleString()
                : null
            }
          />
          <Row label="Exception" value={settlement.exceptionFlag ? "Yes" : "No"} />
        </section>
      ) : null}

      {exceptions.length > 0 ? (
        <section className="rounded-xl border bg-white px-4 py-4">
          <h2 className="mb-3 text-base font-semibold">Payment review</h2>
          {exceptions.map((row) => (
            <div key={row.id} className="border-t first:border-t-0">
              <Row label="Review" value={row.exceptionNumber} />
              <Row label="Review status" value={row.statusLabel} />
              <Row label="Type" value={row.exceptionTypeLabel} />
              <Row label="Reason" value={row.reason} />
              <div className="py-3">
                <Link href={`/payments/exceptions/${row.id}`} className="text-sm underline">
                  Open review
                </Link>
              </div>
            </div>
          ))}
          {exceptions.some((row) => row.status === "OPEN" || row.status === "INVESTIGATING") ? (
            <div className="flex flex-wrap gap-2 pb-3">
              <button
                type="button"
                className={cn(buttonVariants({ variant: "outline" }), "h-10")}
                disabled={isPending}
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    const result = await queryExceptionProviderAction(data.id);
                    if (!result.success) {
                      setError(result.error.message);
                      return;
                    }
                    window.location.reload();
                  });
                }}
              >
                Check confirmation
              </button>
              <button
                type="button"
                className={cn(buttonVariants({ variant: "outline" }), "h-10")}
                disabled={isPending}
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    const result = await retryExceptionPaymentAction({
                      paymentTransactionId: data.id,
                    });
                    if (!result.success) {
                      setError(result.error.message);
                      return;
                    }
                    window.location.assign(`/payments/transactions/${result.data.transaction.id}`);
                  });
                }}
              >
                Retry payment
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {refunds ? (
        <section className="rounded-xl border bg-white px-4 py-4">
          <h2 className="mb-3 text-base font-semibold">Refunds</h2>
          <Row label="Amount paid" value={`${data.currencyCode} ${refunds.originalAmount}`} />
          <Row
            label="Already refunded"
            value={`${data.currencyCode} ${refunds.alreadyRefundedAmount}`}
          />
          <Row
            label="Refundable"
            value={`${data.currencyCode} ${refunds.refundableAmount}`}
          />
          {refunds.refunds.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm">
              {refunds.refunds.map((row) => (
                <li key={row.id} className="flex justify-between gap-3 border-t pt-2">
                  <span>
                    {row.refundNumber}: {row.currencyCode} {row.amount}
                  </span>
                  <span>{row.statusLabel}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No refunds yet.</p>
          )}
          {refunds.eligible ? (
            <form
              className="mt-4 grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                setError(null);
                startTransition(async () => {
                  const result = await requestRefundAction({
                    paymentTransactionId: data.id,
                    refundType,
                    amount: refundType === "PARTIAL_REFUND" ? refundAmount : refunds.refundableAmount,
                    reason: refundReason,
                    confirmManual: refunds.requiresManualConfirmation,
                  });
                  if (!result.success) {
                    setError(result.error.message);
                    return;
                  }
                  window.location.reload();
                });
              }}
            >
              <label className="grid gap-1 text-sm">
                Refund type
                <select
                  className="h-10 rounded-md border px-3"
                  value={refundType}
                  onChange={(event) => setRefundType(event.target.value)}
                >
                  <option value="FULL_REFUND">Full</option>
                  <option value="PARTIAL_REFUND">Partial</option>
                </select>
              </label>
              {refundType === "PARTIAL_REFUND" ? (
                <label className="grid gap-1 text-sm">
                  Amount
                  <input
                    className="h-10 rounded-md border px-3"
                    value={refundAmount}
                    onChange={(event) => setRefundAmount(event.target.value)}
                  />
                </label>
              ) : null}
              <label className="grid gap-1 text-sm">
                Reason
                <input
                  className="h-10 rounded-md border px-3"
                  value={refundReason}
                  onChange={(event) => setRefundReason(event.target.value)}
                  required
                />
              </label>
              <button type="submit" className={cn(buttonVariants(), "h-10 w-fit")} disabled={isPending}>
                {refunds.requiresApproval ? "Submit for approval" : "Submit refund"}
              </button>
            </form>
          ) : null}
          {refunds.refunds.some((row) => row.status === "APPROVAL_PENDING") ? (
            <div className="mt-4 flex gap-2">
              {refunds.refunds
                .filter((row) => row.status === "APPROVAL_PENDING")
                .map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className={cn(buttonVariants({ variant: "outline" }), "h-10")}
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        const result = await approveRefundAction({
                          refundId: row.id,
                          decision: "APPROVE",
                        });
                        if (!result.success) {
                          setError(result.error.message);
                          return;
                        }
                        window.location.reload();
                      });
                    }}
                  >
                    Approve {row.refundNumber}
                  </button>
                ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {data.status === "SUCCESSFUL" ? (
          <button
            type="button"
            className={cn(buttonVariants(), "h-10")}
            disabled={isPending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await issueReceiptAction({
                  paymentTransactionId: data.id,
                  idempotencyKey: crypto.randomUUID(),
                });
                if (!result.success) {
                  setError(result.error.message);
                  return;
                }
                window.location.assign(`/receipts/${result.data.id}`);
              });
            }}
          >
            {receipt ? "Open receipt" : "View receipt"}
          </button>
        ) : null}
        {canRefresh ? (
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline" }), "h-10")}
            onClick={onRefresh}
            disabled={isPending}
          >
            {isPending ? "Checking…" : "Check payment status"}
          </button>
        ) : null}
        <Link
          href={`/payments/${data.obligationId}`}
          className={cn(buttonVariants({ variant: "secondary" }), "h-10")}
        >
          Back to amount due
        </Link>
      </div>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </main>
  );
}
