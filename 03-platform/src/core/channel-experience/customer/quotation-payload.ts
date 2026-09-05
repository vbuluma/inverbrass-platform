/**
 * Purpose:
 * SL-CUS-003 — Canonical payload hashing for CREATE_QUOTATION idempotency.
 *
 * Hash covers customer intent only (party, currency, offerings, quantities, notes).
 * Client unit prices are excluded — domain resolves authoritative prices.
 */

import { createHash } from "node:crypto";

export function hashCreateQuotationPayload(input: {
  partyId: string;
  currencyCode: string;
  notes?: string | null;
  lines: Array<{ offeringId: string; quantity: number }>;
}): string {
  const canonical = JSON.stringify({
    partyId: input.partyId,
    currencyCode: input.currencyCode.trim().toUpperCase(),
    notes: (input.notes ?? "").trim(),
    lines: input.lines
      .map((line) => ({
        offeringId: line.offeringId,
        quantity: line.quantity,
      }))
      .sort((a, b) => a.offeringId.localeCompare(b.offeringId)),
  });
  return createHash("sha256").update(canonical).digest("hex");
}
