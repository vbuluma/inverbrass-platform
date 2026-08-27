/**
 * Purpose:
 * Injectable ports for BP-007 payment-obligation foundation.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import type {
  PaymentAuditRecord,
  PaymentCapabilityRecordView,
  PaymentChannelRecord,
  PaymentEnablementFlags,
  PaymentIdempotencyRecord,
  PaymentMethodRecord,
  PaymentNetworkRecord,
  PaymentObligationInsert,
  PaymentObligationRecord,
  PaymentProviderRecord,
  PaymentReadyContract,
  PaymentTransactionInsert,
  PaymentTransactionPatch,
  PaymentTransactionRecord,
  PaymentAllocationInsert,
  PaymentAllocationRecord,
  PaymentAllocationPolicy,
  InvoicePaymentTermRecord,
  PaymentInvoiceInsert,
  PaymentInvoiceRecord,
  InvoiceAdjustmentRecord,
  PaymentReceiptInsert,
  PaymentReceiptRecord,
  PaymentReceiptDeliveryRecord,
  PaymentRefundInsert,
  PaymentRefundRecord,
  PaymentRefundPatch,
  PaymentSettlementInsert,
  PaymentSettlementRecord,
  PaymentSettlementPatch,
  PaymentExceptionInsert,
  PaymentExceptionRecord,
  PaymentExceptionPatch,
  PaymentExceptionListFilter,
  PaymentExceptionPolicy,
  RefundFinancialInstruction,
  SettlementMode,
} from "@/modules/payments/types";

export type PaymentReadyContractPort = {
  getByOrderId(
    context: CurrentBusinessContext,
    orderId: string
  ): Promise<PaymentReadyContract | null>;
};

export type CurrencyReferencePort = {
  isActiveCode(code: string): Promise<boolean>;
};

export type PaymentEnablementPort = {
  getFlags(businessId: string): Promise<PaymentEnablementFlags>;
};

export type PaymentAuditPort = {
  record(entry: PaymentAuditRecord): Promise<void>;
};

export type PaymentObligationRepositoryPort = {
  insert(values: PaymentObligationInsert): Promise<PaymentObligationRecord>;
  findById(businessId: string, obligationId: string): Promise<PaymentObligationRecord | null>;
  findByIdempotencyKey(
    businessId: string,
    idempotencyKey: string
  ): Promise<PaymentObligationRecord | null>;
  findByOrderInstruction(
    businessId: string,
    salesOrderId: string,
    financialInstructionType: string
  ): Promise<PaymentObligationRecord | null>;
  findByObligationNumber(
    businessId: string,
    obligationNumber: string
  ): Promise<PaymentObligationRecord | null>;
  listByBusiness(businessId: string): Promise<PaymentObligationRecord[]>;
  countAll(businessId: string): Promise<number>;
  update(
    businessId: string,
    obligationId: string,
    patch: Partial<
      Pick<
        PaymentObligationRecord,
        | "paidAmount"
        | "outstandingAmount"
        | "paymentStatus"
        | "providerTransactionReference"
        | "updatedBy"
        | "metadata"
      >
    >
  ): Promise<PaymentObligationRecord>;
};

export type PaymentTransactionRepositoryPort = {
  insert(values: PaymentTransactionInsert): Promise<PaymentTransactionRecord>;
  update(
    businessId: string,
    transactionId: string,
    patch: PaymentTransactionPatch
  ): Promise<PaymentTransactionRecord>;
  findById(businessId: string, transactionId: string): Promise<PaymentTransactionRecord | null>;
  findByIdempotencyKey(
    businessId: string,
    idempotencyKey: string
  ): Promise<PaymentTransactionRecord | null>;
  findByProviderReference(
    businessId: string,
    providerTransactionReference: string
  ): Promise<PaymentTransactionRecord | null>;
  findByTransactionNumber(
    businessId: string,
    transactionNumber: string
  ): Promise<PaymentTransactionRecord | null>;
  listByObligation(
    businessId: string,
    obligationId: string
  ): Promise<PaymentTransactionRecord[]>;
  countAll(businessId: string): Promise<number>;
};

export type PaymentAllocationRepositoryPort = {
  insert(values: PaymentAllocationInsert): Promise<PaymentAllocationRecord>;
  update(
    businessId: string,
    allocationId: string,
    patch: Partial<Pick<PaymentAllocationRecord, "status" | "reason" | "updatedBy" | "metadata">>
  ): Promise<PaymentAllocationRecord>;
  findById(businessId: string, allocationId: string): Promise<PaymentAllocationRecord | null>;
  findByIdempotencyKey(
    businessId: string,
    idempotencyKey: string
  ): Promise<PaymentAllocationRecord | null>;
  findByAllocationNumber(
    businessId: string,
    allocationNumber: string
  ): Promise<PaymentAllocationRecord | null>;
  listByObligation(
    businessId: string,
    obligationId: string
  ): Promise<PaymentAllocationRecord[]>;
  listByTransaction(
    businessId: string,
    paymentTransactionId: string
  ): Promise<PaymentAllocationRecord[]>;
  listByBusiness(businessId: string): Promise<PaymentAllocationRecord[]>;
  countAll(businessId: string): Promise<number>;
};

export type PaymentLockPort = {
  runExclusive<T>(key: string, work: () => Promise<T>): Promise<T>;
};

export type PaymentAllocationPolicyPort = {
  getPolicy(businessId: string): Promise<PaymentAllocationPolicy>;
};

export type InvoiceClockPort = {
  now(): Date;
};

export type InvoicePaymentTermPort = {
  listActive(): Promise<InvoicePaymentTermRecord[]>;
  findByCode(code: string): Promise<InvoicePaymentTermRecord | null>;
};

export type PaymentInvoiceRepositoryPort = {
  insert(values: PaymentInvoiceInsert): Promise<PaymentInvoiceRecord>;
  update(
    businessId: string,
    invoiceId: string,
    patch: Partial<
      Pick<
        PaymentInvoiceRecord,
        | "status"
        | "paidAmount"
        | "outstandingAmount"
        | "issueDate"
        | "dueDate"
        | "documentId"
        | "documentStatus"
        | "cancellationReason"
        | "cancelledAt"
        | "cancelledBy"
        | "updatedBy"
        | "metadata"
      >
    >
  ): Promise<PaymentInvoiceRecord>;
  findById(businessId: string, invoiceId: string): Promise<PaymentInvoiceRecord | null>;
  findByIdempotencyKey(
    businessId: string,
    idempotencyKey: string
  ): Promise<PaymentInvoiceRecord | null>;
  findActiveByObligation(
    businessId: string,
    obligationId: string
  ): Promise<PaymentInvoiceRecord | null>;
  listByBusiness(businessId: string): Promise<PaymentInvoiceRecord[]>;
  listByObligation(
    businessId: string,
    obligationId: string
  ): Promise<PaymentInvoiceRecord[]>;
  countAll(businessId: string): Promise<number>;
  insertAdjustment(values: {
    businessId: string;
    invoiceId: string;
    adjustmentType: string;
    status: string;
    amount: string;
    currencyCode: string;
    reason: string;
    handedOffToIp06: string;
    createdBy: string | null;
  }): Promise<InvoiceAdjustmentRecord>;
  listAdjustments(
    businessId: string,
    invoiceId: string
  ): Promise<InvoiceAdjustmentRecord[]>;
};

export type PaymentReceiptIssuerPort = {
  issueForSuccessfulPayment(
    context: CurrentBusinessContext,
    paymentTransactionId: string
  ): Promise<void>;
};

export type PaymentReceiptRepositoryPort = {
  insert(values: PaymentReceiptInsert): Promise<PaymentReceiptRecord>;
  updateDelivery(
    businessId: string,
    receiptId: string,
    patch: Partial<
      Pick<PaymentReceiptRecord, "deliveryStatus" | "updatedBy" | "metadata">
    >
  ): Promise<PaymentReceiptRecord>;
  findById(businessId: string, receiptId: string): Promise<PaymentReceiptRecord | null>;
  findByTransaction(
    businessId: string,
    paymentTransactionId: string
  ): Promise<PaymentReceiptRecord | null>;
  findByIdempotencyKey(
    businessId: string,
    idempotencyKey: string
  ): Promise<PaymentReceiptRecord | null>;
  listByBusiness(businessId: string): Promise<PaymentReceiptRecord[]>;
  listByObligation(
    businessId: string,
    obligationId: string
  ): Promise<PaymentReceiptRecord[]>;
  insertDelivery(values: {
    businessId: string;
    receiptId: string;
    channel: string;
    status: string;
    failureReason: string | null;
    createdBy: string | null;
  }): Promise<PaymentReceiptDeliveryRecord>;
  listDeliveries(
    businessId: string,
    receiptId: string
  ): Promise<PaymentReceiptDeliveryRecord[]>;
};

export type PaymentRefundRepositoryPort = {
  insert(values: PaymentRefundInsert): Promise<PaymentRefundRecord>;
  update(
    businessId: string,
    refundId: string,
    patch: PaymentRefundPatch
  ): Promise<PaymentRefundRecord>;
  findById(businessId: string, refundId: string): Promise<PaymentRefundRecord | null>;
  findByIdempotencyKey(
    businessId: string,
    idempotencyKey: string
  ): Promise<PaymentRefundRecord | null>;
  listByTransaction(
    businessId: string,
    originalPaymentTransactionId: string
  ): Promise<PaymentRefundRecord[]>;
  listByObligation(
    businessId: string,
    obligationId: string
  ): Promise<PaymentRefundRecord[]>;
  listByBusiness(businessId: string): Promise<PaymentRefundRecord[]>;
};

export type PaymentSettlementTrackerPort = {
  trackForSuccessfulPayment(
    context: CurrentBusinessContext,
    paymentTransactionId: string
  ): Promise<void>;
};

export type SettlementPolicyPort = {
  resolveMode(input: {
    businessId: string;
    methodId: string | null;
    channelId: string | null;
    providerId: string | null;
  }): Promise<SettlementMode>;
};

export type PaymentSettlementRepositoryPort = {
  insert(values: PaymentSettlementInsert): Promise<PaymentSettlementRecord>;
  update(
    businessId: string,
    settlementId: string,
    patch: PaymentSettlementPatch
  ): Promise<PaymentSettlementRecord>;
  findById(businessId: string, settlementId: string): Promise<PaymentSettlementRecord | null>;
  findByTransaction(
    businessId: string,
    paymentTransactionId: string
  ): Promise<PaymentSettlementRecord | null>;
  findByIdempotencyKey(
    businessId: string,
    idempotencyKey: string
  ): Promise<PaymentSettlementRecord | null>;
  findBySettlementReference(
    businessId: string,
    settlementReference: string
  ): Promise<PaymentSettlementRecord | null>;
};

export type PaymentExceptionTrackerPort = {
  trackFromPaymentOutcome(
    context: CurrentBusinessContext,
    paymentTransactionId: string
  ): Promise<void>;
  trackDuplicateProviderReference(
    context: CurrentBusinessContext,
    paymentTransactionId: string
  ): Promise<void>;
};

export type PaymentExceptionPolicyPort = {
  getPolicy(businessId: string): Promise<PaymentExceptionPolicy>;
};

export type PaymentExceptionRepositoryPort = {
  insert(values: PaymentExceptionInsert): Promise<PaymentExceptionRecord>;
  update(
    businessId: string,
    exceptionId: string,
    patch: PaymentExceptionPatch
  ): Promise<PaymentExceptionRecord>;
  findById(businessId: string, exceptionId: string): Promise<PaymentExceptionRecord | null>;
  findByIdempotencyKey(
    businessId: string,
    idempotencyKey: string
  ): Promise<PaymentExceptionRecord | null>;
  findOpenByTransactionAndType(
    businessId: string,
    paymentTransactionId: string,
    exceptionType: string
  ): Promise<PaymentExceptionRecord | null>;
  listByTransaction(
    businessId: string,
    paymentTransactionId: string
  ): Promise<PaymentExceptionRecord[]>;
  listByObligation(
    businessId: string,
    obligationId: string
  ): Promise<PaymentExceptionRecord[]>;
  listByBusiness(
    businessId: string,
    filter?: PaymentExceptionListFilter
  ): Promise<PaymentExceptionRecord[]>;
};

export type PaymentFinancialInstructionPort = {
  getById(
    businessId: string,
    instructionId: string
  ): Promise<RefundFinancialInstruction | null>;
};

export type PaymentIdempotencyRepositoryPort = {
  insert(values: {
    id?: string;
    businessId: string;
    idempotencyKey: string;
    operationType: string;
    resourceType: string;
    resourceId: string;
    createdBy: string | null;
  }): Promise<PaymentIdempotencyRecord>;
  find(
    businessId: string,
    operationType: string,
    idempotencyKey: string
  ): Promise<PaymentIdempotencyRecord | null>;
};

export type PaymentCatalogueSnapshot = {
  methods: PaymentMethodRecord[];
  networks: PaymentNetworkRecord[];
  providers: PaymentProviderRecord[];
  channels: PaymentChannelRecord[];
  capabilities: PaymentCapabilityRecordView[];
};

export type PaymentCatalogueRepositoryPort = {
  loadSnapshot(): Promise<PaymentCatalogueSnapshot>;
};
