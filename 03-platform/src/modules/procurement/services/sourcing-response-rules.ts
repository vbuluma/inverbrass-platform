/**
 * Purpose:
 * Pure IP-04 supplier response rules — payment terms, sealed view, active quotes.
 * Does not score suppliers or create awards.
 */

import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";

export { isCommercialSealedToBuyer } from "@/modules/procurement/services/evaluation-workflow-rules";

export const QUOTE_STATUSES = {
  ACTIVE: "ACTIVE",
  WITHDRAWN: "WITHDRAWN",
  LATE: "LATE",
} as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[keyof typeof QUOTE_STATUSES];

export const INVITATION_RESPONSE_STATUSES = {
  INVITED: "INVITED",
  OPENED: "OPENED",
  SUBMITTED: "SUBMITTED",
  WITHDRAWN: "WITHDRAWN",
} as const;

export type InvitationResponseStatus =
  (typeof INVITATION_RESPONSE_STATUSES)[keyof typeof INVITATION_RESPONSE_STATUSES];

export const INVITATION_RESPONSE_STATUS_LABELS: Record<InvitationResponseStatus, string> = {
  INVITED: "Invited",
  OPENED: "Opened",
  SUBMITTED: "Submitted",
  WITHDRAWN: "Withdrawn",
};

export type QuoteLineInput = {
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate?: string | null;
};

export type PaymentTermInput = {
  milestoneName: string;
  percentage: string;
  amount?: string | null;
  triggerEvent?: string | null;
  duePeriodDays?: number | null;
  comments?: string | null;
};

export type SupplierResponsePayload = {
  amount?: string | null;
  comments?: string | null;
  deliveryLeadDays?: number | null;
  warrantyNotes?: string | null;
  year1Amount?: string | null;
  tcvAmount?: string | null;
  tcoAmount?: string | null;
  lines?: QuoteLineInput[];
  paymentTerms?: PaymentTermInput[];
  idempotencyKey?: string | null;
  capturedOnBehalf?: boolean;
};

export function activeQuoteVersions<T extends { version: number; status?: string }>(
  versions: ReadonlyArray<T>
): T[] {
  return versions.filter((row) => (row.status ?? QUOTE_STATUSES.ACTIVE) !== QUOTE_STATUSES.WITHDRAWN);
}

function parsePositiveNumber(value: string, field: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, { field });
  }
  return parsed;
}

export function computeLineTotal(
  quantity: string,
  unitPrice: string,
  taxRate: string | null | undefined
): string {
  const qty = parsePositiveNumber(quantity, "quantity");
  const price = parsePositiveNumber(unitPrice, "unitPrice");
  const tax = taxRate?.trim() ? parsePositiveNumber(taxRate, "taxRate") : 0;
  const subtotal = qty * price;
  const total = subtotal + subtotal * (tax / 100);
  return total.toFixed(2);
}

export function validatePaymentTermsSchedule(terms: PaymentTermInput[]): PaymentTermInput[] {
  if (terms.length === 0) {
    return [];
  }
  let total = 0;
  const normalized = terms.map((term, index) => {
    const percentage = parsePositiveNumber(term.percentage, `paymentTerms.${index}.percentage`);
    if (percentage > 100) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: `paymentTerms.${index}.percentage`,
      });
    }
    total += percentage;
    const milestoneName = term.milestoneName?.trim() ?? "";
    if (!milestoneName) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: `paymentTerms.${index}.milestoneName`,
      });
    }
    return {
      milestoneName,
      percentage: String(percentage),
      amount: term.amount?.trim() || null,
      triggerEvent: term.triggerEvent?.trim() || null,
      duePeriodDays: term.duePeriodDays ?? null,
      comments: term.comments?.trim() || null,
    };
  });
  if (Math.abs(total - 100) > 0.01) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
      field: "paymentTerms",
    });
  }
  return normalized;
}

export function sumLineTotals(lines: Array<{ lineTotal: string }>): string {
  const total = lines.reduce((sum, row) => sum + Number(row.lineTotal), 0);
  return total.toFixed(2);
}
