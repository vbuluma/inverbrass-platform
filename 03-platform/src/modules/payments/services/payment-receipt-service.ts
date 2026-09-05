/**
 * Purpose:
 * BP-007 IP-05 orchestration — issue immutable payment receipts for
 * SUCCESSFUL transactions. Numbering is ENG-003b. Documents are ENG-007.
 * Storage is ENG-015. Delivery is ENG-009.
 *
 * Implementation Package:
 * BP-007 / IP-05 – Receipting & Payment Evidence
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  createInProcessDocumentAdapter,
  type DocumentEnginePort,
} from "@/core/document-engine";
import { addPaymentAmounts } from "@/core/payment-engine";
import {
  DOCUMENT_NUMBERING_DOCUMENT_TYPES,
  DOCUMENT_NUMBERING_ERROR_CODES,
  DocumentNumberingError,
  type DocumentNumberingPort,
} from "@/core/localization-regulatory/document-numbering";
import { createDocumentNumberingPolicyRepository } from "@/core/localization-regulatory/repositories/document-numbering-policy-repository";
import { ConfigurableDocumentNumberingService } from "@/core/localization-regulatory/services/document-numbering-service";
import {
  RECEIPT_DELIVERY_CHANNELS,
  RECEIPT_DELIVERY_STATUSES,
  createInProcessNotificationAdapter,
  type NotificationEnginePort,
} from "@/core/notification-engine";
import {
  RECEIPTING_DOCUMENT_STATES,
  RECEIPTING_DOCUMENT_TYPES,
  createInProcessReceiptingAdapter,
  type ReceiptingEnginePort,
} from "@/core/receipting-engine";
import {
  PAYMENT_AUDIT_ACTIONS,
  PAYMENT_IDEMPOTENCY_OPERATIONS,
  RECEIPT_DELIVERY_STATUS_LABELS,
  RECEIPT_STATUS,
  RECEIPT_STATUS_LABELS,
} from "@/modules/payments/constants";
import {
  PAYMENT_ERROR_CODES,
  PAYMENT_USER_MESSAGES,
  PaymentObligationError,
} from "@/modules/payments/errors";
import type {
  PaymentAllocationRepositoryPort,
  PaymentAuditPort,
  PaymentIdempotencyRepositoryPort,
  PaymentInvoiceRepositoryPort,
  PaymentObligationRepositoryPort,
  PaymentReceiptRepositoryPort,
  PaymentTransactionRepositoryPort,
} from "@/modules/payments/ports";
import { createPaymentAllocationRepository } from "@/modules/payments/repositories/payment-allocation-repository";
import { createPaymentIdempotencyRepository } from "@/modules/payments/repositories/payment-idempotency-repository";
import { createPaymentInvoiceRepository } from "@/modules/payments/repositories/payment-invoice-repository";
import { createPaymentObligationRepository } from "@/modules/payments/repositories/payment-obligation-repository";
import { createPaymentReceiptRepository } from "@/modules/payments/repositories/payment-receipt-repository";
import { createPaymentTransactionRepository } from "@/modules/payments/repositories/payment-transaction-repository";
import { isActiveAllocation } from "@/modules/payments/services/payment-allocation-rules";
import { createPaymentAuditAdapter } from "@/modules/payments/services/payment-obligation-audit-helper";
import {
  assertReceiptEligible,
  receiptAmountFromTransaction,
  receiptPaymentDate,
} from "@/modules/payments/services/payment-receipt-rules";
import type {
  DeliverReceiptCommand,
  IssueReceiptCommand,
  PaymentReceiptRecord,
  ReceiptDashboardView,
  ReceiptDetailView,
  ReceiptView,
} from "@/modules/payments/types";

export type PaymentReceiptServiceDependencies = {
  transactions: PaymentTransactionRepositoryPort;
  obligations: PaymentObligationRepositoryPort;
  allocations: PaymentAllocationRepositoryPort;
  invoices: PaymentInvoiceRepositoryPort;
  receipts: PaymentReceiptRepositoryPort;
  numbering: DocumentNumberingPort;
  receipting: ReceiptingEnginePort;
  documents: DocumentEnginePort;
  notifications: NotificationEnginePort;
  idempotency: PaymentIdempotencyRepositoryPort;
  audit: PaymentAuditPort;
};

function toView(
  row: PaymentReceiptRecord,
  extras?: { obligationNumber?: string }
): ReceiptView {
  return {
    id: row.id,
    receiptNumber: row.receiptNumber,
    businessId: row.businessId,
    paymentTransactionId: row.paymentTransactionId,
    transactionNumber: row.internalPaymentTransactionNumber,
    obligationId: row.paymentObligationId,
    obligationNumber: extras?.obligationNumber ?? "",
    orderNumber: row.orderNumber,
    customerId: row.customerId,
    invoiceId: row.invoiceId,
    invoiceNumber: row.invoiceNumber,
    currencyCode: row.currencyCode,
    amount: row.amount,
    paymentDateTime: row.paymentDateTime.toISOString(),
    methodId: row.methodId,
    methodName: row.methodName,
    networkId: row.networkId,
    networkName: row.networkName,
    providerId: row.providerId,
    providerName: row.providerName,
    channelId: row.channelId,
    channelName: row.channelName,
    providerTransactionReference: row.providerTransactionReference,
    status: row.status,
    statusLabel: RECEIPT_STATUS_LABELS[row.status] ?? row.status,
    deliveryStatus: row.deliveryStatus,
    deliveryStatusLabel:
      RECEIPT_DELIVERY_STATUS_LABELS[row.deliveryStatus] ?? row.deliveryStatus,
    documentId: row.documentId,
    documentStorageKey: row.documentStorageKey,
    originalReceiptId: row.originalReceiptId,
    createdAt: row.createdAt.toISOString(),
  };
}

export class PaymentReceiptService {
  constructor(private readonly deps: PaymentReceiptServiceDependencies) {}

  async issueForSuccessfulPayment(
    context: CurrentBusinessContext,
    paymentTransactionId: string
  ): Promise<void> {
    await this.issueReceipt(context, { paymentTransactionId });
  }

  async getDashboard(context: CurrentBusinessContext): Promise<ReceiptDashboardView> {
    this.assertContext(context);
    const rows = await this.deps.receipts.listByBusiness(context.businessId);
    const recent: ReceiptView[] = [];
    for (const row of rows.slice(0, 20)) {
      const obligation = await this.deps.obligations.findById(
        context.businessId,
        row.paymentObligationId
      );
      recent.push(toView(row, { obligationNumber: obligation?.obligationNumber ?? "" }));
    }
    return { receiptCount: rows.length, recentReceipts: recent };
  }

  async getReceipt(
    context: CurrentBusinessContext,
    receiptId: string
  ): Promise<ReceiptDetailView> {
    this.assertContext(context);
    const receipt = await this.requireReceipt(context, receiptId);
    await this.audit(context, {
      action: PAYMENT_AUDIT_ACTIONS.RECEIPT_VIEWED,
      obligationId: receipt.paymentObligationId,
      paymentTransactionId: receipt.paymentTransactionId,
      receiptId: receipt.id,
      outcome: "SUCCESS",
      references: { receiptNumber: receipt.receiptNumber },
    });
    return this.toDetail(context, receipt);
  }

  async getByTransaction(
    context: CurrentBusinessContext,
    paymentTransactionId: string
  ): Promise<ReceiptDetailView | null> {
    this.assertContext(context);
    const row = await this.deps.receipts.findByTransaction(
      context.businessId,
      paymentTransactionId
    );
    if (!row) {
      return null;
    }
    return this.toDetail(context, row);
  }

  async issueReceipt(
    context: CurrentBusinessContext,
    command: IssueReceiptCommand
  ): Promise<ReceiptDetailView> {
    this.assertContext(context);
    const paymentTransactionId = command.paymentTransactionId?.trim();
    if (!paymentTransactionId) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.INVALID_INPUT,
        PAYMENT_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }
    const transaction = await this.requireTransaction(context, paymentTransactionId);
    assertReceiptEligible(transaction);
    const existing = await this.deps.receipts.findByTransaction(
      context.businessId,
      transaction.id
    );
    if (existing) {
      return this.toDetail(context, existing);
    }

    const idempotencyKey = (
      command.idempotencyKey?.trim() ||
      `${PAYMENT_IDEMPOTENCY_OPERATIONS.CREATE_RECEIPT}:${transaction.id}`
    ).slice(0, 180);
    const byKey = await this.deps.receipts.findByIdempotencyKey(
      context.businessId,
      idempotencyKey
    );
    if (byKey) {
      return this.toDetail(context, byKey);
    }

    const obligation = await this.requireObligation(context, transaction.obligationId);
    const allocations = await this.deps.allocations.listByTransaction(
      context.businessId,
      transaction.id
    );
    const invoice = await this.deps.invoices.findActiveByObligation(
      context.businessId,
      obligation.id
    );
    const activeAllocations = allocations.filter((row) => isActiveAllocation(row));
    const amount = receiptAmountFromTransaction(transaction);

    let allocatedNumber;
    try {
      allocatedNumber = await this.deps.numbering.allocate({
        businessId: context.businessId,
        documentType: DOCUMENT_NUMBERING_DOCUMENT_TYPES.RECEIPT,
      });
    } catch (error) {
      if (
        error instanceof DocumentNumberingError &&
        error.code === DOCUMENT_NUMBERING_ERROR_CODES.POLICY_MISSING
      ) {
        throw new PaymentObligationError(
          PAYMENT_ERROR_CODES.NUMBERING_POLICY_MISSING,
          undefined,
          409
        );
      }
      throw error;
    }

    const evidence = {
      paymentTransactionId: transaction.id,
      transactionNumber: transaction.transactionNumber,
      amount,
      currencyCode: transaction.currencyCode,
      methodId: transaction.methodId,
      networkId: transaction.networkId,
      providerId: transaction.providerId,
      channelId: transaction.channelId,
      methodName: transaction.methodName,
      networkName: transaction.networkName,
      providerName: transaction.providerName,
      channelName: transaction.channelName,
      providerTransactionReference: transaction.providerTransactionReference,
      obligationId: obligation.id,
      obligationNumber: obligation.obligationNumber,
      salesOrderId: obligation.salesOrderId,
      orderNumber: obligation.orderNumber,
      invoiceId: invoice?.id ?? null,
      invoiceNumber: invoice?.invoiceNumber ?? null,
      allocations: activeAllocations.map((row) => ({
        id: row.id,
        allocationNumber: row.allocationNumber,
        allocatedAmount: row.allocatedAmount,
        status: row.status,
      })),
    };

    let documentHandle;
    try {
      documentHandle = await this.deps.receipting.produceFinancialDocument({
        businessId: context.businessId,
        documentType: RECEIPTING_DOCUMENT_TYPES.RECEIPT,
        documentState: RECEIPTING_DOCUMENT_STATES.ISSUED,
        referenceId: transaction.id,
        currencyCode: transaction.currencyCode,
        amount,
        payload: evidence,
      });
    } catch {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.DOCUMENT_PRODUCTION_UNAVAILABLE,
        undefined,
        500
      );
    }

    const stored = await this.deps.documents.storeFinancialDocument({
      businessId: context.businessId,
      documentId: documentHandle.documentId,
      documentType: documentHandle.documentType,
      referenceId: transaction.id,
      payload: evidence,
    });

    const created = await this.deps.receipts.insert({
      businessId: context.businessId,
      receiptNumber: allocatedNumber.number,
      numberingPolicyId: allocatedNumber.policyId,
      paymentTransactionId: transaction.id,
      paymentObligationId: obligation.id,
      customerId: obligation.customerId,
      salesOrderId: obligation.salesOrderId,
      orderNumber: obligation.orderNumber,
      invoiceId: invoice?.id ?? null,
      invoiceNumber: invoice?.invoiceNumber ?? null,
      currencyCode: transaction.currencyCode,
      amount,
      paymentDateTime: receiptPaymentDate(transaction),
      methodId: transaction.methodId,
      networkId: transaction.networkId,
      providerId: transaction.providerId,
      channelId: transaction.channelId,
      methodName: transaction.methodName,
      networkName: transaction.networkName,
      providerName: transaction.providerName,
      channelName: transaction.channelName,
      providerTransactionReference: transaction.providerTransactionReference,
      internalPaymentTransactionNumber: transaction.transactionNumber,
      documentId: documentHandle.documentId,
      documentStorageKey: stored.storageKey,
      documentStatus: documentHandle.documentState,
      status: RECEIPT_STATUS.ISSUED,
      deliveryStatus: "NONE",
      originalReceiptId: null,
      idempotencyKey,
      evidence,
      metadata: { numberingPolicyCode: allocatedNumber.policyCode },
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    await this.deps.idempotency
      .insert({
        businessId: context.businessId,
        idempotencyKey,
        operationType: PAYMENT_IDEMPOTENCY_OPERATIONS.CREATE_RECEIPT,
        resourceType: "payment_receipt",
        resourceId: created.id,
        createdBy: context.platformUserId,
      })
      .catch((error) => {
        if (
          error instanceof PaymentObligationError &&
          error.code === PAYMENT_ERROR_CODES.IDEMPOTENCY_CONFLICT
        ) {
          return;
        }
        throw error;
      });

    await this.audit(context, {
      action: PAYMENT_AUDIT_ACTIONS.RECEIPT_CREATED,
      obligationId: obligation.id,
      paymentTransactionId: transaction.id,
      receiptId: created.id,
      outcome: "SUCCESS",
      references: {
        receiptNumber: created.receiptNumber,
        amount: created.amount,
        currency: created.currencyCode,
      },
    });
    await this.audit(context, {
      action: PAYMENT_AUDIT_ACTIONS.RECEIPT_ISSUED,
      obligationId: obligation.id,
      paymentTransactionId: transaction.id,
      receiptId: created.id,
      outcome: "SUCCESS",
      references: { receiptNumber: created.receiptNumber },
    });
    await this.audit(context, {
      action: PAYMENT_AUDIT_ACTIONS.RECEIPT_DOCUMENT_REQUESTED,
      obligationId: obligation.id,
      paymentTransactionId: transaction.id,
      receiptId: created.id,
      outcome: "SUCCESS",
      references: {
        documentId: created.documentId,
        documentStorageKey: created.documentStorageKey,
      },
    });

    return this.toDetail(context, created, obligation.obligationNumber);
  }

  async requestDelivery(
    context: CurrentBusinessContext,
    command: DeliverReceiptCommand
  ): Promise<ReceiptDetailView> {
    this.assertContext(context);
    const channel = command.channel?.trim().toUpperCase();
    const allowed = new Set(Object.values(RECEIPT_DELIVERY_CHANNELS));
    if (!channel || !allowed.has(channel as (typeof RECEIPT_DELIVERY_CHANNELS)[keyof typeof RECEIPT_DELIVERY_CHANNELS])) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.INVALID_INPUT,
        PAYMENT_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }
    const receipt = await this.requireReceipt(context, command.receiptId);
    let result;
    try {
      result = await this.deps.notifications.requestDocumentDelivery({
        businessId: context.businessId,
        documentType: RECEIPTING_DOCUMENT_TYPES.RECEIPT,
        referenceId: receipt.id,
        channel,
        recipientHint: command.recipientHint ?? null,
        payload: {
          receiptNumber: receipt.receiptNumber,
          documentId: receipt.documentId,
          documentStorageKey: receipt.documentStorageKey,
        },
      });
    } catch {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.RECEIPT_DELIVERY_UNAVAILABLE,
        undefined,
        500
      );
    }

    await this.deps.receipts.insertDelivery({
      businessId: context.businessId,
      receiptId: receipt.id,
      channel: result.channel,
      status: result.status,
      failureReason: result.failureReason,
      createdBy: context.platformUserId,
    });

    const deliveryStatus =
      result.status === RECEIPT_DELIVERY_STATUSES.FAILED
        ? RECEIPT_DELIVERY_STATUSES.FAILED
        : result.status;
    const updated = await this.deps.receipts.updateDelivery(context.businessId, receipt.id, {
      deliveryStatus,
      updatedBy: context.platformUserId,
    });

    await this.audit(context, {
      action: PAYMENT_AUDIT_ACTIONS.RECEIPT_DELIVERY_REQUESTED,
      obligationId: receipt.paymentObligationId,
      paymentTransactionId: receipt.paymentTransactionId,
      receiptId: receipt.id,
      outcome: "SUCCESS",
      references: { channel, status: result.status },
    });
    if (result.status === RECEIPT_DELIVERY_STATUSES.FAILED) {
      await this.audit(context, {
        action: PAYMENT_AUDIT_ACTIONS.RECEIPT_DELIVERY_FAILED,
        obligationId: receipt.paymentObligationId,
        paymentTransactionId: receipt.paymentTransactionId,
        receiptId: receipt.id,
        outcome: "FAILURE",
        references: { channel, failureReason: result.failureReason },
      });
    }
    return this.toDetail(context, updated);
  }

  private async toDetail(
    context: CurrentBusinessContext,
    receipt: PaymentReceiptRecord,
    obligationNumber?: string
  ): Promise<ReceiptDetailView> {
    const obligation = await this.deps.obligations.findById(
      context.businessId,
      receipt.paymentObligationId
    );
    const allocations = await this.deps.allocations.listByTransaction(
      context.businessId,
      receipt.paymentTransactionId
    );
    const deliveries = await this.deps.receipts.listDeliveries(
      context.businessId,
      receipt.id
    );
    const active = allocations.filter((row) => isActiveAllocation(row));
    const allocatedAmount = active.reduce(
      (sum, row) => addPaymentAmounts(sum, row.allocatedAmount),
      "0"
    );
    return {
      ...toView(receipt, {
        obligationNumber: obligationNumber ?? obligation?.obligationNumber ?? "",
      }),
      salesOrderId: receipt.salesOrderId,
      allocatedAmount,
      allocations: active.map((row) => ({
        id: row.id,
        allocationNumber: row.allocationNumber,
        allocatedAmount: row.allocatedAmount,
        status: row.status,
      })),
      deliveries: deliveries.map((row) => ({
        id: row.id,
        channel: row.channel,
        status: row.status,
        failureReason: row.failureReason,
        requestedAt: row.requestedAt.toISOString(),
      })),
      evidence: receipt.evidence,
    };
  }

  private async requireReceipt(context: CurrentBusinessContext, receiptId: string) {
    const row = await this.deps.receipts.findById(context.businessId, receiptId?.trim() || "");
    if (!row) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.RECEIPT_NOT_FOUND,
        undefined,
        404
      );
    }
    return row;
  }

  private async requireTransaction(context: CurrentBusinessContext, transactionId: string) {
    const row = await this.deps.transactions.findById(context.businessId, transactionId);
    if (!row) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.TRANSACTION_NOT_FOUND,
        undefined,
        404
      );
    }
    return row;
  }

  private async requireObligation(context: CurrentBusinessContext, obligationId: string) {
    const row = await this.deps.obligations.findById(context.businessId, obligationId);
    if (!row) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.OBLIGATION_NOT_FOUND,
        undefined,
        404
      );
    }
    return row;
  }

  private assertContext(context: CurrentBusinessContext): void {
    if (!context?.businessId?.trim()) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.BUSINESS_CONTEXT_REQUIRED,
        PAYMENT_USER_MESSAGES.BUSINESS_CONTEXT_REQUIRED,
        403
      );
    }
  }

  private async audit(
    context: CurrentBusinessContext,
    entry: {
      action: string;
      obligationId: string | null;
      paymentTransactionId?: string | null;
      receiptId?: string | null;
      outcome: "SUCCESS" | "FAILURE";
      references?: Record<string, unknown>;
    }
  ): Promise<void> {
    try {
      await this.deps.audit.record({
        businessId: context.businessId,
        actorUserId: context.platformUserId,
        obligationId: entry.obligationId,
        paymentTransactionId: entry.paymentTransactionId,
        receiptId: entry.receiptId,
        operation: entry.action,
        action: entry.action,
        outcome: entry.outcome,
        references: entry.references,
      });
    } catch {
      // Audit must not mask the original fail-closed error.
    }
  }
}

export function createDefaultPaymentReceiptDependencies(): PaymentReceiptServiceDependencies {
  return {
    transactions: createPaymentTransactionRepository(),
    obligations: createPaymentObligationRepository(),
    allocations: createPaymentAllocationRepository(),
    invoices: createPaymentInvoiceRepository(),
    receipts: createPaymentReceiptRepository(),
    numbering: new ConfigurableDocumentNumberingService(
      createDocumentNumberingPolicyRepository()
    ),
    receipting: createInProcessReceiptingAdapter(),
    documents: createInProcessDocumentAdapter(),
    notifications: createInProcessNotificationAdapter(),
    idempotency: createPaymentIdempotencyRepository(),
    audit: createPaymentAuditAdapter(),
  };
}

export function createPaymentReceiptService(deps?: PaymentReceiptServiceDependencies) {
  return new PaymentReceiptService(deps ?? createDefaultPaymentReceiptDependencies());
}
