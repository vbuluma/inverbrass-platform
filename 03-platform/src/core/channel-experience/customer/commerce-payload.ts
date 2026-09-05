/**
 * Purpose:
 * SL-CUS-001 — Canonical payload hashing for CREATE_SALE idempotency.
 *
 * Hash covers customer intent only (party, currency, offering, quantity).
 * Snapshot IDs are intentionally excluded — each prepareCommercial call
 * mints a new snapshot; retries must still reconcile to the original sale.
 */

import { createHash } from "node:crypto";

import type { CreateDirectSaleLineInput } from "@/modules/sales/types";

export function hashCreateSalePayload(input: {
  customerPartyId: string;
  currencyCode: string;
  lines: Array<
    Pick<CreateDirectSaleLineInput, "offeringId" | "quantity"> & {
      snapshot?: { snapshotId?: string } | null;
      expected?: { expectedAmount?: string } | null;
    }
  >;
}): string {
  const canonical = JSON.stringify({
    customerPartyId: input.customerPartyId,
    currencyCode: input.currencyCode.trim().toUpperCase(),
    lines: input.lines
      .map((line) => ({
        offeringId: line.offeringId,
        quantity: line.quantity,
      }))
      .sort((a, b) => a.offeringId.localeCompare(b.offeringId)),
  });
  return createHash("sha256").update(canonical).digest("hex");
}
