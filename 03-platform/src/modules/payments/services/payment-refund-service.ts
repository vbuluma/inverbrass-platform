/**
 * Purpose:
 * BP-007 IP-06 orchestration — refund/reversal against an immutable
 * successful payment. Electronic refunds go through ENG-006. Approval
 * is ENG-005. Numbering is ENG-003b. Documents are ENG-007/ENG-015.
 *
 * Implementation Package:
 * BP-007 / IP-06 – Refunds, Reversals & Adjustments
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  createInProcessDocumentAdapter,
  type DocumentEnginePort,
} from "@/core/document-engine";
import {
  DOCUMENT_NUMBERING_DOCUMENT_TYPES,
  DOCUMENT_NUMBERING_ERROR_CODES,
  DocumentNumberingError,
  type DocumentNumberingPort,
} from "@/core/localization-regulatory/document-numbering";
import { createDocumentNumberingPolicyRepository } from "@/core/localization-regulatory/repositories/document-numbering-policy-repository";
import { ConfigurableDocumentNumberingService } from "@/core/localization-regulatory/services/document-numbering-service";
import {
  PAYMENT_ENGINE_ERROR_CODES,
  PaymentEngineError,
  createCatalogueCapabilityPaymentEngine,
  createInProcessPaymentInitiationAdapter,
  isAmountWithinConfiguredLimits,
  type PaymentEnginePort,
} from "@/core/payment-engine";
import {
  RECEIPTING_DOCUMENT_STATES,
  RECEIPTING_DOCUMENT_TYPES,
  createInProcessReceiptingAdapter,
  type ReceiptingEnginePort,
} from "@/core/receipting-engine";
import {
  WORKFLOW_ENGINE_ERROR_CODES,
  WorkflowEngineError,
  createInProcessWorkflowAdapter,
  type WorkflowEnginePort,
} from "@/core/workflow-engine";
import { createNoopFinancialInstructionAdapter } from "@/modules/payments/adapters/payment-financial-instruction-adapter";
import {
  PAYMENT_AUDIT_ACTIONS,
  PAYMENT_CAPTURE_MODES,
  PAYMENT_IDEMPOTENCY_OPERATIONS,
  PAYMENT_STATUS_CODES,
  REFUND_STATUS,
  REFUND_STATUS_LABELS,
  REFUND_TYPE_LABELS,
} from "@/modules/payments/constants";
import {
  PAYMENT_ERROR_CODES,
  PAYMENT_USER_MESSAGES,
  PaymentObligationError,
} from "@/modules/payments/errors";
import type {
  PaymentAllocationRepositoryPort,
  PaymentAuditPort,
  PaymentCatalogueRepositoryPort,
  PaymentFinancialInstructionPort,
  PaymentIdempotencyRepositoryPort,
  PaymentInvoiceRepositoryPort,
  PaymentLockPort,
  PaymentObligationRepositoryPort,
  PaymentReceiptRepositoryPort,
  PaymentRefundRepositoryPort,
  PaymentTransactionRepositoryPort,
} from "@/modules/payments/ports";
import { createPaymentAllocationRepository } from "@/modules/payments/repositories/payment-allocation-repository";
import { createPaymentIdempotencyRepository } from "@/modules/payments/repositories/payment-idempotency-repository";
import { createPaymentInvoiceRepository } from "@/modules/payments/repositories/payment-invoice-repository";
import { createPaymentObligationRepository } from "@/modules/payments/repositories/payment-obligation-repository";
import { createPaymentReceiptRepository } from "@/modules/payments/repositories/payment-receipt-repository";
import { createPaymentRefundRepository } from "@/modules/payments/repositories/payment-refund-repository";
import { createPaymentTransactionRepository } from "@/modules/payments/repositories/payment-transaction-repository";
import { createPaymentCatalogueRepository, createPaymentCapabilityStoreAdapter } from "@/modules/payments/repositories/payment-catalogue-repository";
import { PaymentAllocationService } from "@/modules/payments/services/payment-allocation-service";
import { PaymentInvoiceService } from "@/modules/payments/services/payment-invoice-service";
import { createInProcessPaymentLock } from "@/modules/payments/services/payment-lock";
import { createPaymentAuditAdapter } from "@/modules/payments/services/payment-obligation-audit-helper";
import {
  REFUND_INSTRUCTION_TYPES,
  assertRefundAmount,
  assertRefundEligible,
  assertRefundTransition,
  displayedRefundableAmount,
  requestRefundableAmount,
  resolveRefundType,
  successfulRefundTotal,
} from "@/modules/payments/services/payment-refund-rules";
import type {
  ApproveRefundCommand,
  PaymentRefundRecord,
  PaymentTransactionRecord,
  RefundDetailView,
  RefundEligibilityView,
  RefundView,
  RequestRefundCommand,
} from "@/modules/payments/types";

export type PaymentRefundServiceDependencies = {
  transactions: PaymentTransactionRepositoryPort;
  obligations: PaymentObligationRepositoryPort;
  allocations: PaymentAllocationRepositoryPort;
  receipts: PaymentReceiptRepositoryPort;
  invoices: PaymentInvoiceRepositoryPort;
  refunds: PaymentRefundRepositoryPort;
  catalogues: PaymentCatalogueRepositoryPort;
  numbering: DocumentNumberingPort;
  receipting: ReceiptingEnginePort;
  documents: DocumentEnginePort;
  engine: PaymentEnginePort;
  workflow: WorkflowEnginePort;
  instructions: PaymentFinancialInstructionPort;
  allocationEffects: PaymentAllocationService;
  invoiceEffects?: PaymentInvoiceService;
  idempotency: PaymentIdempotencyRepositoryPort;
  locks: PaymentLockPort;
  audit: PaymentAuditPort;
};

function toView(row: PaymentRefundRecord): RefundView {
  return {
    id: row.id,
    refundNumber: row.refundNumber,
    businessId: row.businessId,
    originalPaymentTransactionId: row.originalPaymentTransactionId,
    originalPaymentReference: row.originalPaymentReference,
    obligationId: row.paymentObligationId,
    originalReceiptId: row.originalReceiptId,
    originatingFinancialInstructionId: row.originatingFinancialInstructionId,
    invoiceId: row.invoiceId,
    refundType: row.refundType,
    refundTypeLabel: REFUND_TYPE_LABELS[row.refundType] ?? row.refundType,
    amount: row.amount,
    currencyCode: row.currencyCode,
    methodName: row.methodName,
    status: row.status,
    statusLabel: REFUND_STATUS_LABELS[row.status] ?? row.status,
    reason: row.reason,
    providerRefundReference: row.providerRefundReference,
    documentId: row.documentId,
    requestedBy: row.requestedBy,
    approvedBy: row.approvedBy,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

export class PaymentRefundService {
  constructor(private readonly deps: PaymentRefundServiceDependencies) {}

  async getEligibility(
    context: CurrentBusinessContext,
    paymentTransactionId: string
  ): Promise<RefundEligibilityView> {
    this.assertContext(context);
    const transaction = await this.requireTransaction(context, paymentTransactionId);
    const refunds = await this.deps.refunds.listByTransaction(
      context.businessId,
      transaction.id
    );
    const receipt = await this.deps.receipts.findByTransaction(
      context.businessId,
      transaction.id
    );
    const invoice = await this.deps.invoices.findActiveByObligation(
      context.businessId,
      transaction.obligationId
    );
    const displayed = displayedRefundableAmount(transaction.amount, refunds);
    const manual = await this.isManualRefund(transaction);
    const decision = await this.deps.workflow.evaluateRefundApproval({
      businessId: context.businessId,
      amount: displayed,
      currencyCode: transaction.currencyCode,
      refundType: "FULL_REFUND",
    });
    return {
      paymentTransactionId: transaction.id,
      originalAmount: transaction.amount,
      currencyCode: transaction.currencyCode,
      alreadyRefundedAmount: successfulRefundTotal(refunds),
      refundableAmount: displayed,
      eligible:
        transaction.status === PAYMENT_STATUS_CODES.SUCCESSFUL &&
        displayed !== "0",
      originalReceiptId: receipt?.id ?? null,
      invoiceId: invoice?.id ?? null,
      captureMode: transaction.captureMode,
      requiresApproval: decision.required,
      requiresManualConfirmation: manual,
      refunds: refunds.map(toView),
    };
  }

  async getRefund(
    context: CurrentBusinessContext,
    refundId: string
  ): Promise<RefundDetailView> {
    this.assertContext(context);
    const refund = await this.requireRefund(context, refundId);
    return this.toDetail(context, refund);
  }

  async requestRefund(
    context: CurrentBusinessContext,
    command: RequestRefundCommand
  ): Promise<RefundDetailView> {
    this.assertContext(context);
    const paymentTransactionId = command.paymentTransactionId?.trim();
    const reason = command.reason?.trim();
    if (!paymentTransactionId || !reason) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.INVALID_INPUT,
        PAYMENT_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }
    return this.deps.locks.runExclusive(
      `${context.businessId}:refund:${paymentTransactionId}`,
      () => this.requestInsideLock(context, command, paymentTransactionId, reason)
    );
  }

  async approveRefund(
    context: CurrentBusinessContext,
    command: ApproveRefundCommand
  ): Promise<RefundDetailView> {
    this.assertContext(context);
    const refundId = command.refundId?.trim();
    if (!refundId || (command.decision !== "APPROVE" && command.decision !== "REJECT")) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.INVALID_INPUT,
        PAYMENT_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }
    const refund = await this.requireRefund(context, refundId);
    return this.deps.locks.runExclusive(
      `${context.businessId}:refund:${refund.originalPaymentTransactionId}`,
      () => this.approveInsideLock(context, command, refund.id)
    );
  }

  private async requestInsideLock(
    context: CurrentBusinessContext,
    command: RequestRefundCommand,
    paymentTransactionId: string,
    reason: string
  ): Promise<RefundDetailView> {
    const transaction = await this.requireTransaction(context, paymentTransactionId);
    const obligation = await this.requireObligation(context, transaction.obligationId);
    this.assertSameTenant(context, transaction, obligation);
    assertRefundEligible(transaction);

    const idempotencyKey = (
      command.idempotencyKey?.trim() ||
      `${PAYMENT_IDEMPOTENCY_OPERATIONS.REQUEST_REFUND}:${transaction.id}:${command.amount?.trim() || "full"}:${reason}`
    ).slice(0, 180);
    const existing = await this.deps.refunds.findByIdempotencyKey(
      context.businessId,
      idempotencyKey
    );
    if (existing) {
      return this.toDetail(context, existing);
    }

    const instruction = await this.resolveInstruction(
      context,
      obligation.salesOrderId,
      command.financialInstructionId
    );
    const refunds = await this.deps.refunds.listByTransaction(
      context.businessId,
      transaction.id
    );
    if (refunds.some((row) => row.status === REFUND_STATUS.UNKNOWN)) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.REFUND_OUTCOME_UNKNOWN,
        undefined,
        409
      );
    }
    const refundable = requestRefundableAmount(transaction.amount, refunds);
    const displayed = displayedRefundableAmount(transaction.amount, refunds);
    const amount = (command.amount?.trim() || displayed).trim();
    assertRefundAmount(amount, transaction.currencyCode, transaction, refundable);
    const refundType = resolveRefundType(command.refundType, amount, displayed);
    const manual = await this.isManualRefund(transaction);
    if (manual && command.confirmManual !== true) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.PAYMENT_MANUAL_CONFIRMATION_REQUIRED,
        undefined,
        409
      );
    }

    let allocatedNumber;
    try {
      allocatedNumber = await this.deps.numbering.allocate({
        businessId: context.businessId,
        documentType: DOCUMENT_NUMBERING_DOCUMENT_TYPES.REFUND,
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

    const receipt = await this.deps.receipts.findByTransaction(
      context.businessId,
      transaction.id
    );
    const invoice = await this.deps.invoices.findActiveByObligation(
      context.businessId,
      obligation.id
    );
    const decision = await this.deps.workflow.evaluateRefundApproval({
      businessId: context.businessId,
      amount,
      currencyCode: transaction.currencyCode,
      refundType,
    });
    const created = await this.deps.refunds.insert({
      businessId: context.businessId,
      refundNumber: allocatedNumber.number,
      numberingPolicyId: allocatedNumber.policyId,
      originalPaymentTransactionId: transaction.id,
      originalPaymentReference: transaction.transactionNumber,
      paymentObligationId: obligation.id,
      originalReceiptId: receipt?.id ?? null,
      originatingFinancialInstructionId: instruction?.id ?? null,
      invoiceId: invoice?.id ?? null,
      refundType,
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
      status: REFUND_STATUS.REQUESTED,
      reason,
      providerRefundReference: null,
      idempotencyKey,
      requestedBy: context.platformUserId,
      approvedBy: null,
      initiatedAt: null,
      completedAt: null,
      failureCode: null,
      failureReason: null,
      providerMetadata: null,
      documentId: null,
      documentStorageKey: null,
      documentStatus: null,
      captureMode: transaction.captureMode,
      metadata: { numberingPolicyCode: allocatedNumber.policyCode },
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });
    await this.deps.idempotency
      .insert({
        businessId: context.businessId,
        idempotencyKey,
        operationType: PAYMENT_IDEMPOTENCY_OPERATIONS.REQUEST_REFUND,
        resourceType: "payment_refund",
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
      action: PAYMENT_AUDIT_ACTIONS.REFUND_REQUESTED,
      obligationId: obligation.id,
      paymentTransactionId: transaction.id,
      refundId: created.id,
      outcome: "SUCCESS",
      references: {
        amount: created.amount,
        currency: created.currencyCode,
        reason: created.reason,
        financialInstructionId: created.originatingFinancialInstructionId,
      },
    });

    if (decision.required) {
      const pending = await this.transition(context, created, REFUND_STATUS.APPROVAL_PENDING, {});
      await this.audit(context, {
        action: PAYMENT_AUDIT_ACTIONS.REFUND_APPROVAL_REQUESTED,
        obligationId: obligation.id,
        paymentTransactionId: transaction.id,
        refundId: pending.id,
        outcome: "SUCCESS",
        references: { amount: pending.amount, currency: pending.currencyCode },
      });
      return this.toDetail(context, pending);
    }

    const approved = await this.transition(context, created, REFUND_STATUS.APPROVED, {
      approvedBy: context.platformUserId,
    });
    await this.audit(context, {
      action: PAYMENT_AUDIT_ACTIONS.REFUND_APPROVED,
      obligationId: obligation.id,
      paymentTransactionId: transaction.id,
      refundId: approved.id,
      outcome: "SUCCESS",
      references: { amount: approved.amount, currency: approved.currencyCode },
    });
    return this.initiateInsideLock(context, approved);
  }

  private async approveInsideLock(
    context: CurrentBusinessContext,
    command: ApproveRefundCommand,
    refundId: string
  ): Promise<RefundDetailView> {
    const refund = await this.requireRefund(context, refundId);
    if (refund.status === REFUND_STATUS.SUCCESSFUL) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.REFUND_ALREADY_COMPLETED,
        undefined,
        409
      );
    }
    try {
      this.deps.workflow.assertDistinctActors(
        refund.requestedBy ?? "",
        context.platformUserId
      );
    } catch (error) {
      if (
        error instanceof WorkflowEngineError &&
        error.code === WORKFLOW_ENGINE_ERROR_CODES.SELF_APPROVAL
      ) {
        throw new PaymentObligationError(
          PAYMENT_ERROR_CODES.REFUND_SELF_APPROVAL,
          undefined,
          409
        );
      }
      throw error;
    }
    if (command.decision === "REJECT") {
      const rejected = await this.transition(context, refund, REFUND_STATUS.REJECTED, {
        failureReason: command.reason?.trim() || "Rejected",
        completedAt: new Date(),
      });
      await this.audit(context, {
        action: PAYMENT_AUDIT_ACTIONS.REFUND_REJECTED,
        obligationId: refund.paymentObligationId,
        paymentTransactionId: refund.originalPaymentTransactionId,
        refundId: rejected.id,
        outcome: "SUCCESS",
        references: { reason: rejected.failureReason },
      });
      return this.toDetail(context, rejected);
    }
    const approved = await this.transition(context, refund, REFUND_STATUS.APPROVED, {
      approvedBy: context.platformUserId,
    });
    await this.audit(context, {
      action: PAYMENT_AUDIT_ACTIONS.REFUND_APPROVED,
      obligationId: refund.paymentObligationId,
      paymentTransactionId: refund.originalPaymentTransactionId,
      refundId: approved.id,
      outcome: "SUCCESS",
      references: { amount: approved.amount, currency: approved.currencyCode },
    });
    return this.initiateInsideLock(context, approved);
  }

  private async initiateInsideLock(
    context: CurrentBusinessContext,
    refund: PaymentRefundRecord
  ): Promise<RefundDetailView> {
    if (refund.status === REFUND_STATUS.UNKNOWN) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.REFUND_OUTCOME_UNKNOWN,
        undefined,
        409
      );
    }
    if (refund.status === REFUND_STATUS.SUCCESSFUL) {
      return this.toDetail(context, refund);
    }
    if (refund.status === REFUND_STATUS.FAILED || refund.status === REFUND_STATUS.REJECTED) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.REFUND_INVALID_TRANSITION,
        undefined,
        409
      );
    }
    const transaction = await this.requireTransaction(
      context,
      refund.originalPaymentTransactionId
    );
    if (transaction.status !== PAYMENT_STATUS_CODES.SUCCESSFUL) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.NO_REFUNDABLE_PAYMENT,
        undefined,
        409
      );
    }
    const initiated = await this.transition(context, refund, REFUND_STATUS.INITIATED, {
      initiatedAt: new Date(),
    });
    await this.audit(context, {
      action: PAYMENT_AUDIT_ACTIONS.REFUND_INITIATED,
      obligationId: initiated.paymentObligationId,
      paymentTransactionId: initiated.originalPaymentTransactionId,
      refundId: initiated.id,
      outcome: "SUCCESS",
      references: {
        amount: initiated.amount,
        currency: initiated.currencyCode,
        reason: initiated.reason,
      },
    });

    const manual = await this.isManualRefund(transaction);
    if (manual) {
      return this.completeSuccessful(context, initiated, {
        providerRefundReference: null,
        providerMetadata: { source: "manual" },
      });
    }

    if (!transaction.providerId || !transaction.channelId) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.REFUND_NOT_ALLOWED,
        undefined,
        409
      );
    }
    const capabilities = await this.deps.engine.getCapabilities(
      transaction.providerId,
      transaction.channelId
    );
    if (!capabilities?.supportsRefund || !capabilities.isAvailable) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.REFUND_NOT_ALLOWED,
        undefined,
        409
      );
    }
    if (capabilities.limits) {
      const allowed = isAmountWithinConfiguredLimits({
        amount: initiated.amount,
        minAmount: capabilities.limits.minAmount,
        maxAmount: capabilities.limits.maxAmount,
        transactionLimit: capabilities.limits.transactionLimit,
      });
      if (!allowed) {
        throw new PaymentObligationError(
          PAYMENT_ERROR_CODES.PAYMENT_LIMIT_EXCEEDED,
          undefined,
          409
        );
      }
    }

    let outcome;
    try {
      outcome = await this.deps.engine.refundPayment({
        businessId: context.businessId,
        providerId: transaction.providerId,
        channelId: transaction.channelId,
        amount: initiated.amount,
        currency: initiated.currencyCode,
        originalProviderTransactionReference:
          transaction.providerTransactionReference ?? initiated.originalPaymentReference,
        originalPaymentTransactionId: transaction.id,
        idempotencyKey: initiated.idempotencyKey,
      });
    } catch (error) {
      if (
        error instanceof PaymentEngineError &&
        error.code === PAYMENT_ENGINE_ERROR_CODES.EXECUTION_NOT_AVAILABLE
      ) {
        throw new PaymentObligationError(
          PAYMENT_ERROR_CODES.REFUND_EXECUTION_UNAVAILABLE,
          undefined,
          409
        );
      }
      const unknown = await this.transition(context, initiated, REFUND_STATUS.UNKNOWN, {
        failureCode: PAYMENT_ERROR_CODES.REFUND_OUTCOME_UNKNOWN,
        failureReason: PAYMENT_USER_MESSAGES.REFUND_OUTCOME_UNKNOWN,
      });
      await this.audit(context, {
        action: PAYMENT_AUDIT_ACTIONS.REFUND_UNKNOWN,
        obligationId: unknown.paymentObligationId,
        paymentTransactionId: unknown.originalPaymentTransactionId,
        refundId: unknown.id,
        outcome: "FAILURE",
        references: { amount: unknown.amount, currency: unknown.currencyCode },
      });
      return this.toDetail(context, unknown);
    }

    if (outcome.outcome === "SUCCESSFUL") {
      return this.completeSuccessful(context, initiated, {
        providerRefundReference: outcome.providerTransactionReference,
        providerMetadata: outcome.metadata ?? null,
      });
    }
    if (outcome.outcome === "FAILED" || outcome.outcome === "EXPIRED") {
      const failed = await this.transition(context, initiated, REFUND_STATUS.FAILED, {
        failureCode: outcome.failureCode ?? PAYMENT_ERROR_CODES.REFUND_PROVIDER_REJECTED,
        failureReason: outcome.failureReason ?? PAYMENT_USER_MESSAGES.REFUND_PROVIDER_REJECTED,
        providerRefundReference: outcome.providerTransactionReference,
        providerMetadata: outcome.metadata ?? null,
        completedAt: new Date(),
      });
      await this.audit(context, {
        action: PAYMENT_AUDIT_ACTIONS.REFUND_FAILED,
        obligationId: failed.paymentObligationId,
        paymentTransactionId: failed.originalPaymentTransactionId,
        refundId: failed.id,
        outcome: "FAILURE",
        references: {
          amount: failed.amount,
          currency: failed.currencyCode,
          providerReference: failed.providerRefundReference,
        },
      });
      return this.toDetail(context, failed);
    }
    if (outcome.outcome === "UNKNOWN") {
      const unknown = await this.transition(context, initiated, REFUND_STATUS.UNKNOWN, {
        providerRefundReference: outcome.providerTransactionReference,
        providerMetadata: outcome.metadata ?? null,
        failureCode: PAYMENT_ERROR_CODES.REFUND_OUTCOME_UNKNOWN,
        failureReason: PAYMENT_USER_MESSAGES.REFUND_OUTCOME_UNKNOWN,
      });
      await this.audit(context, {
        action: PAYMENT_AUDIT_ACTIONS.REFUND_UNKNOWN,
        obligationId: unknown.paymentObligationId,
        paymentTransactionId: unknown.originalPaymentTransactionId,
        refundId: unknown.id,
        outcome: "FAILURE",
        references: {
          amount: unknown.amount,
          currency: unknown.currencyCode,
          providerReference: unknown.providerRefundReference,
        },
      });
      return this.toDetail(context, unknown);
    }

    const pending = await this.transition(context, initiated, REFUND_STATUS.PENDING, {
      providerRefundReference: outcome.providerTransactionReference,
      providerMetadata: outcome.metadata ?? null,
    });
    await this.audit(context, {
      action: PAYMENT_AUDIT_ACTIONS.REFUND_PENDING,
      obligationId: pending.paymentObligationId,
      paymentTransactionId: pending.originalPaymentTransactionId,
      refundId: pending.id,
      outcome: "SUCCESS",
      references: {
        amount: pending.amount,
        currency: pending.currencyCode,
        providerReference: pending.providerRefundReference,
      },
    });
    return this.toDetail(context, pending);
  }

  private async completeSuccessful(
    context: CurrentBusinessContext,
    refund: PaymentRefundRecord,
    patch: {
      providerRefundReference: string | null;
      providerMetadata: Record<string, unknown> | null;
    }
  ): Promise<RefundDetailView> {
    const transaction = await this.requireTransaction(
      context,
      refund.originalPaymentTransactionId
    );
    await this.deps.allocationEffects.recordRefundEffect(context, {
      transaction,
      refundId: refund.id,
      amount: refund.amount,
      reason: refund.reason,
    });
    if (this.deps.invoiceEffects) {
      await this.deps.invoiceEffects.reflectObligationSettlements(
        context,
        refund.paymentObligationId
      );
    }
    let documentId = refund.documentId;
    let documentStorageKey = refund.documentStorageKey;
    let documentStatus = refund.documentStatus;
    try {
      const handle = await this.deps.receipting.produceFinancialDocument({
        businessId: context.businessId,
        documentType: RECEIPTING_DOCUMENT_TYPES.REFUND,
        documentState: RECEIPTING_DOCUMENT_STATES.ISSUED,
        referenceId: refund.id,
        currencyCode: refund.currencyCode,
        amount: refund.amount,
        payload: {
          refundNumber: refund.refundNumber,
          originalPaymentReference: refund.originalPaymentReference,
          originalReceiptId: refund.originalReceiptId,
        },
      });
      const stored = await this.deps.documents.storeFinancialDocument({
        businessId: context.businessId,
        documentId: handle.documentId,
        documentType: handle.documentType,
        referenceId: refund.id,
        payload: { refundNumber: refund.refundNumber },
      });
      documentId = handle.documentId;
      documentStorageKey = stored.storageKey;
      documentStatus = handle.documentState;
      await this.audit(context, {
        action: PAYMENT_AUDIT_ACTIONS.REFUND_DOCUMENT_REQUESTED,
        obligationId: refund.paymentObligationId,
        paymentTransactionId: refund.originalPaymentTransactionId,
        refundId: refund.id,
        outcome: "SUCCESS",
        references: { documentId: handle.documentId },
      });
    } catch {
      // Document failure must not reverse a successful refund.
    }

    const successful = await this.transition(context, refund, REFUND_STATUS.SUCCESSFUL, {
      providerRefundReference: patch.providerRefundReference,
      providerMetadata: patch.providerMetadata,
      documentId,
      documentStorageKey,
      documentStatus,
      completedAt: new Date(),
    });
    await this.audit(context, {
      action: PAYMENT_AUDIT_ACTIONS.REFUND_SUCCESSFUL,
      obligationId: successful.paymentObligationId,
      paymentTransactionId: successful.originalPaymentTransactionId,
      refundId: successful.id,
      outcome: "SUCCESS",
      references: {
        amount: successful.amount,
        currency: successful.currencyCode,
        reason: successful.reason,
        financialInstructionId: successful.originatingFinancialInstructionId,
        providerReference: successful.providerRefundReference,
        originalReceiptId: successful.originalReceiptId,
      },
    });
    return this.toDetail(context, successful);
  }

  private async resolveInstruction(
    context: CurrentBusinessContext,
    salesOrderId: string,
    financialInstructionId?: string | null
  ) {
    const instructionId = financialInstructionId?.trim();
    if (!instructionId) {
      return null;
    }
    const instruction = await this.deps.instructions.getById(
      context.businessId,
      instructionId
    );
    if (
      !instruction ||
      instruction.businessId !== context.businessId ||
      instruction.alreadyProcessed ||
      instruction.orderId !== salesOrderId ||
      !REFUND_INSTRUCTION_TYPES.has(instruction.instructionType)
    ) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.FINANCIAL_INSTRUCTION_INVALID,
        undefined,
        409
      );
    }
    return instruction;
  }

  private async isManualRefund(transaction: PaymentTransactionRecord): Promise<boolean> {
    if (transaction.captureMode === PAYMENT_CAPTURE_MODES.MANUAL) {
      return true;
    }
    if (!transaction.methodId) {
      return false;
    }
    const snapshot = await this.deps.catalogues.loadSnapshot();
    const method = snapshot.methods.find((row) => row.id === transaction.methodId);
    return Boolean(method && !method.requiresProvider && !method.requiresChannel);
  }

  private async transition(
    context: CurrentBusinessContext,
    refund: PaymentRefundRecord,
    status: string,
    patch: Parameters<PaymentRefundServiceDependencies["refunds"]["update"]>[2]
  ) {
    assertRefundTransition(refund.status, status);
    return this.deps.refunds.update(context.businessId, refund.id, {
      ...patch,
      status,
      updatedBy: context.platformUserId,
    });
  }

  private async toDetail(
    context: CurrentBusinessContext,
    refund: PaymentRefundRecord
  ): Promise<RefundDetailView> {
    const transaction = await this.requireTransaction(
      context,
      refund.originalPaymentTransactionId
    );
    const refunds = await this.deps.refunds.listByTransaction(
      context.businessId,
      transaction.id
    );
    return {
      ...toView(refund),
      originalPaymentStatus: transaction.status,
      originalPaymentAmount: transaction.amount,
      refundableAmount: displayedRefundableAmount(transaction.amount, refunds),
      alreadyRefundedAmount: successfulRefundTotal(refunds),
      captureMode: refund.captureMode,
      networkName: refund.networkName,
      providerName: refund.providerName,
      channelName: refund.channelName,
      failureReason: refund.failureReason,
      customerMessage: REFUND_STATUS_LABELS[refund.status] ?? refund.status,
    };
  }

  private async requireTransaction(context: CurrentBusinessContext, transactionId: string) {
    const row = await this.deps.transactions.findById(context.businessId, transactionId);
    if (!row || row.businessId !== context.businessId) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.CROSS_BUSINESS_ACCESS,
        undefined,
        403
      );
    }
    return row;
  }

  private async requireObligation(context: CurrentBusinessContext, obligationId: string) {
    const row = await this.deps.obligations.findById(context.businessId, obligationId);
    if (!row || row.businessId !== context.businessId) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.CROSS_BUSINESS_ACCESS,
        undefined,
        403
      );
    }
    return row;
  }

  private async requireRefund(context: CurrentBusinessContext, refundId: string) {
    const row = await this.deps.refunds.findById(context.businessId, refundId);
    if (!row || row.businessId !== context.businessId) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.CROSS_BUSINESS_ACCESS,
        undefined,
        403
      );
    }
    return row;
  }

  private assertSameTenant(
    context: CurrentBusinessContext,
    transaction: PaymentTransactionRecord,
    obligation: { businessId: string }
  ) {
    if (
      transaction.businessId !== context.businessId ||
      obligation.businessId !== context.businessId
    ) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.CROSS_BUSINESS_ACCESS,
        undefined,
        403
      );
    }
  }

  private assertContext(context: CurrentBusinessContext) {
    if (!context?.businessId?.trim()) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.BUSINESS_CONTEXT_REQUIRED,
        undefined,
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
      refundId?: string | null;
      outcome: "SUCCESS" | "FAILURE";
      references?: Record<string, unknown>;
    }
  ) {
    try {
      await this.deps.audit.record({
        businessId: context.businessId,
        actorUserId: context.platformUserId,
        obligationId: entry.obligationId,
        paymentTransactionId: entry.paymentTransactionId,
        refundId: entry.refundId,
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

export function createDefaultPaymentRefundDependencies(): PaymentRefundServiceDependencies {
  const audit = createPaymentAuditAdapter();
  const catalogues = createPaymentCatalogueRepository();
  const allocations = createPaymentAllocationRepository();
  const transactions = createPaymentTransactionRepository();
  const obligations = createPaymentObligationRepository();
  const idempotency = createPaymentIdempotencyRepository();
  const allocationEffects = new PaymentAllocationService({
    obligations,
    transactions,
    allocations,
    idempotency,
    policy: {
      async getPolicy() {
        return { allowOverpayment: false };
      },
    },
    locks: createInProcessPaymentLock(),
    audit,
  });
  return {
    transactions,
    obligations,
    allocations,
    receipts: createPaymentReceiptRepository(),
    invoices: createPaymentInvoiceRepository(),
    refunds: createPaymentRefundRepository(),
    catalogues,
    numbering: new ConfigurableDocumentNumberingService(
      createDocumentNumberingPolicyRepository()
    ),
    receipting: createInProcessReceiptingAdapter(),
    documents: createInProcessDocumentAdapter(),
    engine: createCatalogueCapabilityPaymentEngine(
      createPaymentCapabilityStoreAdapter(catalogues),
      createInProcessPaymentInitiationAdapter()
    ),
    workflow: createInProcessWorkflowAdapter(),
    instructions: createNoopFinancialInstructionAdapter(),
    allocationEffects,
    idempotency,
    locks: createInProcessPaymentLock(),
    audit,
  };
}

export function createPaymentRefundService(deps?: PaymentRefundServiceDependencies) {
  return new PaymentRefundService(deps ?? createDefaultPaymentRefundDependencies());
}
