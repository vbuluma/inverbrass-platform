/**
 * Purpose:
 * BP-006 type contracts for order creation, confirmation, lifecycle, and handoff.
 *
 * Implementation Package:
 * BP-006 / IP-01 – Sales & Order Creation
 * BP-006 / IP-02 – Order Lifecycle & Fulfilment
 * BP-006 / IP-03 – Delivery, Inspection & Service Completion
 * BP-006 / IP-04 – Amendments, Cancellation & Returns
 * BP-006 / IP-05 – Downstream Handoff & Sales Workspace
 */

import type {
  CommercialSnapshot,
  CommercialTransactionContract,
  ExpectedCommercialAmount,
  ExpectedCommercialComponent,
} from "@/modules/commercial/types";
import type {
  SalesAuditAction,
  SalesCompletionBlockerCode,
  SalesInspectionStatusCode,
  SalesLineFulfilmentStatusCode,
  SalesOrderLineType,
  SalesOrderSourceType,
  SalesOrderStatusCode,
  SalesServiceCompletionStatusCode,
} from "@/modules/sales/constants";

export type SalesConfirmationPolicy = {
  requiresSegregationOfDuties: boolean;
};

export type SalesCompletionPolicy = {
  requiresSegregationOfDuties: boolean;
};

export type CreateDirectSaleLineInput = {
  offeringId: string;
  quantity: number;
  snapshot: CommercialSnapshot;
  expected?: ExpectedCommercialAmount | null;
  description?: string | null;
};

export type CreateDirectSaleInput = {
  customerPartyId: string;
  crmRecordId?: string | null;
  currencyCode: string;
  orderDate?: string | Date | null;
  lines: CreateDirectSaleLineInput[];
  /** Ignored — business scope always comes from authenticated context. */
  businessId?: string | null;
  /** Required for customer-channel CREATE_SALE (SL-CUS-001). */
  idempotencyKey?: string;
  /** SHA-256 hash of canonical create payload — mismatch rejects replay abuse. */
  idempotencyPayloadHash?: string;
  /** Customer Web / channel metadata stored on order (guestSessionId, correlationId). */
  channelMetadata?: Record<string, unknown> | null;
  /** When true, missing idempotencyKey is rejected. Set by customer gateway only. */
  requireIdempotencyKey?: boolean;
};

export type ConvertQuotationInput = {
  quotationId: string;
  lineSnapshots?: CreateDirectSaleLineInput[] | null;
};

export type UpdateDraftSaleInput = {
  orderDate?: string | Date | null;
  notes?: string | null;
  lines?: CreateDirectSaleLineInput[] | null;
  currencyCode?: string | null;
};

export type RejectConfirmationInput = {
  reason?: string | null;
};

export type SalesOrderLineView = {
  id: string;
  lineNumber: number;
  offeringId: string;
  offeringName: string | null;
  offeringCode: string | null;
  lineType: SalesOrderLineType | string;
  description: string | null;
  orderedQuantity: string;
  agreedUnitValue: string;
  commercialLineAmount: string;
  currencyCode: string;
  snapshotId: string | null;
  commercialContractId: string | null;
  commercialBreakdown: ExpectedCommercialComponent[] | null;
  quotationLineId: string | null;
  acceptedQuantity: string;
  rejectedQuantity: string;
  deliveredQuantity: string;
  missingQuantity: string;
  outstandingQuantity: string;
  openRejectedQuantity: string;
  fulfilmentStatus: SalesLineFulfilmentStatusCode | string;
  fulfilmentStatusLabel: string;
  inspectionStatus: SalesInspectionStatusCode | string;
  serviceCompletionStatus: SalesServiceCompletionStatusCode | string;
};

export type SalesOrderCommercialLinkView = {
  id: string;
  snapshotId: string;
  commercialContractId: string;
  expectedPayable: string;
  currencyCode: string;
  integrityHash: string;
  consumedAt: string;
  consumerRef: string | null;
};

export type SalesOrderDetailView = {
  id: string;
  orderNumber: string;
  businessId: string;
  sourceType: SalesOrderSourceType | string;
  quotationId: string | null;
  quotationVersionId: string | null;
  opportunityId: string | null;
  crmRecordId: string | null;
  customerId: string;
  customerName: string | null;
  status: SalesOrderStatusCode | string;
  statusLabel: string;
  currencyCode: string;
  orderDate: string;
  expectedAmount: string;
  principalAmount: string;
  taxAmount: string;
  commercialContractId: string | null;
  snapshotId: string | null;
  confirmationRequiresSod: boolean;
  submittedBy: string | null;
  submittedAt: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  paymentStatus: string;
  paymentRecorded: false;
  lines: SalesOrderLineView[];
  commercialLinks: SalesOrderCommercialLinkView[];
  nextAction: string;
  customerStatusLabel: string;
  completionRequiresSod: boolean;
  completionSubmittedBy: string | null;
  completionSubmittedAt: string | null;
  completedBy: string | null;
  completedAt: string | null;
  fulfilment: SalesOrderFulfilmentView;
  readiness: SalesNextActionReadiness;
  deliveries: SalesDeliveryEventView[];
  dispositions: SalesDispositionInstructionView[];
  amendments: SalesOrderAmendmentView[];
  notes: SalesOperationalNoteView[];
  viewerUserId: string | null;
};

export type SalesOrderSummaryView = {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string | null;
  status: string;
  statusLabel: string;
  sourceType: string;
  currencyCode: string;
  expectedAmount: string;
  paymentStatus: string;
  orderDate: string;
  createdAt: string;
  nextAction: string;
  outstandingQuantity: string;
  inspectionPending: boolean;
  serviceRemaining: boolean;
  convertedFromQuote: boolean;
};

export type SalesDashboardView = {
  draftCount: number;
  submittedCount: number;
  confirmedCount: number;
  inProgressCount: number;
  completedCount: number;
  cancelledCount: number;
  outstandingFulfilmentCount: number;
  inspectionPendingCount: number;
  serviceRemainingCount: number;
  convertedQuoteCount: number;
  expectedSalesValue: string;
  paymentCollectionAvailable: false;
  paymentStatusLabel: string;
  recentOrders: SalesOrderSummaryView[];
};

export type SalesLineQuantityView = {
  ordered: number;
  accepted: number;
  rejected: number;
  delivered: number;
  missing: number;
  outstanding: number;
  openRejected: number;
  closedWithoutReplacement: number;
  replacementPending: number;
};

export type SalesOrderFulfilmentView = {
  hasActivity: boolean;
  orderedQuantity: string;
  acceptedQuantity: string;
  rejectedQuantity: string;
  deliveredQuantity: string;
  missingQuantity: string;
  outstandingQuantity: string;
  openRejectedQuantity: string;
  completion: SalesCompletionReadinessView;
};

export type SalesCompletionReadinessView = {
  eligible: boolean;
  completionBlocked: boolean;
  blockers: SalesCompletionBlockerCode[] | string[];
  blockerLabels: string[];
  sodRequired: boolean;
  sodPending: boolean;
};

export type SalesNextActionReadiness = {
  readyForDelivery: boolean;
  readyForInspection: boolean;
  readyForCompletion: boolean;
  completionBlocked: boolean;
  completionBlockers: string[];
  readyForCancellation: boolean;
};

export type TransitionOrderInput = {
  targetStatus: string;
  reason?: string | null;
};

export type RecognizeCancellationInput = {
  reason?: string | null;
};

export type RejectCompletionInput = {
  reason?: string | null;
};

export type PaymentReadyOrderContract = {
  orderId: string;
  orderNumber: string;
  businessId: string;
  customerId: string;
  expectedAmount: string;
  currency: string;
  commercialContractId: string | null;
  snapshotId: string | null;
  operationalStatus: string;
  financialInstructionType: string;
  paymentStatus: "NOT_RECORDED";
  paymentRecorded: false;
  paymentCollectionAvailable: false;
  collectedAmount: null;
  tenderSplit: null;
  lines: Array<{
    orderLineId: string;
    offeringId: string;
    expectedPayable: string;
    currencyCode: string;
    components: ExpectedCommercialComponent[];
  }>;
};

export type InventoryFulfilmentHandoffContract = {
  orderId: string;
  orderNumber: string;
  businessId: string;
  customerId: string;
  inventoryExecuted: false;
  stockMoved: false;
  stockOnHand: null;
  lines: Array<{
    orderLineId: string;
    offeringId: string;
    description: string | null;
    orderedQuantity: string;
    salesUomId: string | null;
    deliveredQuantity: string;
    acceptedQuantity: string;
    rejectedQuantity: string;
    missingQuantity: string;
    outstandingQuantity: string;
    lineType: string;
    inspectionStatus: string;
    fulfilmentStatus: string;
    returnReplaceQuantity: string;
  }>;
};

export type BookingHandoffContract = {
  orderId: string;
  orderNumber: string;
  businessId: string;
  schedulerExecuted: false;
  lines: Array<{
    orderLineId: string;
    offeringId: string;
    lineType: string;
  }>;
};

export type RecordPhysicalDeliveryInput = {
  orderId: string;
  orderLineId: string;
  claimedQuantity: number;
  notes?: string | null;
  evidenceNote?: string | null;
  evidenceRef?: string | null;
};

export type InspectDeliveryInput = {
  orderId: string;
  deliveryEventId: string;
  acceptedQuantity: number;
  rejectedQuantity: number;
  comments?: string | null;
  rejectionReasonCode?: string | null;
  qualityFindingCode?: string | null;
  evidenceNote?: string | null;
  evidenceRef?: string | null;
};

export type StartServiceDeliveryInput = {
  orderId: string;
  orderLineId: string;
  quantity?: number;
  notes?: string | null;
  evidenceNote?: string | null;
  evidenceRef?: string | null;
};

export type CompleteServiceDeliveryInput = {
  orderId: string;
  deliveryEventId?: string | null;
  orderLineId?: string | null;
  completedQuantity?: number;
  evidenceNote?: string | null;
  evidenceRef?: string | null;
  comments?: string | null;
};

export type SalesDeliveryEventView = {
  id: string;
  orderLineId: string;
  eventType: string;
  status: string;
  statusLabel: string;
  claimedQuantity: string;
  acceptedQuantity: string;
  rejectedQuantity: string;
  recordedBy: string;
  deliveredAt: string;
  inspectedBy: string | null;
  comments: string | null;
  rejectionReasonCode: string | null;
  qualityFindingCode: string | null;
  evidenceNote: string | null;
};

export type RequestCancellationInput = {
  orderId: string;
  reasonCode: string;
  comments?: string | null;
};

export type InitiateLineDispositionInput = {
  orderId: string;
  orderLineId: string;
  instructionType: string;
  quantity?: number;
  reasonCode: string;
  comments?: string | null;
};

export type ProposeAmendmentInput = {
  orderId: string;
  orderLineId: string;
  quantity: number;
  reason: string;
  snapshot: CommercialSnapshot;
  expected?: ExpectedCommercialAmount | null;
};

export type SalesDispositionInstructionView = {
  id: string;
  orderLineId: string | null;
  instructionType: string;
  instructionTypeLabel: string;
  status: string;
  statusLabel: string;
  quantity: string;
  reasonCode: string;
  comments: string | null;
  submittedBy: string;
  approvedBy: string | null;
  refundExecuted: false;
  stockMoved: false;
  financialInstructionEmitted: boolean;
  stockInstructionEmitted: boolean;
};

export type SalesOrderAmendmentView = {
  id: string;
  orderLineId: string;
  versionNumber: number;
  status: string;
  statusLabel: string;
  reason: string;
  previousQuantity: string;
  proposedQuantity: string;
  previousExpectedAmount: string;
  proposedExpectedAmount: string;
  proposedBy: string;
  approvedBy: string | null;
};

export type FinancialInstructionContract = {
  orderId: string;
  orderNumber: string;
  businessId: string;
  instructionType: string;
  expectedAmount: string;
  currency: string;
  refundExecuted: false;
  paymentRecorded: false;
};

export type StockReturnInstructionContract = {
  orderId: string;
  orderNumber: string;
  businessId: string;
  inventoryExecuted: false;
  stockMoved: false;
  lines: Array<{
    orderLineId: string;
    quantity: string;
    instructionType: string;
  }>;
};

export type SalesOperationalNoteView = {
  id: string;
  orderLineId: string | null;
  body: string;
  createdBy: string;
  createdAt: string;
};

export type AddOperationalNoteInput = {
  orderId: string;
  body: string;
  orderLineId?: string | null;
};

export type SalesDownstreamHandoffContract = {
  payment: PaymentReadyOrderContract;
  fulfilment: InventoryFulfilmentHandoffContract;
  financialInstruction: FinancialInstructionContract;
  stockReturnInstruction: StockReturnInstructionContract;
  booking: BookingHandoffContract;
  paymentCollectionAvailable: false;
  inventoryExecuted: false;
  schedulerExecuted: false;
};

export type SalesAuditRecord = {
  businessId: string;
  actorUserId: string | null;
  orderId: string;
  partyId: string | null;
  operation: string;
  action: SalesAuditAction | string;
  outcome: "SUCCESS" | "FAILURE";
  references?: Record<string, unknown>;
  timestamp?: string;
};

export type ConsumedCommercialResult = {
  snapshot: CommercialSnapshot;
  expected: ExpectedCommercialAmount;
  contract: CommercialTransactionContract;
};
