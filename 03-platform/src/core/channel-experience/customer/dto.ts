/**
 * Purpose:
 * ENG-003o — Customer-safe DTO mappers (SL-ENG-003o-002).
 *
 * Strip staff/admin/supplier/cost fields before any Customer Web response.
 */

import type { CustomerSafeBusinessSummary } from "@/core/channel-experience/customer/types";
import type { CustomerTenantContext } from "@/core/channel-experience/customer/types";

const FORBIDDEN_CUSTOMER_FIELD_PATTERNS = [
  /supplier/i,
  /cost/i,
  /margin/i,
  /cogs/i,
  /staff/i,
  /membership/i,
  /permission/i,
  /roleCode/i,
  /audit/i,
  /internal/i,
  /providerSecret/i,
  /apiKey/i,
  /serviceRole/i,
  /workflow/i,
  /approval/i,
  /platformUser/i,
] as const;

export function toCustomerSafeBusinessSummary(
  tenant: CustomerTenantContext
): CustomerSafeBusinessSummary {
  return {
    businessCode: tenant.businessCode,
    businessName: tenant.businessName,
    statusCode: tenant.statusCode,
  };
}

export type CustomerSafeOfferingSummary = {
  offeringCode: string;
  name: string;
  description: string | null;
};

export type CustomerSafePriceView = {
  offeringCode: string;
  currencyCode: string;
  unitPrice: string;
};

export type CustomerSafeStockView = {
  offeringCode: string;
  available: boolean;
  /** Coarse availability only — never expose exact warehouse quantities unless product requires. */
  availabilityLabel: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "UNKNOWN";
};

export type CustomerSafeOrderView = {
  orderReference: string;
  statusCode: string;
  currencyCode: string;
  totalAmount: string;
  createdAt: string;
};

export type CustomerSafeCatalogueItem = {
  offeringCode: string;
  name: string;
  productTypeCode: string;
  featured: boolean;
};

export type CustomerSafeOrderLineView = {
  offeringCode: string;
  name: string;
  quantity: number;
  lineAmount: string;
  currencyCode: string;
};

export type CustomerSafePurchaseResult = {
  orderReference: string;
  paymentReference: string | null;
  paymentStatusCode: string;
  totalAmount: string;
  currencyCode: string;
  receiptAvailable: boolean;
  lines: readonly CustomerSafeOrderLineView[];
};

export function toCustomerSafeCatalogueItem(input: {
  productCode: string;
  productName: string;
  productTypeCode: string;
  featured: boolean;
}): CustomerSafeCatalogueItem {
  const item = {
    offeringCode: input.productCode,
    name: input.productName,
    productTypeCode: input.productTypeCode,
    featured: input.featured,
  };
  assertNoForbiddenCustomerFields(item as unknown as Record<string, unknown>);
  return item;
}

export function toCustomerSafeOrderDetail(input: {
  orderNumber: string;
  status: string;
  currencyCode: string;
  grandTotal: string;
  createdAt: string;
  lines: Array<{
    offeringCode: string | null;
    offeringName: string | null;
    orderedQuantity: string;
    commercialLineAmount: string;
    currencyCode: string;
  }>;
}): CustomerSafePurchaseResult {
  const result: CustomerSafePurchaseResult = {
    orderReference: input.orderNumber,
    paymentReference: null,
    paymentStatusCode: "PENDING",
    totalAmount: input.grandTotal,
    currencyCode: input.currencyCode,
    receiptAvailable: false,
    lines: input.lines.map((line) => ({
      offeringCode: line.offeringCode ?? "UNKNOWN",
      name: line.offeringName ?? "Item",
      quantity: Number(line.orderedQuantity),
      lineAmount: line.commercialLineAmount,
      currencyCode: line.currencyCode,
    })),
  };
  assertNoForbiddenCustomerFields(result as unknown as Record<string, unknown>);
  return result;
}

export type CustomerSafePaymentStatusView = {
  paymentReference: string;
  statusCode: string;
  amount: string;
  currencyCode: string;
};

/** SL-CUS-004 — My Orders list row */
export type CustomerSafeOrderListItem = {
  orderReference: string;
  orderDate: string;
  orderStatusCode: string;
  totalAmount: string;
  currencyCode: string;
  paymentStatusCode: string;
};

/** SL-CUS-004 — BP-007 payment summary on order hub */
export type CustomerSafeOrderPaymentView = {
  orderReference: string;
  paymentReference: string | null;
  paymentStatusCode: string;
  amountDue: string;
  amountPaid: string;
  outstandingAmount: string;
  currencyCode: string;
  receiptAvailable: boolean;
};

/** SL-CUS-005 — Result of INITIATE_PAYMENT against existing obligation */
export type CustomerSafePaymentInitiationResult = {
  orderReference: string;
  paymentReference: string | null;
  paymentStatusCode: string;
  requestedAmount: string;
  amountDue: string;
  amountPaid: string;
  outstandingAmount: string;
  currencyCode: string;
  receiptAvailable: boolean;
};

/** SL-CUS-004 — Order hub (order + payment presentation; not a persisted entity) */
export type CustomerSafeOrderHubDetail = {
  orderReference: string;
  orderDate: string;
  orderStatusCode: string;
  currencyCode: string;
  totalAmount: string;
  lines: readonly CustomerSafeOrderLineView[];
  payment: CustomerSafeOrderPaymentView;
};

export function toCustomerSafeOrderListItem(input: {
  orderReference: string;
  orderDate: string;
  orderStatusCode: string;
  totalAmount: string;
  currencyCode: string;
  paymentStatusCode: string;
}): CustomerSafeOrderListItem {
  const item: CustomerSafeOrderListItem = {
    orderReference: input.orderReference,
    orderDate: input.orderDate,
    orderStatusCode: input.orderStatusCode,
    totalAmount: input.totalAmount,
    currencyCode: input.currencyCode,
    paymentStatusCode: input.paymentStatusCode,
  };
  assertNoForbiddenCustomerFields(item as unknown as Record<string, unknown>);
  return item;
}

export function toCustomerSafeOrderPaymentView(input: {
  orderReference: string;
  paymentReference: string | null;
  paymentStatusCode: string;
  amountDue: string;
  amountPaid: string;
  outstandingAmount: string;
  currencyCode: string;
  receiptAvailable: boolean;
}): CustomerSafeOrderPaymentView {
  const view: CustomerSafeOrderPaymentView = {
    orderReference: input.orderReference,
    paymentReference: input.paymentReference,
    paymentStatusCode: input.paymentStatusCode,
    amountDue: input.amountDue,
    amountPaid: input.amountPaid,
    outstandingAmount: input.outstandingAmount,
    currencyCode: input.currencyCode,
    receiptAvailable: input.receiptAvailable,
  };
  assertNoForbiddenCustomerFields(view as unknown as Record<string, unknown>);
  return view;
}

export function toCustomerSafePaymentInitiationResult(input: {
  orderReference: string;
  paymentReference: string | null;
  paymentStatusCode: string;
  requestedAmount: string;
  amountDue: string;
  amountPaid: string;
  outstandingAmount: string;
  currencyCode: string;
  receiptAvailable: boolean;
}): CustomerSafePaymentInitiationResult {
  const view: CustomerSafePaymentInitiationResult = {
    orderReference: input.orderReference,
    paymentReference: input.paymentReference,
    paymentStatusCode: input.paymentStatusCode,
    requestedAmount: input.requestedAmount,
    amountDue: input.amountDue,
    amountPaid: input.amountPaid,
    outstandingAmount: input.outstandingAmount,
    currencyCode: input.currencyCode,
    receiptAvailable: input.receiptAvailable,
  };
  assertNoForbiddenCustomerFields(view as unknown as Record<string, unknown>);
  return view;
}

export function toCustomerSafeOrderHubDetail(input: {
  orderReference: string;
  orderDate: string;
  orderStatusCode: string;
  currencyCode: string;
  totalAmount: string;
  lines: Array<{
    offeringCode: string | null;
    offeringName: string | null;
    orderedQuantity: string;
    commercialLineAmount: string;
    currencyCode: string;
  }>;
  payment: CustomerSafeOrderPaymentView;
}): CustomerSafeOrderHubDetail {
  const detail: CustomerSafeOrderHubDetail = {
    orderReference: input.orderReference,
    orderDate: input.orderDate,
    orderStatusCode: input.orderStatusCode,
    currencyCode: input.currencyCode,
    totalAmount: input.totalAmount,
    lines: input.lines.map((line) => ({
      offeringCode: line.offeringCode ?? "UNKNOWN",
      name: line.offeringName ?? "Item",
      quantity: Number(line.orderedQuantity),
      lineAmount: line.commercialLineAmount,
      currencyCode: line.currencyCode,
    })),
    payment: input.payment,
  };
  assertNoForbiddenCustomerFields(detail as unknown as Record<string, unknown>);
  return detail;
}

export type CustomerSafeQuotationLineView = {
  offeringCode: string;
  name: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type CustomerSafeQuotationView = {
  quotationReference: string;
  statusCode: string;
  statusLabel: string;
  currencyCode: string;
  grandTotal: string;
  createdAt: string;
  documentAvailable: boolean;
  lines: readonly CustomerSafeQuotationLineView[];
};

/** Map domain quotation status to customer-safe journey labels. */
export function toCustomerQuotationStatusLabel(statusCode: string): string {
  switch (statusCode) {
    case "DRAFT":
      return "REQUEST_RECEIVED";
    case "SENT":
      return "QUOTATION_ISSUED";
    case "ACCEPTED":
      return "ACCEPTED";
    case "REJECTED":
      return "REJECTED";
    case "EXPIRED":
      return "EXPIRED";
    default:
      return "PENDING";
  }
}

export function toCustomerSafeQuotationView(input: {
  quotationNumber: string;
  status: string;
  currencyCode: string;
  grandTotal: number;
  createdAt: string;
  documentAvailable: boolean;
  lines: Array<{
    offeringCode: string;
    offeringName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}): CustomerSafeQuotationView {
  const view: CustomerSafeQuotationView = {
    quotationReference: input.quotationNumber,
    statusCode: input.status,
    statusLabel: toCustomerQuotationStatusLabel(input.status),
    currencyCode: input.currencyCode,
    grandTotal: String(input.grandTotal),
    createdAt: input.createdAt,
    documentAvailable:
      input.documentAvailable &&
      (input.status === "SENT" ||
        input.status === "ACCEPTED" ||
        input.status === "REJECTED"),
    lines: input.lines.map((line) => ({
      offeringCode: line.offeringCode,
      name: line.offeringName,
      quantity: line.quantity,
      unitPrice: String(line.unitPrice),
      lineTotal: String(line.lineTotal),
    })),
  };
  assertNoForbiddenCustomerFields(view as unknown as Record<string, unknown>);
  return view;
}

export function assertNoForbiddenCustomerFields(
  payload: Record<string, unknown>,
  path = ""
): void {
  for (const [key, value] of Object.entries(payload)) {
    const fullPath = path ? `${path}.${key}` : key;
    for (const pattern of FORBIDDEN_CUSTOMER_FIELD_PATTERNS) {
      if (pattern.test(key)) {
        throw new Error(
          `Customer-safe DTO violation: forbidden field "${fullPath}"`
        );
      }
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      assertNoForbiddenCustomerFields(
        value as Record<string, unknown>,
        fullPath
      );
    }
  }
}

export function pickCustomerSafeFields<T extends Record<string, unknown>>(
  source: T,
  allowedKeys: readonly (keyof T)[]
): Partial<T> {
  const result: Partial<T> = {};
  for (const key of allowedKeys) {
    if (key in source) {
      result[key] = source[key];
    }
  }
  assertNoForbiddenCustomerFields(result as Record<string, unknown>);
  return result;
}
