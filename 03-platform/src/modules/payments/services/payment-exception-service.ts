/**
 * Purpose:
 * BP-007 IP-08 operational exception layer. Payment status remains
 * authoritative. Provider queries go through ENG-006. Approval is ENG-005.
 *
 * Implementation Package:
 * BP-007 / IP-08 – Payment Exceptions, Operations & Controls
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  DOCUMENT_NUMBERING_DOCUMENT_TYPES,
  DOCUMENT_NUMBERING_ERROR_CODES,
  DocumentNumberingError,
  type DocumentNumberingPort,
} from "@/core/localization-regulatory/document-numbering";
import { createDocumentNumberingPolicyRepository } from "@/core/localization-regulatory/repositories/document-numbering-policy-repository";
import { ConfigurableDocumentNumberingService } from "@/core/localization-regulatory/services/document-numbering-service";
import {
  createCatalogueCapabilityPaymentEngine,
  createInProcessPaymentInitiationAdapter,
  type PaymentEnginePort,
} from "@/core/payment-engine";
import {
  WORKFLOW_ENGINE_ERROR_CODES,
  WorkflowEngineError,
  createInProcessWorkflowAdapter,
  type WorkflowEnginePort,
} from "@/core/workflow-engine";
import { createPaymentExceptionPolicyAdapter } from "@/modules/payments/adapters/payment-exception-policy-adapter";
import {
  PAYMENT_AUDIT_ACTIONS,
  PAYMENT_EXCEPTION_RESOLUTION_CODES,
  PAYMENT_EXCEPTION_STATUSES,
  PAYMENT_EXCEPTION_STATUS_LABELS,
  PAYMENT_EXCEPTION_TYPE_LABELS,
  PAYMENT_EXCEPTION_TYPES,
  PAYMENT_IDEMPOTENCY_OPERATIONS,
  PAYMENT_STATUS_CODES,
  PAYMENT_STATUS_LABELS,
  SETTLEMENT_STATUS_LABELS,
} from "@/modules/payments/constants";
import {
  PAYMENT_ERROR_CODES,
  PAYMENT_USER_MESSAGES,
  PaymentObligationError,
} from "@/modules/payments/errors";
import type {
  PaymentAuditPort,
  PaymentCatalogueRepositoryPort,
  PaymentExceptionPolicyPort,
  PaymentExceptionRepositoryPort,
  PaymentExceptionTrackerPort,
  PaymentIdempotencyRepositoryPort,
  PaymentLockPort,
  PaymentObligationRepositoryPort,
  PaymentSettlementRepositoryPort,
  PaymentTransactionRepositoryPort,
} from "@/modules/payments/ports";
import { createPaymentCapabilityStoreAdapter, createPaymentCatalogueRepository } from "@/modules/payments/repositories/payment-catalogue-repository";
import { createPaymentExceptionRepository } from "@/modules/payments/repositories/payment-exception-repository";
import { createPaymentIdempotencyRepository } from "@/modules/payments/repositories/payment-idempotency-repository";
import { createPaymentObligationRepository } from "@/modules/payments/repositories/payment-obligation-repository";
import { createPaymentSettlementRepository } from "@/modules/payments/repositories/payment-settlement-repository";
import { createPaymentTransactionRepository } from "@/modules/payments/repositories/payment-transaction-repository";
import { createInProcessPaymentLock } from "@/modules/payments/services/payment-lock";
import { createPaymentAuditAdapter } from "@/modules/payments/services/payment-obligation-audit-helper";
import {
  assertExceptionTransition,
  isOpenExceptionStatus,
  isPendingOperational,
  isUnknownPayment,
  mismatchExceptionType,
  paymentOutcomeForResolution,
  reasonForType,
  retryBlockedReason,
  sensitiveResolution,
  severityForType,
} from "@/modules/payments/services/payment-exception-rules";
import type {
  ApprovePaymentExceptionCommand,
  InitiatePaymentCommand,
  PaymentExceptionDetailView,
  PaymentExceptionDashboardView,
  PaymentExceptionListFilter,
  PaymentExceptionRecord,
  PaymentExceptionView,
  PaymentInitiationResult,
  RaisePaymentExceptionCommand,
  ResolvePaymentExceptionCommand,
  RetryEligibilityView,
} from "@/modules/payments/types";

export type PaymentOutcomeApplicationPort = {
  applyProviderOutcome(
    context: CurrentBusinessContext,
    command: {
      paymentTransactionId?: string | null;
      providerTransactionReference?: string | null;
      outcome: {
        outcome: string;
        providerTransactionReference?: string | null;
        amount?: string | null;
        currency?: string | null;
        obligationId?: string | null;
        failureCode?: string | null;
        failureReason?: string | null;
      };
    }
  ): Promise<PaymentInitiationResult>;
  initiatePayment(
    context: CurrentBusinessContext,
    command: InitiatePaymentCommand
  ): Promise<PaymentInitiationResult>;
  refreshPaymentStatus?(
    context: CurrentBusinessContext,
    transactionId: string
  ): Promise<PaymentInitiationResult>;
};

export type PaymentExceptionServiceDependencies = {
  transactions: PaymentTransactionRepositoryPort;
  obligations: PaymentObligationRepositoryPort;
  exceptions: PaymentExceptionRepositoryPort;
  settlements?: PaymentSettlementRepositoryPort;
  engine: PaymentEnginePort;
  workflow: WorkflowEnginePort;
  numbering: DocumentNumberingPort;
  policy: PaymentExceptionPolicyPort;
  outcomes?: PaymentOutcomeApplicationPort;
  catalogues?: PaymentCatalogueRepositoryPort;
  idempotency: PaymentIdempotencyRepositoryPort;
  locks: PaymentLockPort;
  audit: PaymentAuditPort;
  clock?: { now(): Date };
};

export class PaymentExceptionService implements PaymentExceptionTrackerPort {
  constructor(private readonly deps: PaymentExceptionServiceDependencies) {}

  async trackFromPaymentOutcome(
    context: CurrentBusinessContext,
    paymentTransactionId: string
  ): Promise<void> {
    const transaction = await this.requireTransaction(context, paymentTransactionId);
    if (isUnknownPayment(transaction)) {
      await this.ensureException(context, {
        paymentTransactionId: transaction.id,
        exceptionType: PAYMENT_EXCEPTION_TYPES.PAYMENT_UNKNOWN,
        reason: reasonForType(PAYMENT_EXCEPTION_TYPES.PAYMENT_UNKNOWN),
      });
      return;
    }
    const mismatchType = mismatchExceptionType(transaction);
    if (mismatchType) {
      await this.ensureException(context, {
        paymentTransactionId: transaction.id,
        exceptionType: mismatchType,
        reason: reasonForType(mismatchType),
      });
    }
  }

  async trackDuplicateProviderReference(
    context: CurrentBusinessContext,
    paymentTransactionId: string
  ): Promise<void> {
    await this.ensureException(context, {
      paymentTransactionId,
      exceptionType: PAYMENT_EXCEPTION_TYPES.DUPLICATE_PROVIDER_REFERENCE,
      reason: reasonForType(PAYMENT_EXCEPTION_TYPES.DUPLICATE_PROVIDER_REFERENCE),
    });
  }

  async evaluatePending(
    context: CurrentBusinessContext,
    paymentTransactionId: string
  ): Promise<PaymentExceptionView | null> {
    this.assertTenant(context);
    const transaction = await this.requireTransaction(context, paymentTransactionId);
    if (!isPendingOperational(transaction) || transaction.captureMode === "MANUAL") {
      return null;
    }
    const policy = await this.deps.policy.getPolicy(context.businessId);
    const started = transaction.initiatedAt ?? transaction.createdAt;
    const elapsed = this.now().getTime() - started.getTime();
    if (elapsed < policy.pendingTimeoutMs) {
      return null;
    }
    const created = await this.ensureException(context, {
      paymentTransactionId: transaction.id,
      exceptionType: PAYMENT_EXCEPTION_TYPES.PAYMENT_TIMEOUT,
      reason: reasonForType(PAYMENT_EXCEPTION_TYPES.PAYMENT_TIMEOUT),
    });
    return this.toView(context, created);
  }

  async surfaceSettlementException(
    context: CurrentBusinessContext,
    paymentTransactionId: string
  ): Promise<PaymentExceptionView | null> {
    this.assertTenant(context);
    if (!this.deps.settlements) {
      return null;
    }
    const settlement = await this.deps.settlements.findByTransaction(
      context.businessId,
      paymentTransactionId
    );
    if (!settlement?.exceptionFlag) {
      return null;
    }
    const created = await this.ensureException(context, {
      paymentTransactionId,
      exceptionType: PAYMENT_EXCEPTION_TYPES.SETTLEMENT_VARIANCE,
      reason: reasonForType(PAYMENT_EXCEPTION_TYPES.SETTLEMENT_VARIANCE),
    });
    return this.toView(context, created);
  }

  async assertInitiationAllowed(
    context: CurrentBusinessContext,
    obligationId: string
  ): Promise<void> {
    const rows = await this.deps.transactions.listByObligation(
      context.businessId,
      obligationId
    );
    if (rows.some((row) => isUnknownPayment(row))) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.PAYMENT_UNKNOWN,
        PAYMENT_USER_MESSAGES.PAYMENT_UNKNOWN,
        409
      );
    }
  }

  async startInvestigation(
    context: CurrentBusinessContext,
    exceptionId: string
  ): Promise<PaymentExceptionDetailView> {
    this.assertTenant(context);
    const exception = await this.requireException(context, exceptionId);
    assertExceptionTransition(exception.status, PAYMENT_EXCEPTION_STATUSES.INVESTIGATING);
    const updated = await this.deps.exceptions.update(context.businessId, exception.id, {
      status: PAYMENT_EXCEPTION_STATUSES.INVESTIGATING,
      assignedTo: context.platformUserId,
      updatedBy: context.platformUserId,
    });
    await this.audit(context, updated, PAYMENT_AUDIT_ACTIONS.PAYMENT_EXCEPTION_INVESTIGATION_STARTED);
    return this.toDetail(context, updated);
  }

  async queryProvider(
    context: CurrentBusinessContext,
    paymentTransactionId: string
  ): Promise<PaymentExceptionDetailView | null> {
    this.assertTenant(context);
    const transaction = await this.requireTransaction(context, paymentTransactionId);
    const open = await this.deps.exceptions.listByTransaction(
      context.businessId,
      paymentTransactionId
    );
    const current =
      open.find((row) => isOpenExceptionStatus(row.status)) ?? open[0] ?? null;
    if (current) {
      await this.audit(context, current, PAYMENT_AUDIT_ACTIONS.PAYMENT_EXCEPTION_QUERY_REQUESTED);
    }
    if (this.deps.outcomes?.refreshPaymentStatus) {
      const refreshed = await this.deps.outcomes.refreshPaymentStatus(
        context,
        paymentTransactionId
      );
      const resolvedStatus = refreshed.transaction.status;
      if (
        current &&
        (resolvedStatus === PAYMENT_STATUS_CODES.SUCCESSFUL ||
          resolvedStatus === PAYMENT_STATUS_CODES.FAILED ||
          resolvedStatus === PAYMENT_STATUS_CODES.EXPIRED)
      ) {
        const resolved = await this.deps.exceptions.update(context.businessId, current.id, {
          status: PAYMENT_EXCEPTION_STATUSES.RESOLVED,
          resolutionCode:
            resolvedStatus === PAYMENT_STATUS_CODES.SUCCESSFUL
              ? PAYMENT_EXCEPTION_RESOLUTION_CODES.CONFIRMED_SUCCESS
              : resolvedStatus === PAYMENT_STATUS_CODES.EXPIRED
                ? PAYMENT_EXCEPTION_RESOLUTION_CODES.EXPIRED
                : PAYMENT_EXCEPTION_RESOLUTION_CODES.CONFIRMED_FAILURE,
          resolvedBy: context.platformUserId,
          updatedBy: context.platformUserId,
        });
        await this.audit(context, resolved, PAYMENT_AUDIT_ACTIONS.PAYMENT_EXCEPTION_RESOLVED);
        return this.toDetail(context, resolved);
      }
      return current ? this.toDetail(context, current) : null;
    }
    if (!transaction.providerId || !transaction.providerTransactionReference) {
      return current ? this.toDetail(context, current) : null;
    }
    const outcome = await this.deps.engine.queryPayment({
      businessId: context.businessId,
      providerId: transaction.providerId,
      providerTransactionReference: transaction.providerTransactionReference,
      paymentTransactionId: transaction.id,
    });
    if (this.deps.outcomes && outcome.outcome !== "UNKNOWN" && outcome.outcome !== "PENDING") {
      await this.deps.outcomes.applyProviderOutcome(context, {
        paymentTransactionId: transaction.id,
        outcome: {
          outcome: outcome.outcome,
          providerTransactionReference: outcome.providerTransactionReference,
          amount: outcome.amount,
          currency: outcome.currency,
          obligationId: outcome.obligationId,
          failureCode: outcome.failureCode,
          failureReason: outcome.failureReason,
        },
      });
      if (
        current &&
        (outcome.outcome === "SUCCESSFUL" ||
          outcome.outcome === "FAILED" ||
          outcome.outcome === "EXPIRED")
      ) {
        const resolved = await this.deps.exceptions.update(context.businessId, current.id, {
          status: PAYMENT_EXCEPTION_STATUSES.RESOLVED,
          resolutionCode:
            outcome.outcome === "SUCCESSFUL"
              ? PAYMENT_EXCEPTION_RESOLUTION_CODES.CONFIRMED_SUCCESS
              : outcome.outcome === "EXPIRED"
                ? PAYMENT_EXCEPTION_RESOLUTION_CODES.EXPIRED
                : PAYMENT_EXCEPTION_RESOLUTION_CODES.CONFIRMED_FAILURE,
          resolvedBy: context.platformUserId,
          updatedBy: context.platformUserId,
        });
        await this.audit(context, resolved, PAYMENT_AUDIT_ACTIONS.PAYMENT_EXCEPTION_RESOLVED);
        return this.toDetail(context, resolved);
      }
    }
    return current ? this.toDetail(context, current) : null;
  }

  async canRetry(
    context: CurrentBusinessContext,
    paymentTransactionId: string
  ): Promise<RetryEligibilityView> {
    this.assertTenant(context);
    const transaction = await this.requireTransaction(context, paymentTransactionId);
    const open = await this.deps.exceptions.listByTransaction(
      context.businessId,
      paymentTransactionId
    );
    const blocked = retryBlockedReason(transaction, open);
    if (blocked) {
      return { paymentTransactionId, allowed: false, reason: blocked };
    }
    if (!transaction.providerId || !transaction.providerTransactionReference) {
      return {
        paymentTransactionId,
        allowed: false,
        reason: PAYMENT_USER_MESSAGES.EXCEPTION_RETRY_NOT_ALLOWED,
      };
    }
    const outcome = await this.deps.engine.queryPayment({
      businessId: context.businessId,
      providerId: transaction.providerId,
      providerTransactionReference: transaction.providerTransactionReference,
      paymentTransactionId: transaction.id,
    });
    if (outcome.outcome !== "NOT_ACCEPTED") {
      return {
        paymentTransactionId,
        allowed: false,
        reason: PAYMENT_USER_MESSAGES.EXCEPTION_RETRY_NOT_ALLOWED,
      };
    }
    return {
      paymentTransactionId,
      allowed: true,
      reason: "The original request was not accepted.",
    };
  }

  async retryPayment(
    context: CurrentBusinessContext,
    paymentTransactionId: string,
    idempotencyKey?: string | null
  ): Promise<PaymentInitiationResult> {
    this.assertTenant(context);
    const eligibility = await this.canRetry(context, paymentTransactionId);
    if (!eligibility.allowed) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.EXCEPTION_RETRY_NOT_ALLOWED,
        eligibility.reason,
        409
      );
    }
    if (!this.deps.outcomes) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.EXCEPTION_RETRY_NOT_ALLOWED,
        undefined,
        409
      );
    }
    const transaction = await this.requireTransaction(context, paymentTransactionId);
    const methodId = transaction.methodId?.trim();
    if (!methodId) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.EXCEPTION_RETRY_NOT_ALLOWED,
        undefined,
        409
      );
    }
    const key = (
      idempotencyKey?.trim() ||
      `${PAYMENT_IDEMPOTENCY_OPERATIONS.RETRY_PAYMENT}:${transaction.id}:${crypto.randomUUID()}`
    ).slice(0, 180);
    const result = await this.deps.locks.runExclusive(
      `exception-retry:${context.businessId}:${transaction.id}`,
      () =>
        this.deps.outcomes!.initiatePayment(context, {
          obligationId: transaction.obligationId,
          methodId,
          amount: transaction.amount,
          currency: transaction.currencyCode,
          idempotencyKey: key,
        })
    );
    const open = await this.deps.exceptions.listByTransaction(
      context.businessId,
      paymentTransactionId
    );
    const current = open.find((row) => isOpenExceptionStatus(row.status));
    if (current) {
      await this.deps.exceptions.update(context.businessId, current.id, {
        retryOfTransactionId: result.transaction.id,
        updatedBy: context.platformUserId,
        metadata: {
          ...(current.metadata ?? {}),
          retryReason: "Provider confirmed the original request was not accepted.",
        },
      });
      await this.audit(context, current, PAYMENT_AUDIT_ACTIONS.PAYMENT_EXCEPTION_RETRY_REQUESTED);
      await this.audit(context, current, PAYMENT_AUDIT_ACTIONS.PAYMENT_EXCEPTION_RETRY_APPROVED);
    } else {
      await this.deps.audit.record({
        businessId: context.businessId,
        actorUserId: context.platformUserId,
        obligationId: transaction.obligationId,
        paymentTransactionId: transaction.id,
        exceptionId: null,
        operation: "UPDATE",
        action: PAYMENT_AUDIT_ACTIONS.PAYMENT_EXCEPTION_RETRY_REQUESTED,
        outcome: "SUCCESS",
        references: { reason: "Provider confirmed the original request was not accepted." },
      });
      await this.deps.audit.record({
        businessId: context.businessId,
        actorUserId: context.platformUserId,
        obligationId: transaction.obligationId,
        paymentTransactionId: transaction.id,
        exceptionId: null,
        operation: "UPDATE",
        action: PAYMENT_AUDIT_ACTIONS.PAYMENT_EXCEPTION_RETRY_APPROVED,
        outcome: "SUCCESS",
        references: { retryTransactionId: result.transaction.id },
      });
    }
    return result;
  }

  async resolve(
    context: CurrentBusinessContext,
    command: ResolvePaymentExceptionCommand
  ): Promise<PaymentExceptionDetailView> {
    this.assertTenant(context);
    const exception = await this.requireException(context, command.exceptionId);
    const code = command.resolutionCode?.trim();
    if (!code) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.INVALID_INPUT,
        PAYMENT_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }
    if (code === "MARK_PAID" || code === "PAID") {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.EXCEPTION_RESOLUTION_NOT_ALLOWED,
        undefined,
        409
      );
    }
    const policy = await this.deps.policy.getPolicy(context.businessId);
    const decision = await this.deps.workflow.evaluateExceptionResolution({
      businessId: context.businessId,
      resolutionCode: code,
    });
    if ((policy.requiresApproval || decision.required) && sensitiveResolution(code)) {
      const investigating =
        exception.status === PAYMENT_EXCEPTION_STATUSES.INVESTIGATING
          ? exception
          : await this.deps.exceptions.update(context.businessId, exception.id, {
              status: PAYMENT_EXCEPTION_STATUSES.INVESTIGATING,
              updatedBy: context.platformUserId,
            });
      if (investigating.status !== PAYMENT_EXCEPTION_STATUSES.INVESTIGATING) {
        assertExceptionTransition(exception.status, PAYMENT_EXCEPTION_STATUSES.INVESTIGATING);
      }
      const updated = await this.deps.exceptions.update(context.businessId, investigating.id, {
        approvalStatus: "PENDING",
        requestedBy: context.platformUserId,
        proposedResolutionCode: code,
        proposedResolutionNotes: command.notes?.trim() || null,
        updatedBy: context.platformUserId,
      });
      await this.audit(context, updated, PAYMENT_AUDIT_ACTIONS.PAYMENT_EXCEPTION_INVESTIGATION_STARTED);
      return this.toDetail(context, updated);
    }
    return this.applyResolution(context, exception.id, {
      code,
      notes: command.notes,
      evidence: command.evidence,
      actorId: context.platformUserId,
    });
  }

  async approve(
    context: CurrentBusinessContext,
    command: ApprovePaymentExceptionCommand
  ): Promise<PaymentExceptionDetailView> {
    this.assertTenant(context);
    const exception = await this.requireException(context, command.exceptionId);
    try {
      this.deps.workflow.assertDistinctActors(
        exception.requestedBy ?? exception.createdBy ?? "",
        context.platformUserId
      );
    } catch (error) {
      if (
        error instanceof WorkflowEngineError &&
        error.code === WORKFLOW_ENGINE_ERROR_CODES.SELF_APPROVAL
      ) {
        throw new PaymentObligationError(
          PAYMENT_ERROR_CODES.EXCEPTION_SELF_APPROVAL,
          undefined,
          409
        );
      }
      throw error;
    }
    if (command.decision === "REJECT") {
      assertExceptionTransition(exception.status, PAYMENT_EXCEPTION_STATUSES.REJECTED);
      const rejected = await this.deps.exceptions.update(context.businessId, exception.id, {
        status: PAYMENT_EXCEPTION_STATUSES.REJECTED,
        approvalStatus: "REJECTED",
        approvedBy: context.platformUserId,
        resolutionNotes: command.notes?.trim() || exception.proposedResolutionNotes,
        updatedBy: context.platformUserId,
      });
      await this.audit(context, rejected, PAYMENT_AUDIT_ACTIONS.PAYMENT_EXCEPTION_REJECTED);
      return this.toDetail(context, rejected);
    }
    const code = exception.proposedResolutionCode;
    if (!code) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.EXCEPTION_RESOLUTION_NOT_ALLOWED,
        undefined,
        409
      );
    }
    return this.applyResolution(context, exception.id, {
      code,
      notes: command.notes ?? exception.proposedResolutionNotes,
      evidence: exception.resolutionEvidence,
      actorId: context.platformUserId,
      approvedBy: context.platformUserId,
    });
  }

  async listDashboard(
    context: CurrentBusinessContext,
    filter?: PaymentExceptionListFilter
  ): Promise<PaymentExceptionDashboardView> {
    this.assertTenant(context);
    const rows = await this.deps.exceptions.listByBusiness(context.businessId, filter);
    const views: PaymentExceptionView[] = [];
    for (const row of rows) {
      views.push(await this.toView(context, row));
    }
    const filtered = views.filter((row) => {
      if (filter?.status && row.status !== filter.status) {
        return false;
      }
      if (filter?.exceptionType && row.exceptionType !== filter.exceptionType) {
        return false;
      }
      if (filter?.severity && row.severity !== filter.severity) {
        return false;
      }
      if (filter?.methodId && row.methodId !== filter.methodId) {
        return false;
      }
      if (filter?.networkId && row.networkId !== filter.networkId) {
        return false;
      }
      if (filter?.providerId && row.providerId !== filter.providerId) {
        return false;
      }
      if (filter?.channelId && row.channelId !== filter.channelId) {
        return false;
      }
      if (filter?.transactionNumber && row.transactionNumber !== filter.transactionNumber) {
        return false;
      }
      if (filter?.obligationNumber && row.obligationNumber !== filter.obligationNumber) {
        return false;
      }
      if (filter?.detectedFrom && row.detectedAt < filter.detectedFrom) {
        return false;
      }
      if (filter?.detectedTo && row.detectedAt > filter.detectedTo) {
        return false;
      }
      return true;
    });
    const snapshot = this.deps.catalogues
      ? await this.deps.catalogues.loadSnapshot()
      : { methods: [], networks: [], providers: [], channels: [] };
    return {
      openCount: filtered.filter((row) => row.status === PAYMENT_EXCEPTION_STATUSES.OPEN).length,
      investigatingCount: filtered.filter(
        (row) => row.status === PAYMENT_EXCEPTION_STATUSES.INVESTIGATING
      ).length,
      resolvedCount: filtered.filter((row) => row.status === PAYMENT_EXCEPTION_STATUSES.RESOLVED)
        .length,
      highSeverityCount: filtered.filter((row) => row.severity === "HIGH").length,
      unknownCount: filtered.filter(
        (row) => row.exceptionType === PAYMENT_EXCEPTION_TYPES.PAYMENT_UNKNOWN
      ).length,
      mismatchCount: filtered.filter((row) =>
        row.exceptionType.startsWith("CALLBACK_")
      ).length,
      duplicateCount: filtered.filter(
        (row) => row.exceptionType === PAYMENT_EXCEPTION_TYPES.DUPLICATE_PROVIDER_REFERENCE
      ).length,
      settlementCount: filtered.filter(
        (row) => row.exceptionType === PAYMENT_EXCEPTION_TYPES.SETTLEMENT_VARIANCE
      ).length,
      items: filtered,
      catalogues: {
        methods: snapshot.methods.map((row) => ({
          id: row.id,
          name: row.customerLabel || row.name,
        })),
        networks: snapshot.networks.map((row) => ({
          id: row.id,
          name: row.customerLabel || row.name,
        })),
        providers: snapshot.providers.map((row) => ({
          id: row.id,
          name: row.name,
        })),
        channels: snapshot.channels.map((row) => ({
          id: row.id,
          name: row.customerLabel || row.name,
        })),
      },
    };
  }

  async getException(
    context: CurrentBusinessContext,
    exceptionId: string
  ): Promise<PaymentExceptionDetailView> {
    this.assertTenant(context);
    return this.toDetail(context, await this.requireException(context, exceptionId));
  }

  async listForTransaction(
    context: CurrentBusinessContext,
    paymentTransactionId: string
  ): Promise<PaymentExceptionView[]> {
    this.assertTenant(context);
    await this.requireTransaction(context, paymentTransactionId);
    const rows = await this.deps.exceptions.listByTransaction(
      context.businessId,
      paymentTransactionId
    );
    const views: PaymentExceptionView[] = [];
    for (const row of rows) {
      views.push(await this.toView(context, row));
    }
    return views;
  }

  async closeException(
    context: CurrentBusinessContext,
    exceptionId: string
  ): Promise<PaymentExceptionDetailView> {
    this.assertTenant(context);
    const exception = await this.requireException(context, exceptionId);
    assertExceptionTransition(exception.status, PAYMENT_EXCEPTION_STATUSES.CLOSED);
    const updated = await this.deps.exceptions.update(context.businessId, exception.id, {
      status: PAYMENT_EXCEPTION_STATUSES.CLOSED,
      updatedBy: context.platformUserId,
    });
    await this.audit(context, updated, PAYMENT_AUDIT_ACTIONS.PAYMENT_EXCEPTION_CLOSED);
    return this.toDetail(context, updated);
  }

  private async applyResolution(
    context: CurrentBusinessContext,
    exceptionId: string,
    input: {
      code: string;
      notes?: string | null;
      evidence?: string | null;
      actorId: string;
      approvedBy?: string | null;
    }
  ): Promise<PaymentExceptionDetailView> {
    const exception = await this.requireException(context, exceptionId);
    const nextStatus = PAYMENT_EXCEPTION_STATUSES.RESOLVED;
    assertExceptionTransition(
      exception.status === PAYMENT_EXCEPTION_STATUSES.OPEN
        ? PAYMENT_EXCEPTION_STATUSES.OPEN
        : exception.status,
      nextStatus
    );
    const paymentOutcome = paymentOutcomeForResolution(input.code);
    if (paymentOutcome && this.deps.outcomes) {
      const transaction = await this.requireTransaction(
        context,
        exception.paymentTransactionId
      );
      await this.deps.locks.runExclusive(
        `exception-resolve:${context.businessId}:${transaction.id}`,
        () =>
          this.deps.outcomes!.applyProviderOutcome(context, {
            paymentTransactionId: transaction.id,
            outcome: {
              outcome: paymentOutcome,
              providerTransactionReference: transaction.providerTransactionReference,
              amount: transaction.amount,
              currency: transaction.currencyCode,
              obligationId: transaction.obligationId,
            },
          })
      );
    }
    const updated = await this.deps.exceptions.update(context.businessId, exception.id, {
      status: nextStatus,
      resolutionCode: input.code,
      resolutionNotes: input.notes?.trim() || null,
      resolutionEvidence: input.evidence?.trim() || null,
      resolvedBy: input.actorId,
      approvedBy: input.approvedBy ?? exception.approvedBy,
      approvalStatus: input.approvedBy ? "APPROVED" : exception.approvalStatus,
      updatedBy: context.platformUserId,
    });
    await this.audit(context, updated, PAYMENT_AUDIT_ACTIONS.PAYMENT_EXCEPTION_RESOLVED);
    return this.toDetail(context, updated);
  }

  private async ensureException(
    context: CurrentBusinessContext,
    command: RaisePaymentExceptionCommand
  ): Promise<PaymentExceptionRecord> {
    const transaction = await this.requireTransaction(context, command.paymentTransactionId);
    const existing = await this.deps.exceptions.findOpenByTransactionAndType(
      context.businessId,
      transaction.id,
      command.exceptionType
    );
    if (existing) {
      return existing;
    }
    const idempotencyKey = (
      command.idempotencyKey?.trim() ||
      `${PAYMENT_IDEMPOTENCY_OPERATIONS.RAISE_EXCEPTION}:${transaction.id}:${command.exceptionType}`
    ).slice(0, 180);
    const replay = await this.deps.exceptions.findByIdempotencyKey(
      context.businessId,
      idempotencyKey
    );
    if (replay) {
      return replay;
    }
    let allocated;
    try {
      allocated = await this.deps.numbering.allocate({
        businessId: context.businessId,
        documentType: DOCUMENT_NUMBERING_DOCUMENT_TYPES.PAYMENT_EXCEPTION,
      });
    } catch (error) {
      if (
        error instanceof DocumentNumberingError &&
        error.code === DOCUMENT_NUMBERING_ERROR_CODES.POLICY_MISSING
      ) {
        throw new PaymentObligationError(PAYMENT_ERROR_CODES.PROVIDER_ERROR, undefined, 409);
      }
      throw error;
    }
    const created = await this.deps.exceptions.insert({
      businessId: context.businessId,
      exceptionNumber: allocated.number,
      numberingPolicyId: allocated.policyId,
      paymentTransactionId: transaction.id,
      paymentObligationId: transaction.obligationId,
      exceptionType: command.exceptionType,
      severity: command.severity ?? severityForType(command.exceptionType),
      status: PAYMENT_EXCEPTION_STATUSES.OPEN,
      reason: command.reason,
      detectedAt: this.now(),
      detectedBy: context.platformUserId,
      assignedTo: null,
      resolvedBy: null,
      resolutionCode: null,
      resolutionNotes: null,
      resolutionEvidence: null,
      approvalStatus: null,
      requestedBy: null,
      approvedBy: null,
      proposedResolutionCode: null,
      proposedResolutionNotes: null,
      retryOfTransactionId: null,
      idempotencyKey,
      metadata: null,
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });
    await this.audit(context, created, PAYMENT_AUDIT_ACTIONS.PAYMENT_EXCEPTION_CREATED);
    await this.audit(context, created, PAYMENT_AUDIT_ACTIONS.PAYMENT_EXCEPTION_OPENED);
    return created;
  }

  private now() {
    return this.deps.clock?.now() ?? new Date();
  }

  private assertTenant(context: CurrentBusinessContext) {
    if (!context.businessId?.trim()) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.BUSINESS_CONTEXT_REQUIRED,
        PAYMENT_USER_MESSAGES.BUSINESS_CONTEXT_REQUIRED,
        403
      );
    }
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

  private async requireException(context: CurrentBusinessContext, exceptionId: string) {
    const row = await this.deps.exceptions.findById(context.businessId, exceptionId);
    if (!row || row.businessId !== context.businessId) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.CROSS_BUSINESS_ACCESS,
        undefined,
        403
      );
    }
    return row;
  }

  private async toView(
    context: CurrentBusinessContext,
    row: PaymentExceptionRecord
  ): Promise<PaymentExceptionView> {
    const transaction = await this.deps.transactions.findById(
      context.businessId,
      row.paymentTransactionId
    );
    const obligation = await this.deps.obligations.findById(
      context.businessId,
      row.paymentObligationId
    );
    const settlement = this.deps.settlements
      ? await this.deps.settlements.findByTransaction(
          context.businessId,
          row.paymentTransactionId
        )
      : null;
    return {
      id: row.id,
      exceptionNumber: row.exceptionNumber,
      businessId: row.businessId,
      paymentTransactionId: row.paymentTransactionId,
      transactionNumber: transaction?.transactionNumber ?? "",
      obligationId: row.paymentObligationId,
      obligationNumber: obligation?.obligationNumber ?? "",
      exceptionType: row.exceptionType,
      exceptionTypeLabel: PAYMENT_EXCEPTION_TYPE_LABELS[row.exceptionType] ?? row.exceptionType,
      severity: row.severity,
      status: row.status,
      statusLabel: PAYMENT_EXCEPTION_STATUS_LABELS[row.status] ?? row.status,
      reason: row.reason,
      paymentStatus: transaction?.status ?? "",
      paymentStatusLabel: PAYMENT_STATUS_LABELS[transaction?.status ?? ""] ?? transaction?.status ?? "",
      settlementStatus: settlement
        ? SETTLEMENT_STATUS_LABELS[settlement.settlementStatus] ?? settlement.settlementStatus
        : null,
      methodName: transaction?.methodName ?? null,
      networkName: transaction?.networkName ?? null,
      providerName: transaction?.providerName ?? null,
      channelName: transaction?.channelName ?? null,
      methodId: transaction?.methodId ?? null,
      networkId: transaction?.networkId ?? null,
      providerId: transaction?.providerId ?? null,
      channelId: transaction?.channelId ?? null,
      providerTransactionReference: transaction?.providerTransactionReference ?? null,
      amount: transaction?.amount ?? "",
      currencyCode: transaction?.currencyCode ?? "",
      resolutionCode: row.resolutionCode,
      approvalStatus: row.approvalStatus,
      detectedAt: row.detectedAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async toDetail(
    context: CurrentBusinessContext,
    row: PaymentExceptionRecord
  ): Promise<PaymentExceptionDetailView> {
    const view = await this.toView(context, row);
    const retry = await this.canRetry(context, row.paymentTransactionId).catch(() => ({
      paymentTransactionId: row.paymentTransactionId,
      allowed: false,
      reason: "",
    }));
    return {
      ...view,
      resolutionNotes: row.resolutionNotes,
      resolutionEvidence: row.resolutionEvidence,
      proposedResolutionCode: row.proposedResolutionCode,
      proposedResolutionNotes: row.proposedResolutionNotes,
      requestedBy: row.requestedBy,
      approvedBy: row.approvedBy,
      canRetry: retry.allowed,
      customerMessage:
        view.paymentStatus === PAYMENT_STATUS_CODES.UNKNOWN
          ? "Payment needs review"
          : view.statusLabel,
    };
  }

  private async audit(
    context: CurrentBusinessContext,
    exception: PaymentExceptionRecord,
    action: string
  ) {
    try {
      await this.deps.audit.record({
        businessId: context.businessId,
        actorUserId: context.platformUserId,
        obligationId: exception.paymentObligationId,
        paymentTransactionId: exception.paymentTransactionId,
        exceptionId: exception.id,
        operation: "UPDATE",
        action,
        outcome: "SUCCESS",
        references: {
          exceptionType: exception.exceptionType,
          status: exception.status,
          resolutionCode: exception.resolutionCode,
          reason: exception.reason,
        },
      });
    } catch {
      // Audit must not mask the original error.
    }
  }
}

export function createDefaultPaymentExceptionDependencies(): PaymentExceptionServiceDependencies {
  const catalogues = createPaymentCatalogueRepository();
  return {
    transactions: createPaymentTransactionRepository(),
    obligations: createPaymentObligationRepository(),
    exceptions: createPaymentExceptionRepository(),
    settlements: createPaymentSettlementRepository(),
    engine: createCatalogueCapabilityPaymentEngine(
      createPaymentCapabilityStoreAdapter(catalogues),
      createInProcessPaymentInitiationAdapter()
    ),
    workflow: createInProcessWorkflowAdapter(),
    numbering: new ConfigurableDocumentNumberingService(
      createDocumentNumberingPolicyRepository()
    ),
    policy: createPaymentExceptionPolicyAdapter(),
    catalogues,
    idempotency: createPaymentIdempotencyRepository(),
    locks: createInProcessPaymentLock(),
    audit: createPaymentAuditAdapter(),
  };
}

export function createPaymentExceptionService(
  deps?: PaymentExceptionServiceDependencies
) {
  return new PaymentExceptionService(
    deps ?? createDefaultPaymentExceptionDependencies()
  );
}
