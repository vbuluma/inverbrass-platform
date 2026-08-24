/**
 * Purpose:
 * Injectable ports for BP-006 sales/order creation, confirmation, and lifecycle.
 *
 * Implementation Package:
 * BP-006 / IP-01 – Sales & Order Creation
 * BP-006 / IP-02 – Order Lifecycle & Fulfilment
 * BP-006 / IP-03 – Delivery, Inspection & Service Completion
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import type {
  CommercialSnapshot,
  CommercialTransactionContract,
  ExpectedCommercialAmount,
} from "@/modules/commercial/types";
import type { ConsumedCommercialResult, SalesAuditRecord } from "@/modules/sales/types";

export type SalesOrderRecord = {
  id: string;
  businessId: string;
  orderNumber: string;
  sourceType: string;
  quotationId: string | null;
  quotationVersionId: string | null;
  crmRecordId: string | null;
  partyId: string | null;
  accountId: string | null;
  opportunityId: string | null;
  status: string;
  currencyCode: string;
  orderDate: Date;
  expectedAmount: string;
  subtotal: string;
  taxAmount: string;
  grandTotal: string;
  commercialContractId: string | null;
  snapshotId: string | null;
  confirmationRequiresSod: boolean;
  submittedBy: string | null;
  submittedAt: Date | null;
  confirmedBy: string | null;
  confirmedAt: Date | null;
  confirmationRejectedBy: string | null;
  confirmationRejectedAt: Date | null;
  confirmationRejectedReason: string | null;
  completionRequiresSod: boolean;
  completionSubmittedBy: string | null;
  completionSubmittedAt: Date | null;
  completedBy: string | null;
  completedAt: Date | null;
  completionRejectedBy: string | null;
  completionRejectedAt: Date | null;
  completionRejectedReason: string | null;
  handoffStatus: string;
  paymentStatus: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  version: number;
};

export type SalesOrderLineRecord = {
  id: string;
  businessId: string;
  salesOrderId: string;
  lineNumber: number;
  offeringId: string;
  offeringVariantId: string | null;
  lineType: string;
  description: string | null;
  quantity: string;
  agreedUnitValue: string;
  commercialLineAmount: string;
  currencyCode: string;
  unitPrice: string;
  lineTotal: string;
  snapshotId: string | null;
  commercialContractId: string | null;
  commercialBreakdown: unknown;
  quotationLineId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

export type SalesOrderCommercialLinkRecord = {
  id: string;
  businessId: string;
  salesOrderId: string;
  salesOrderLineId: string | null;
  snapshotId: string;
  commercialContractId: string;
  expectedAmountId: string | null;
  expectedPayable: string;
  currencyCode: string;
  integrityHash: string;
  snapshotPayload: CommercialSnapshot;
  contractPayload: CommercialTransactionContract;
  provenance: unknown;
  consumerRef: string | null;
  consumedAt: Date;
  createdAt: Date;
  createdBy: string | null;
};

export type SalesOrderInsert = Omit<
  SalesOrderRecord,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "version"
  | "partyId"
  | "completionRequiresSod"
  | "completionSubmittedBy"
  | "completionSubmittedAt"
  | "completedBy"
  | "completedAt"
  | "completionRejectedBy"
  | "completionRejectedAt"
  | "completionRejectedReason"
> & {
  id?: string;
  partyId: string;
  completionRequiresSod?: boolean;
  completionSubmittedBy?: string | null;
  completionSubmittedAt?: Date | null;
  completedBy?: string | null;
  completedAt?: Date | null;
  completionRejectedBy?: string | null;
  completionRejectedAt?: Date | null;
  completionRejectedReason?: string | null;
};

export type SalesOrderLineInsert = Omit<SalesOrderLineRecord, "id" | "createdAt"> & {
  id?: string;
};

export type SalesOrderCommercialLinkInsert = Omit<
  SalesOrderCommercialLinkRecord,
  "id" | "createdAt" | "consumedAt"
> & {
  id?: string;
  consumedAt?: Date;
};

export type PartyLookupResult = {
  id: string;
  businessId: string;
  displayName: string;
};

export type OfferingLookupResult = {
  id: string;
  businessId: string;
  productCode: string;
  productName: string;
  productTypeCode: string;
};

export type QuotationLineLookup = {
  id: string;
  offeringId: string;
  description: string | null;
  quantity: number;
  lineNumber: number;
};

export type QuotationLookupResult = {
  id: string;
  businessId: string;
  quotationNumber: string;
  status: string;
  validUntil: Date | string | null;
  partyId: string;
  crmRecordId: string | null;
  accountId: string | null;
  opportunityId: string | null;
  currencyCode: string;
  currentVersionId: string | null;
  currentVersionNumber: number;
  lines: QuotationLineLookup[];
};

export type SalesOrderRepositoryPort = {
  insert(values: SalesOrderInsert): Promise<SalesOrderRecord>;
  update(
    businessId: string,
    orderId: string,
    values: Partial<SalesOrderRecord>
  ): Promise<SalesOrderRecord>;
  replaceLines(
    businessId: string,
    orderId: string,
    lines: SalesOrderLineInsert[]
  ): Promise<SalesOrderLineRecord[]>;
  replaceCommercialLinks(
    businessId: string,
    orderId: string,
    links: SalesOrderCommercialLinkInsert[]
  ): Promise<SalesOrderCommercialLinkRecord[]>;
  findById(businessId: string, orderId: string): Promise<SalesOrderRecord | null>;
  findByOrderNumber(
    businessId: string,
    orderNumber: string
  ): Promise<SalesOrderRecord | null>;
  findByQuotationId(
    businessId: string,
    quotationId: string
  ): Promise<SalesOrderRecord | null>;
  listByBusiness(businessId: string): Promise<SalesOrderRecord[]>;
  countAll(businessId: string): Promise<number>;
  listLines(businessId: string, orderId: string): Promise<SalesOrderLineRecord[]>;
  listCommercialLinks(
    businessId: string,
    orderId: string
  ): Promise<SalesOrderCommercialLinkRecord[]>;
  updateLine(
    businessId: string,
    lineId: string,
    values: Partial<SalesOrderLineRecord>
  ): Promise<SalesOrderLineRecord>;
  updateCommercialLink(
    businessId: string,
    linkId: string,
    values: Partial<SalesOrderCommercialLinkRecord>
  ): Promise<SalesOrderCommercialLinkRecord>;
};

export type PartyLookupPort = {
  findInBusiness(businessId: string, partyId: string): Promise<PartyLookupResult | null>;
};

export type OfferingLookupPort = {
  findInBusiness(
    businessId: string,
    offeringId: string
  ): Promise<OfferingLookupResult | null>;
};

export type QuotationLookupPort = {
  findInBusiness(
    businessId: string,
    quotationId: string
  ): Promise<QuotationLookupResult | null>;
};

export type CommercialContractPort = {
  consumeFromSnapshot(
    context: CurrentBusinessContext,
    snapshot: CommercialSnapshot,
    options?: {
      expected?: ExpectedCommercialAmount | null;
      expectedCurrency?: string | null;
      consumerRef?: string | null;
    }
  ): CommercialTransactionContract;
  validate(
    context: CurrentBusinessContext,
    contract: CommercialTransactionContract,
    snapshot?: CommercialSnapshot | null
  ): CommercialTransactionContract;
  verifyIntegrity(
    context: CurrentBusinessContext,
    contract: CommercialTransactionContract,
    snapshot: CommercialSnapshot
  ): true;
};

export type CommercialResolvePort = {
  resolveAndConsume(
    context: CurrentBusinessContext,
    input: {
      offeringId: string;
      partyId: string;
      currencyCode: string;
      quantity: number;
      consumerRef?: string | null;
    }
  ): Promise<ConsumedCommercialResult>;
};

export type SalesAuditPort = {
  record(entry: SalesAuditRecord): Promise<void>;
};

export type LineFulfilmentOutcome = {
  businessId: string;
  orderId: string;
  orderLineId: string;
  acceptedQuantity: number;
  rejectedQuantity: number;
  inspectionStatus: string;
  serviceCompletionStatus: string;
  hasActivity: boolean;
  mandatoryEvidenceMissing: boolean;
};

export type OrderFulfilmentOutcome = {
  businessId: string;
  orderId: string;
  lines: LineFulfilmentOutcome[];
  hasAnyActivity: boolean;
};

export type FulfilmentOutcomePort = {
  getOrderOutcome(
    businessId: string,
    orderId: string
  ): Promise<OrderFulfilmentOutcome>;
};

export type LineDispositionOutcome = {
  orderLineId: string;
  closedWithoutReplacementQuantity: number;
  replacementPendingQuantity: number;
};

export type OrderDispositionOutcome = {
  businessId: string;
  orderId: string;
  available: boolean;
  cancellationAuthorized: boolean;
  cancellationReason: string | null;
  lines: LineDispositionOutcome[];
};

export type OrderDispositionPort = {
  getDisposition(
    businessId: string,
    orderId: string
  ): Promise<OrderDispositionOutcome>;
};

export type CompletionChecklistItem = {
  code: string;
  name: string;
  mandatory: boolean;
  passed: boolean;
  blockerCode?: string | null;
  detail?: string | null;
};

export type CompletionChecklistResult = {
  passed: boolean;
  blockers: string[];
  items: CompletionChecklistItem[];
};

export type CompletionChecklistFacts = {
  businessId: string;
  orderId: string;
  outstandingQuantity: number;
  inspectionPending: boolean;
  inspectionFailed: boolean;
  serviceIncomplete: boolean;
  dispositionRequired: boolean;
  evidenceMissing: boolean;
  acceptedExceedsOrdered: boolean;
};

export type CompletionChecklistPort = {
  evaluate(facts: CompletionChecklistFacts): Promise<CompletionChecklistResult>;
};

export type SalesDeliveryPolicy = {
  inspectionRequiredForPhysical: boolean;
  inspectionRequiresSod: boolean;
  serviceEvidenceRequired: boolean;
  serviceCompletionRequiresSod: boolean;
  commentsRequiredOnPartialOrReject: boolean;
};

export type SalesDeliveryEventRecord = {
  id: string;
  businessId: string;
  salesOrderId: string;
  salesOrderLineId: string;
  eventType: string;
  status: string;
  claimedQuantity: string;
  deliveredAt: Date;
  recordedBy: string;
  recordedAt: Date;
  notes: string | null;
  evidenceNote: string | null;
  evidenceRef: string | null;
  completedBy: string | null;
  completedAt: Date | null;
  createdAt: Date;
  createdBy: string | null;
};

export type SalesInspectionOutcomeRecord = {
  id: string;
  businessId: string;
  salesOrderId: string;
  salesOrderLineId: string;
  deliveryEventId: string;
  acceptedQuantity: string;
  rejectedQuantity: string;
  comments: string | null;
  rejectionReasonCode: string | null;
  qualityFindingCode: string | null;
  evidenceNote: string | null;
  evidenceRef: string | null;
  inspectedBy: string;
  inspectedAt: Date;
  createdAt: Date;
  createdBy: string | null;
};

export type SalesDeliveryEventInsert = Omit<SalesDeliveryEventRecord, "id" | "createdAt"> & {
  id?: string;
};

export type SalesInspectionOutcomeInsert = Omit<
  SalesInspectionOutcomeRecord,
  "id" | "createdAt"
> & {
  id?: string;
};

export type SalesDeliveryRepositoryPort = {
  insertEvent(values: SalesDeliveryEventInsert): Promise<SalesDeliveryEventRecord>;
  updateEvent(
    businessId: string,
    eventId: string,
    values: Partial<SalesDeliveryEventRecord>
  ): Promise<SalesDeliveryEventRecord>;
  findEventById(
    businessId: string,
    eventId: string
  ): Promise<SalesDeliveryEventRecord | null>;
  listEventsByOrder(
    businessId: string,
    orderId: string
  ): Promise<SalesDeliveryEventRecord[]>;
  insertInspection(
    values: SalesInspectionOutcomeInsert
  ): Promise<SalesInspectionOutcomeRecord>;
  findInspectionByEvent(
    businessId: string,
    eventId: string
  ): Promise<SalesInspectionOutcomeRecord | null>;
  listInspectionsByOrder(
    businessId: string,
    orderId: string
  ): Promise<SalesInspectionOutcomeRecord[]>;
};

export type SalesDispositionPolicy = {
  cancelReasonRequired: boolean;
  returnReasonRequired: boolean;
  cancelRequiresSodAfterConfirm: boolean;
  draftCancelRequiresSod: boolean;
  returnRequiresSod: boolean;
  amendmentRequiresSod: boolean;
};

export type SalesDispositionInstructionRecord = {
  id: string;
  businessId: string;
  salesOrderId: string;
  salesOrderLineId: string | null;
  instructionType: string;
  status: string;
  quantity: string;
  reasonCode: string;
  comments: string | null;
  financialInstructionEmitted: boolean;
  stockInstructionEmitted: boolean;
  refundExecuted: boolean;
  stockMoved: boolean;
  submittedBy: string;
  submittedAt: Date;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  createdAt: Date;
  createdBy: string | null;
};

export type SalesOrderAmendmentRecord = {
  id: string;
  businessId: string;
  salesOrderId: string;
  salesOrderLineId: string;
  versionNumber: number;
  status: string;
  reason: string;
  previousQuantity: string;
  proposedQuantity: string;
  previousExpectedAmount: string;
  proposedExpectedAmount: string;
  previousCommercialContractId: string | null;
  proposedCommercialContractId: string;
  previousSnapshotId: string | null;
  proposedSnapshotId: string;
  snapshotPayload: CommercialSnapshot;
  contractPayload: CommercialTransactionContract;
  proposedBy: string;
  proposedAt: Date;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  createdBy: string | null;
};

export type SalesDispositionInstructionInsert = Omit<
  SalesDispositionInstructionRecord,
  "id" | "createdAt"
> & { id?: string };

export type SalesOrderAmendmentInsert = Omit<SalesOrderAmendmentRecord, "id" | "createdAt"> & {
  id?: string;
};

export type SalesExceptionRepositoryPort = {
  insertInstruction(
    values: SalesDispositionInstructionInsert
  ): Promise<SalesDispositionInstructionRecord>;
  updateInstruction(
    businessId: string,
    instructionId: string,
    values: Partial<SalesDispositionInstructionRecord>
  ): Promise<SalesDispositionInstructionRecord>;
  findInstructionById(
    businessId: string,
    instructionId: string
  ): Promise<SalesDispositionInstructionRecord | null>;
  listInstructionsByOrder(
    businessId: string,
    orderId: string
  ): Promise<SalesDispositionInstructionRecord[]>;
  insertAmendment(values: SalesOrderAmendmentInsert): Promise<SalesOrderAmendmentRecord>;
  updateAmendment(
    businessId: string,
    amendmentId: string,
    values: Partial<SalesOrderAmendmentRecord>
  ): Promise<SalesOrderAmendmentRecord>;
  findAmendmentById(
    businessId: string,
    amendmentId: string
  ): Promise<SalesOrderAmendmentRecord | null>;
  listAmendmentsByOrder(
    businessId: string,
    orderId: string
  ): Promise<SalesOrderAmendmentRecord[]>;
};

