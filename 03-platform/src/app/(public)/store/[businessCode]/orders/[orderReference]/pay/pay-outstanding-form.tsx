/**
 * Purpose:
 * SL-CUS-005 — Pay Outstanding client form (full + partial).
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { initiateOutstandingPaymentAction } from "@/core/channel-experience/customer/payment-actions";

type Props = {
  businessCode: string;
  orderReference: string;
  currencyCode: string;
  outstandingAmount: string;
};

export function PayOutstandingForm({
  businessCode,
  orderReference,
  currencyCode,
  outstandingAmount,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"FULL" | "PARTIAL">("FULL");
  const [partialAmount, setPartialAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      setMessage(null);
      const clientPaymentKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}`;

      const amount =
        mode === "PARTIAL" ? partialAmount.trim() : null;

      const result = await initiateOutstandingPaymentAction(businessCode, {
        orderReference,
        amount,
        clientPaymentKey,
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      router.push(
        `/store/${businessCode}/orders/${encodeURIComponent(orderReference)}/pay/result?ref=${encodeURIComponent(result.data.paymentReference ?? "")}&status=${encodeURIComponent(result.data.paymentStatusCode)}&paid=${encodeURIComponent(result.data.requestedAmount)}&outstanding=${encodeURIComponent(result.data.outstandingAmount)}&currency=${encodeURIComponent(result.data.currencyCode)}&receipt=${result.data.receiptAvailable ? "1" : "0"}`
      );
    });
  }

  return (
    <div className="mt-6 space-y-5">
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Payment amount</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="pay-mode"
            checked={mode === "FULL"}
            onChange={() => setMode("FULL")}
          />
          Pay full outstanding ({currencyCode} {outstandingAmount})
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="pay-mode"
            className="mt-1"
            checked={mode === "PARTIAL"}
            onChange={() => setMode("PARTIAL")}
          />
          <span className="flex-1 space-y-2">
            <span className="block">Pay a partial amount</span>
            {mode === "PARTIAL" ? (
              <input
                type="text"
                inputMode="decimal"
                value={partialAmount}
                onChange={(event) => setPartialAmount(event.target.value)}
                placeholder={`Up to ${outstandingAmount}`}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              />
            ) : null}
          </span>
        </label>
      </fieldset>

      <button
        type="button"
        disabled={isPending || (mode === "PARTIAL" && !partialAmount.trim())}
        onClick={submit}
        className="rounded-md bg-neutral-900 px-5 py-3 text-sm text-white disabled:opacity-60"
      >
        {isPending ? "Processing…" : "Confirm Payment"}
      </button>

      {message ? <p className="text-sm text-red-700">{message}</p> : null}
    </div>
  );
}
