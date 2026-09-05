/**
 * Purpose:
 * Quotation view and payload types.
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline (Phase 10.1)
 */

import type { QuotationStatusCode } from "@/modules/crm/constants";

export type QuotationLineView = {
  id: string;
  lineNumber: number;
  offeringId: string;
  offeringCode: string;
  offeringName: string;
  offeringVariantId: string | null;
  description: string | null;
  quantity: number;
  unitOfMeasureId: string | null;
  unitOfMeasureSymbol: string | null;
  unitPrice: number;
  pricingItemId: string | null;
  lineTotal: number;
  metadata: Record<string, unknown> | null;
};

export type QuotationVersionView = {
  id: string;
  versionNumber: number;
  status: QuotationStatusCode | string;
  statusLabel: string;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  revisionReason: string | null;
  sentAt: string | null;
  lockedAt: string | null;
  createdAt: string;
  lines: QuotationLineView[];
};

export type QuotationSummaryView = {
  id: string;
  quotationNumber: string;
  status: QuotationStatusCode | string;
  statusLabel: string;
  partyId: string;
  partyDisplayName: string | null;
  crmRecordId: string | null;
  accountId: string | null;
  opportunityId: string | null;
  currencyCode: string;
  grandTotal: number;
  validUntil: string | null;
  currentVersionNumber: number;
  ownerUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QuotationDetailView = QuotationSummaryView & {
  pricingCatalogueId: string | null;
  customerSegment: string | null;
  salesChannel: string | null;
  region: string | null;
  notes: string | null;
  termsTemplateCode: string | null;
  metadata: Record<string, unknown> | null;
  approvalStatus: string;
  approvalStatusLabel: string;
  documentAvailable: boolean;
  /** Channel that accepted the quotation (metadata; channels themselves not implemented). */
  acceptanceChannel: string | null;
  currentVersion: QuotationVersionView;
};

export type QuotationSearchFilters = {
  query?: string;
  status?: string;
  partyId?: string;
  accountId?: string;
  opportunityId?: string;
  crmRecordId?: string;
  ownerUserId?: string;
  validUntilBefore?: string;
  validUntilAfter?: string;
  page?: number;
  pageSize?: number;
};

export type QuotationSearchResultView = {
  items: QuotationSummaryView[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type CreateQuotationPayload = {
  partyId: string;
  crmRecordId?: string;
  accountId?: string;
  opportunityId?: string;
  currencyCode: string;
  pricingCatalogueId?: string;
  customerSegment?: string;
  salesChannel?: string;
  region?: string;
  validUntil?: string;
  ownerUserId?: string;
  notes?: string;
  termsTemplateCode?: string;
  metadata?: Record<string, unknown>;
  lines?: CreateQuotationLinePayload[];
  /** Optional channel idempotency (required when requireIdempotencyKey). */
  idempotencyKey?: string;
  idempotencyPayloadHash?: string;
  requireIdempotencyKey?: boolean;
};

export type CreateQuotationLinePayload = {
  offeringId: string;
  offeringVariantId?: string;
  description?: string;
  quantity: number;
  unitOfMeasureId?: string;
  unitPrice?: number;
  pricingItemId?: string;
  metadata?: Record<string, unknown>;
};

export type UpdateQuotationHeaderPayload = {
  currencyCode?: string;
  pricingCatalogueId?: string | null;
  customerSegment?: string | null;
  salesChannel?: string | null;
  region?: string | null;
  validUntil?: string | null;
  ownerUserId?: string | null;
  notes?: string | null;
  termsTemplateCode?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type UpdateQuotationLinePayload = {
  description?: string | null;
  quantity?: number;
  unitOfMeasureId?: string | null;
  unitPrice?: number;
  pricingItemId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type QuotationVersionInsertValues = {
  businessId: string;
  quotationId: string;
  versionNumber: number;
  status: string;
  subtotal?: string;
  taxAmount?: string;
  grandTotal?: string;
  revisionReason?: string | null;
  sentAt?: Date | null;
  lockedAt?: Date | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
};

export type QuotationLineInsertValues = {
  businessId: string;
  quotationVersionId: string;
  lineNumber: number;
  offeringId: string;
  offeringVariantId?: string | null;
  description?: string | null;
  quantity: string;
  unitOfMeasureId?: string | null;
  unitPrice: string;
  pricingItemId?: string | null;
  lineTotal: string;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type QuotationInsertValues = {
  id?: string;
  businessId: string;
  quotationNumber: string;
  partyId: string;
  crmRecordId?: string | null;
  accountId?: string | null;
  opportunityId?: string | null;
  status: string;
  currencyCode: string;
  pricingCatalogueId?: string | null;
  customerSegment?: string | null;
  salesChannel?: string | null;
  region?: string | null;
  validUntil?: Date | null;
  currentVersionNumber?: number;
  ownerUserId?: string | null;
  notes?: string | null;
  termsTemplateCode?: string | null;
  approvalStatus?: string;
  approvedAt?: Date | null;
  approvedBy?: string | null;
  documentSnapshot?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type QuotationUpdateValues = {
  status?: string;
  currencyCode?: string;
  pricingCatalogueId?: string | null;
  customerSegment?: string | null;
  salesChannel?: string | null;
  region?: string | null;
  validUntil?: Date | null;
  currentVersionNumber?: number;
  ownerUserId?: string | null;
  notes?: string | null;
  termsTemplateCode?: string | null;
  approvalStatus?: string;
  approvedAt?: Date | null;
  approvedBy?: string | null;
  documentSnapshot?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
};

export type AddQuotationLinePayload = {
  offeringId: string;
  offeringVariantId?: string;
  description?: string;
  quantity: number;
  unitOfMeasureId?: string;
  /** When omitted, resolved from BP-003 via PricingResolutionAdapter. */
  unitPrice?: number;
  pricingItemId?: string;
  metadata?: Record<string, unknown>;
};

export type ReviseQuotationPayload = {
  revisionReason?: string;
};

/** Input for BP-003 price resolution via PricingResolutionAdapter. */
export type PricingResolutionRequest = {
  offeringId: string;
  currencyCode: string;
  pricingCatalogueId?: string;
  customerSegment?: string | null;
  salesChannel?: string | null;
  region?: string | null;
  asOfDate?: Date;
};

/** Result of a successful BP-003 price lookup for quotation line entry. */
export type ResolvedOfferingPrice = {
  offeringId: string;
  offeringCode: string;
  offeringName: string;
  pricingItemId: string;
  pricingCatalogueId: string;
  catalogueCode: string;
  catalogueName: string;
  unitPrice: number;
  currencyCode: string;
  pricingMethod: string;
  customerSegment: string | null;
  salesChannel: string | null;
  region: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  resolvedAt: string;
};

/** Per-line input for QuotationCalculationService (pricing already resolved). */
export type QuotationLineCalculationInput = {
  lineNumber: number;
  quantity: number;
  unitPrice: number;
  discountPercent?: number | null;
  discountAmount?: number | null;
  taxRatePercent?: number | null;
};

export type QuotationLineCalculationResult = {
  lineNumber: number;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
};

export type QuotationTotalsCalculationResult = {
  lines: QuotationLineCalculationResult[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
};

/** Optional document-level discount/tax applied after line aggregation. */
export type QuotationCalculationOptions = {
  documentDiscountPercent?: number | null;
  documentDiscountAmount?: number | null;
  documentTaxRatePercent?: number | null;
};

export type QuotationDocumentView = {
  format: "HTML";
  generatedAt: string;
  quotationNumber: string;
  title: string;
  htmlContent: string;
};

export type SalesOrderLineView = {
  id: string;
  lineNumber: number;
  offeringId: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  quotationLineId: string | null;
};

export type SalesOrderDetailView = {
  id: string;
  orderNumber: string;
  quotationId: string;
  quotationVersionId: string | null;
  partyId: string;
  accountId: string | null;
  opportunityId: string | null;
  status: string;
  handoffStatus: string;
  currencyCode: string;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  lines: SalesOrderLineView[];
  createdAt: string;
};

export type QuotationDashboardView = {
  totalQuotations: number;
  draftCount: number;
  sentCount: number;
  acceptedCount: number;
  rejectedCount: number;
  expiredCount: number;
  totalQuotedValue: number;
  pendingApprovalCount: number;
  recentQuotations: QuotationSummaryView[];
};

export type Customer360WidgetView = {
  id: string;
  label: string;
  value: string | number;
  href?: string;
  tone?: "default" | "warning" | "success";
};

export type Customer360InsightView = {
  id: string;
  label: string;
  summary: string;
  tone?: "default" | "warning" | "success";
};

export type Customer360QuickActionView = {
  id: string;
  label: string;
  href: string;
};

export type QuotationCustomer360Contribution = {
  /** Stable contribution domain for IP-01 mounting. */
  domain: "quotations";
  widgets: Customer360WidgetView[];
  insights: Customer360InsightView[];
  quickActions: Customer360QuickActionView[];
  /** Timeline event types this domain publishes (Party Timeline). */
  timelineEventTypes: string[];
};
