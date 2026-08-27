"use client";

/**
 * Purpose:
 * Operations detail for a payment review. No provider secrets.
 *
 * Implementation Package:
 * BP-007 / IP-08 – Payment Exceptions, Operations & Controls
 */

import { useState, useTransition } from "react";
import { ShieldCheckIcon } from "lucide-react";
import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  approvePaymentExceptionAction,
  closePaymentExceptionAction,
  queryExceptionProviderAction,
  resolvePaymentExceptionAction,
  retryExceptionPaymentAction,
  startExceptionInvestigationAction,
} from "@/modules/payments/actions/payment-exception-actions";
import { PAYMENT_EXCEPTION_RESOLUTION_LABELS } from "@/modules/payments/constants";
import type { PaymentExceptionDetailView } from "@/modules/payments/types";

type PaymentExceptionDetailProps = {
  data: PaymentExceptionDetailView;
};

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid gap-1 border-b py-3 sm:grid-cols-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium sm:col-span-2">{value || "—"}</p>
    </div>
  );
}

export function PaymentExceptionDetail({ data }: PaymentExceptionDetailProps) {
  const [error, setError] = useState<string | null>(null);
  const [resolutionCode, setResolutionCode] = useState("CONFIRMED_FAILURE");
  const [notes, setNotes] = useState("");
  const [evidence, setEvidence] = useState("");
  const [isPending, startTransition] = useTransition();
  const unresolved = data.status === "OPEN" || data.status === "INVESTIGATING";
  const pendingApproval = data.approvalStatus === "PENDING";

  function run(work: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await work();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Please try again.");
      }
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/payments/exceptions" label="Payment reviews" />
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-lg bg-amber-50 text-amber-800 ring-1 ring-amber-200">
          <ShieldCheckIcon className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">{data.exceptionNumber}</h1>
          <p className="text-sm text-muted-foreground">{data.customerMessage}</p>
        </div>
      </div>

      <section className="rounded-xl border bg-white px-4">
        <Row label="Payment status" value={data.paymentStatusLabel} />
        <Row label="Settlement status" value={data.settlementStatus} />
        <Row label="Review status" value={data.statusLabel} />
        <Row label="Review type" value={data.exceptionTypeLabel} />
        <Row label="Reason" value={data.reason} />
        <Row label="Provider reference" value={data.providerTransactionReference} />
        <Row label="Amount" value={`${data.currencyCode} ${data.amount}`} />
        <Row label="How they paid" value={data.methodName} />
        <Row label="Network" value={data.networkName} />
        <Row label="Provider" value={data.providerName} />
        <Row label="Channel" value={data.channelName} />
        <Row label="Created" value={new Date(data.detectedAt).toLocaleString()} />
        <Row label="Updated" value={new Date(data.updatedAt).toLocaleString()} />
      </section>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/payments/transactions/${data.paymentTransactionId}`}
          className={cn(buttonVariants({ variant: "secondary" }), "h-10")}
        >
          Open payment
        </Link>
        {unresolved ? (
          <>
            {data.status === "OPEN" ? (
              <button
                type="button"
                className={cn(buttonVariants({ variant: "outline" }), "h-10")}
                disabled={isPending}
                onClick={() =>
                  run(async () => {
                    const result = await startExceptionInvestigationAction(data.id);
                    if (!result.success) {
                      setError(result.error.message);
                      return;
                    }
                    window.location.reload();
                  })
                }
              >
                Start investigation
              </button>
            ) : null}
            <button
              type="button"
              className={cn(buttonVariants({ variant: "outline" }), "h-10")}
              disabled={isPending}
              onClick={() =>
                run(async () => {
                  const result = await queryExceptionProviderAction(data.paymentTransactionId);
                  if (!result.success) {
                    setError(result.error.message);
                    return;
                  }
                  window.location.reload();
                })
              }
            >
              Check confirmation
            </button>
            {data.canRetry ? (
              <button
                type="button"
                className={cn(buttonVariants({ variant: "outline" }), "h-10")}
                disabled={isPending}
                onClick={() =>
                  run(async () => {
                    const result = await retryExceptionPaymentAction({
                      paymentTransactionId: data.paymentTransactionId,
                    });
                    if (!result.success) {
                      setError(result.error.message);
                      return;
                    }
                    window.location.assign(
                      `/payments/transactions/${result.data.transaction.id}`
                    );
                  })
                }
              >
                Retry payment
              </button>
            ) : null}
          </>
        ) : data.status === "RESOLVED" || data.status === "REJECTED" ? (
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline" }), "h-10")}
            disabled={isPending}
            onClick={() =>
              run(async () => {
                const result = await closePaymentExceptionAction(data.id);
                if (!result.success) {
                  setError(result.error.message);
                  return;
                }
                window.location.reload();
              })
            }
          >
            Close review
          </button>
        ) : null}
      </div>

      {unresolved && !pendingApproval ? (
        <form
          className="grid gap-3 rounded-xl border bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault();
            run(async () => {
              const result = await resolvePaymentExceptionAction({
                exceptionId: data.id,
                resolutionCode,
                notes,
                evidence,
              });
              if (!result.success) {
                setError(result.error.message);
                return;
              }
              window.location.reload();
            });
          }}
        >
          <h2 className="text-base font-semibold">Record a decision</h2>
          <label className="grid gap-1 text-sm">
            Decision
            <select
              className="h-10 rounded-md border px-3"
              value={resolutionCode}
              onChange={(event) => setResolutionCode(event.target.value)}
            >
              {Object.entries(PAYMENT_EXCEPTION_RESOLUTION_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Notes
            <textarea
              className="min-h-20 rounded-md border px-3 py-2"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Evidence reference
            <input
              className="h-10 rounded-md border px-3"
              value={evidence}
              onChange={(event) => setEvidence(event.target.value)}
            />
          </label>
          <button type="submit" className={cn(buttonVariants(), "h-10 w-fit")} disabled={isPending}>
            Save decision
          </button>
        </form>
      ) : null}

      {pendingApproval ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={cn(buttonVariants(), "h-10")}
            disabled={isPending}
            onClick={() =>
              run(async () => {
                const result = await approvePaymentExceptionAction({
                  exceptionId: data.id,
                  decision: "APPROVE",
                });
                if (!result.success) {
                  setError(result.error.message);
                  return;
                }
                window.location.reload();
              })
            }
          >
            Approve decision
          </button>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline" }), "h-10")}
            disabled={isPending}
            onClick={() =>
              run(async () => {
                const result = await approvePaymentExceptionAction({
                  exceptionId: data.id,
                  decision: "REJECT",
                  notes: "Rejected",
                });
                if (!result.success) {
                  setError(result.error.message);
                  return;
                }
                window.location.reload();
              })
            }
          >
            Reject decision
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </main>
  );
}
