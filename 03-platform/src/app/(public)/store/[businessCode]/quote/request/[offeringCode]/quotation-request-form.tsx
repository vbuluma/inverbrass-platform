/**
 * Purpose:
 * SL-CUS-003 — Quotation request form (Customer Web).
 */

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { submitQuotationRequestAction } from "@/core/channel-experience/customer/quotation-actions";

type Props = {
  businessCode: string;
  offeringId: string;
  offeringName: string;
  offeringCode: string;
};

export function QuotationRequestForm({
  businessCode,
  offeringId,
  offeringName,
  offeringCode,
}: Props) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [clientKey] = useState(() => crypto.randomUUID());

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await submitQuotationRequestAction(businessCode, {
        lines: [{ offeringId, quantity }],
        contactName: contactName.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        clientIdempotencyKey: clientKey,
      });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      router.push(
        `/store/${businessCode}/quote/${encodeURIComponent(result.data.quotationReference)}`
      );
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5">
      <div>
        <p className="text-sm text-neutral-500">Requesting quotation for</p>
        <p className="text-lg font-medium">{offeringName}</p>
        <p className="text-xs text-neutral-500">{offeringCode}</p>
      </div>

      <label className="block space-y-1 text-sm">
        <span>Quantity</span>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value) || 1)}
          className="w-full rounded border border-neutral-300 px-3 py-2"
          required
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span>Your name</span>
        <input
          value={contactName}
          onChange={(event) => setContactName(event.target.value)}
          className="w-full rounded border border-neutral-300 px-3 py-2"
          autoComplete="name"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span>Email</span>
        <input
          type="email"
          value={contactEmail}
          onChange={(event) => setContactEmail(event.target.value)}
          className="w-full rounded border border-neutral-300 px-3 py-2"
          autoComplete="email"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span>Phone</span>
        <input
          type="tel"
          value={contactPhone}
          onChange={(event) => setContactPhone(event.target.value)}
          className="w-full rounded border border-neutral-300 px-3 py-2"
          autoComplete="tel"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span>Notes for the business</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="min-h-24 w-full rounded border border-neutral-300 px-3 py-2"
          rows={4}
        />
      </label>

      {message ? <p className="text-sm text-red-700">{message}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-neutral-900 px-4 py-3 text-sm text-white disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit quotation request"}
      </button>
    </form>
  );
}
