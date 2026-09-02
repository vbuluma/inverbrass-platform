/**
 * Purpose:
 * BP-007 IP-02 orchestration — initiate a single payment against an
 * existing IP-01 obligation through ENG-006, or capture a configured
 * manual method. Does not split, invoice, receipt, refund, or settle.
 *
 * Implementation Package:
 * BP-007 / IP-02 – Payment Initiation & Processing
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  addPaymentAmounts,
  comparePaymentAmount,
  createCatalogueCapabilityPaymentEngine,
  createInProcessPaymentInitiationAdapter,
  isAmountWithinConfiguredLimits,
  isPositivePaymentAmount,
  parsePaymentAmount,
  type EligiblePaymentOption,
  type NormalizedPaymentOutcome,
  type PaymentEnginePort,
} from "@/core/payment-engine";
import { createPaymentAllocationPolicyAdapter } from "@/modules/payments/adapters/payment-allocation-policy-adapter";
import { createBusinessPaymentEnablementAdapter } from "@/modules/payments/adapters/business-payment-enablement-adapter";
import { createCurrencyCatalogueAdapter } from "@/modules/payments/adapters/currency-catalogue-adapter";
import {
  PAYMENT_AUDIT_ACTIONS,
  PAYMENT_CAPTURE_MODES,
  PAYMENT_IDEMPOTENCY_OPERATIONS,
  PAYMENT_STATUS_CODES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_TRANSACTION_NUMBER_PREFIX,
} from "@/modules/payments/constants";
import {
  PAYMENT_ERROR_CODES,
  PAYMENT_USER_MESSAGES,
  PaymentObligationError,
} from "@/modules/payments/errors";
import type {
  CurrencyReferencePort,
  PaymentAllocationPolicyPort,
  PaymentAuditPort,
  PaymentCatalogueRepositoryPort,
  PaymentEnablementPort,
  PaymentIdempotencyRepositoryPort,
  PaymentObligationRepositoryPort,
  PaymentReceiptIssuerPort,
  PaymentSettlementTrackerPort,
  PaymentExceptionTrackerPort,
  PaymentTransactionRepositoryPort,
} from "@/modules/payments/ports";
import {
  createPaymentCapabilityStoreAdapter,
  createPaymentCatalogueRepository,
} from "@/modules/payments/repositories/payment-catalogue-repository";
import { createPaymentAllocationRepository } from "@/modules/payments/repositories/payment-allocation-repository";
import { createPaymentIdempotencyRepository } from "@/modules/payments/repositories/payment-idempotency-repository";
import { createPaymentObligationRepository } from "@/modules/payments/repositories/payment-obligation-repository";
import { createPaymentTransactionRepository } from "@/modules/payments/repositories/payment-transaction-repository";
import { buildCatalogueCandidates } from "@/modules/payments/services/payment-catalogue-rules";
import {
  assertPaymentStatusTransition,
  isTerminalPaymentStatus,
  mapNormalizedOutcomeToStatus,
} from "@/modules/payments/services/payment-lifecycle-rules";
import {
  PaymentAllocationService,
  toTransactionView as toAllocatedTransactionView,
} from "@/modules/payments/services/payment-allocation-service";
import { createInProcessPaymentLock } from "@/modules/payments/services/payment-lock";
import { createPaymentAuditAdapter } from "@/modules/payments/services/payment-obligation-audit-helper";
import { createPaymentReceiptService } from "@/modules/payments/services/payment-receipt-service";
import { createPaymentSettlementService } from "@/modules/payments/services/payment-settlement-service";
import { createPaymentExceptionService } from "@/modules/payments/services/payment-exception-service";
import { isUnknownPayment } from "@/modules/payments/services/payment-exception-rules";
import type {
  ApplyPaymentOutcomeCommand,
  InitiatePaymentCommand,
  PaymentInitiationResult,
  PaymentObligationDetailView,
  PaymentObligationRecord,
  PaymentObligationView,
  PaymentTransactionRecord,
  PaymentTransactionView,
} from "@/modules/payments/types";

export type PaymentInitiationServiceDependencies = {
  obligations: PaymentObligationRepositoryPort;
  transactions: PaymentTransactionRepositoryPort;
  idempotency: PaymentIdempotencyRepositoryPort;
  catalogues: PaymentCatalogueRepositoryPort;
  engine: PaymentEnginePort;
  enablement: PaymentEnablementPort;
  currencies: CurrencyReferencePort;
  audit: PaymentAuditPort;
  allocations: PaymentAllocationService;
  policy: PaymentAllocationPolicyPort;
  receipts?: PaymentReceiptIssuerPort;
  settlements?: PaymentSettlementTrackerPort;
  exceptions?: PaymentExceptionTrackerPort;
};

function toObligationView(row: PaymentObligationRecord): PaymentObligationView {
  return {
    id: row.id,
    obligationNumber: row.obligationNumber,
    businessId: row.businessId,
    salesOrderId: row.salesOrderId,
    orderNumber: row.orderNumber,
    customerId: row.customerId,
    currencyCode: row.currencyCode,
    amountDue: row.amountDue,
    paidAmount: row.paidAmount,
    outstandingAmount: row.outstandingAmount,
    paymentStatus: row.paymentStatus,
    paymentStatusLabel: PAYMENT_STATUS_LABELS[row.paymentStatus] ?? row.paymentStatus,
    financialInstructionType: row.financialInstructionType,
    commercialContractId: row.commercialContractId,
    snapshotId: row.snapshotId,
    providerTransactionReference: row.providerTransactionReference,
    createdAt: row.createdAt.toISOString(),
  };
}

function toTransactionView(
  row: PaymentTransactionRecord,
  obligation: PaymentObligationRecord,
  allocatedAmount = "0"
): PaymentTransactionView {
  return toAllocatedTransactionView(row, obligation, allocatedAmount);
}

function isManualCaptureOption(option: EligiblePaymentOption): boolean {
  if (!option.requiresRail) {
    return true;
  }
  if (option.capabilities && option.capabilities.supportsInitiation === false) {
    return true;
  }
  return false;
}

export class PaymentInitiationService {
  constructor(private readonly deps: PaymentInitiationServiceDependencies) {}

  async getObligationDetail(
    context: CurrentBusinessContext,
    obligationId: string
  ): Promise<PaymentObligationDetailView> {
    this.assertContext(context);
    const obligation = await this.requireObligation(context, obligationId);
    const eligibleOptions = await this.listPayableOptions(context, obligation);
    const transactions = await this.deps.transactions.listByObligation(
      context.businessId,
      obligation.id
    );
    const allocationRows = await this.deps.allocations.listByObligation(context, obligation.id);
    const allocatedByTxn = new Map<string, string>();
    for (const row of allocationRows) {
      if (row.status !== "ALLOCATED") {
        continue;
      }
      const current = allocatedByTxn.get(row.paymentTransactionId) ?? "0";
      allocatedByTxn.set(
        row.paymentTransactionId,
        addPaymentAmounts(current, row.allocatedAmount)
      );
    }
    const recentTransactions = transactions.map((row) =>
      toTransactionView(row, obligation, allocatedByTxn.get(row.id) ?? "0")
    );
    const unallocatedTotal = recentTransactions.reduce(
      (sum, row) => addPaymentAmounts(sum, row.unallocatedAmount),
      "0"
    );
    return {
      ...toObligationView(obligation),
      eligibleOptions,
      recentTransactions,
      allocations: allocationRows.map((row) => ({
        id: row.id,
        allocationNumber: row.allocationNumber,
        paymentTransactionId: row.paymentTransactionId,
        transactionNumber:
          transactions.find((item) => item.id === row.paymentTransactionId)?.transactionNumber ??
          row.paymentTransactionId,
        obligationId: row.obligationId,
        allocatedAmount: row.allocatedAmount,
        currencyCode: row.currencyCode,
        status: row.status,
        statusLabel: row.status === "ALLOCATED" ? "Applied" : "Corrected",
        createdAt: row.createdAt.toISOString(),
      })),
      unallocatedTotal,
    };
  }

  async getTransaction(
    context: CurrentBusinessContext,
    transactionId: string
  ): Promise<PaymentTransactionView> {
    this.assertContext(context);
    const transaction = await this.deps.transactions.findById(
      context.businessId,
      transactionId
    );
    if (!transaction) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.TRANSACTION_NOT_FOUND,
        undefined,
        404
      );
    }
    const obligation = await this.requireObligation(context, transaction.obligationId);
    const allocationRows = await this.deps.allocations.listByObligation(context, obligation.id);
    const allocated = allocationRows
      .filter((row) => row.paymentTransactionId === transaction.id && row.status === "ALLOCATED")
      .reduce((sum, row) => addPaymentAmounts(sum, row.allocatedAmount), "0");
    return toTransactionView(transaction, obligation, allocated);
  }

  async initiatePayment(
    context: CurrentBusinessContext,
    command: InitiatePaymentCommand
  ): Promise<PaymentInitiationResult> {
    this.assertContext(context);
    const explicitKey = command.idempotencyKey?.trim();
    if (explicitKey) {
      const replay = await this.findExistingInitiation(context, explicitKey);
      if (replay) {
        return replay;
      }
    }
    const obligation = await this.requireEligibleObligation(context, command.obligationId);
    const amount = (command.amount?.trim() || obligation.outstandingAmount).trim();
    const currency = (command.currency?.trim() || obligation.currencyCode).trim().toUpperCase();
    const currencyKnown = await this.deps.currencies.isActiveCode(currency);
    if (!currencyKnown) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.PAYMENT_INVALID_CURRENCY,
        undefined,
        409,
        { field: "currency", entity: "payment" }
      );
    }
    const policy = await this.deps.policy.getPolicy(context.businessId);
    this.assertPayableAmount(amount, currency, obligation, policy.allowOverpayment);

    const existingUnknown = await this.deps.transactions.listByObligation(
      context.businessId,
      obligation.id
    );
    if (existingUnknown.some((row) => isUnknownPayment(row))) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.PAYMENT_UNKNOWN,
        PAYMENT_USER_MESSAGES.PAYMENT_UNKNOWN,
        409
      );
    }

    const methodId = command.methodId?.trim();
    if (!methodId) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.INVALID_INPUT,
        PAYMENT_USER_MESSAGES.INVALID_INPUT,
        400,
        { field: "methodId", entity: "payment" }
      );
    }

    const idempotencyKey = (
      command.idempotencyKey?.trim() ||
      `${PAYMENT_IDEMPOTENCY_OPERATIONS.INITIATE_PAYMENT}:${obligation.id}:${methodId}:${amount}:${currency}:${crypto.randomUUID()}`
    ).slice(0, 180);

    const existing = await this.deps.transactions.findByIdempotencyKey(
      context.businessId,
      idempotencyKey
    );
    if (existing) {
      return this.toResult(existing, obligation);
    }

    const option = await this.resolveOption(context, obligation, methodId, amount, currency);
    const manual = isManualCaptureOption(option);
    if (manual && command.confirmManual !== true) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.PAYMENT_MANUAL_CONFIRMATION_REQUIRED,
        undefined,
        409
      );
    }
    if (!manual) {
      await this.assertConfiguredLimits(option, amount, currency);
    }

    let created: PaymentTransactionRecord;
    try {
      created = await this.createTransaction({
        context,
        obligation,
        option,
        amount,
        currency,
        idempotencyKey,
        captureMode: manual
          ? PAYMENT_CAPTURE_MODES.MANUAL
          : PAYMENT_CAPTURE_MODES.ELECTRONIC,
      });
    } catch (error) {
      if (
        error instanceof PaymentObligationError &&
        (error.code === PAYMENT_ERROR_CODES.PAYMENT_DUPLICATE ||
          error.code === PAYMENT_ERROR_CODES.IDEMPOTENCY_CONFLICT)
      ) {
        const duplicate = await this.deps.transactions.findByIdempotencyKey(
          context.businessId,
          idempotencyKey
        );
        if (duplicate) {
          return this.toResult(duplicate, obligation);
        }
      }
      throw error;
    }

    if (manual) {
      const successful = await this.transitionTo(
        context,
        created,
        PAYMENT_STATUS_CODES.SUCCESSFUL,
        {
          initiatedAt: created.initiatedAt ?? new Date(),
          completedAt: new Date(),
        }
      );
      await this.applySuccessfulAllocation(context, obligation, successful);
      await this.maybeIssueReceipt(context, successful);
      await this.maybeTrackSettlement(context, successful);
      await this.audit(context, {
        action: PAYMENT_AUDIT_ACTIONS.PAYMENT_MANUAL_CAPTURED,
        obligationId: obligation.id,
        paymentTransactionId: successful.id,
        outcome: "SUCCESS",
        references: {
          amount: successful.amount,
          currency: successful.currencyCode,
          captureMode: successful.captureMode,
        },
      });
      const refreshed = await this.requireObligation(context, obligation.id);
      return this.toResult(successful, refreshed);
    }

    let engineOutcome: NormalizedPaymentOutcome;
    try {
      engineOutcome = await this.deps.engine.initiatePayment({
        businessId: context.businessId,
        paymentTransactionId: created.id,
        obligationId: obligation.id,
        methodId: option.methodId,
        networkId: option.railId,
        providerId: option.providerId as string,
        channelId: option.channelId as string,
        amount,
        currency,
        idempotencyKey,
      });
    } catch {
      const failed = await this.transitionTo(context, created, PAYMENT_STATUS_CODES.FAILED, {
        failureCode: PAYMENT_ERROR_CODES.PAYMENT_UNKNOWN,
        failureReason: PAYMENT_USER_MESSAGES.PAYMENT_UNKNOWN,
        completedAt: new Date(),
      });
      await this.audit(context, {
        action: PAYMENT_AUDIT_ACTIONS.PAYMENT_FAILED,
        obligationId: obligation.id,
        paymentTransactionId: failed.id,
        outcome: "FAILURE",
        references: { failureCode: PAYMENT_ERROR_CODES.PAYMENT_UNKNOWN },
      });
      const refreshed = await this.requireObligation(context, obligation.id);
      return this.toResult(failed, refreshed);
    }

    const afterEngine = await this.applyNormalizedOutcome(context, created, engineOutcome, {
      fromInitiation: true,
    });
    await this.maybeTrackException(context, afterEngine);
    await this.audit(context, {
      action: PAYMENT_AUDIT_ACTIONS.PAYMENT_INITIATED,
      obligationId: obligation.id,
      paymentTransactionId: afterEngine.id,
      outcome: "SUCCESS",
      references: {
        status: afterEngine.status,
        providerTransactionReference: afterEngine.providerTransactionReference,
      },
    });
    const refreshed = await this.requireObligation(context, obligation.id);
    return this.toResult(afterEngine, refreshed);
  }

  async applyProviderOutcome(
    context: CurrentBusinessContext,
    command: ApplyPaymentOutcomeCommand
  ): Promise<PaymentInitiationResult> {
    this.assertContext(context);
    const transaction = await this.findOutcomeTarget(context, command);
    if (command.outcome.providerTransactionReference?.trim()) {
      const existingRef = await this.deps.transactions.findByProviderReference(
        context.businessId,
        command.outcome.providerTransactionReference.trim()
      );
      if (existingRef && existingRef.id !== transaction.id) {
        await this.maybeTrackDuplicate(context, transaction.id);
        throw new PaymentObligationError(
          PAYMENT_ERROR_CODES.PAYMENT_DUPLICATE,
          undefined,
          409
        );
      }
    }
    const obligation = await this.requireObligation(context, transaction.obligationId);
    const outcome: NormalizedPaymentOutcome = {
      outcome: command.outcome.outcome as NormalizedPaymentOutcome["outcome"],
      providerTransactionReference:
        command.outcome.providerTransactionReference ??
        transaction.providerTransactionReference,
      amount: command.outcome.amount ?? null,
      currency: command.outcome.currency ?? null,
      obligationId: command.outcome.obligationId ?? null,
      failureCode: command.outcome.failureCode ?? null,
      failureReason: command.outcome.failureReason ?? null,
      metadata: command.outcome.metadata ?? null,
    };
    const updated = await this.applyNormalizedOutcome(context, transaction, outcome, {
      fromInitiation: false,
    });
    await this.maybeTrackException(context, updated);
    await this.audit(context, {
      action: PAYMENT_AUDIT_ACTIONS.PAYMENT_OUTCOME_RECEIVED,
      obligationId: obligation.id,
      paymentTransactionId: updated.id,
      outcome: "SUCCESS",
      references: {
        status: updated.status,
        normalizedOutcome: outcome.outcome,
        providerTransactionReference: updated.providerTransactionReference,
        outcomeMismatch: updated.outcomeMismatch,
      },
    });
    const refreshed = await this.requireObligation(context, obligation.id);
    return this.toResult(updated, refreshed);
  }

  async refreshPaymentStatus(
    context: CurrentBusinessContext,
    transactionId: string
  ): Promise<PaymentInitiationResult> {
    this.assertContext(context);
    const transaction = await this.deps.transactions.findById(
      context.businessId,
      transactionId
    );
    if (!transaction) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.TRANSACTION_NOT_FOUND,
        undefined,
        404
      );
    }
    if (
      transaction.captureMode === PAYMENT_CAPTURE_MODES.MANUAL ||
      !transaction.providerId ||
      !transaction.providerTransactionReference
    ) {
      const obligation = await this.requireObligation(context, transaction.obligationId);
      return this.toResult(transaction, obligation);
    }
    const queried = await this.deps.engine.queryPayment({
      businessId: context.businessId,
      providerId: transaction.providerId,
      providerTransactionReference: transaction.providerTransactionReference,
      paymentTransactionId: transaction.id,
    });
    return this.applyProviderOutcome(context, {
      paymentTransactionId: transaction.id,
      providerTransactionReference: transaction.providerTransactionReference,
      outcome: queried,
    });
  }

  private async listPayableOptions(
    context: CurrentBusinessContext,
    obligation: PaymentObligationRecord
  ) {
    const snapshot = await this.deps.catalogues.loadSnapshot();
    const flags = await this.deps.enablement.getFlags(context.businessId);
    const candidates = buildCatalogueCandidates(snapshot, flags);
    const eligible = await this.deps.engine.getEligibleChannels(
      {
        businessId: context.businessId,
        amount: obligation.outstandingAmount,
        currency: obligation.currencyCode,
      },
      candidates
    );
    return eligible.map((option) => ({
      methodId: option.methodId,
      methodCode: option.methodCode,
      label: option.customerLabel,
      requiresElectronicRail: option.requiresRail,
      railId: option.railId,
      providerId: option.providerId,
      channelId: option.channelId,
      minAmount: option.limits?.minAmount ?? null,
      maxAmount: option.limits?.maxAmount ?? null,
    }));
  }

  private async resolveOption(
    context: CurrentBusinessContext,
    obligation: PaymentObligationRecord,
    methodId: string,
    amount: string,
    currency: string
  ): Promise<EligiblePaymentOption> {
    const snapshot = await this.deps.catalogues.loadSnapshot();
    const flags = await this.deps.enablement.getFlags(context.businessId);
    const candidates = buildCatalogueCandidates(snapshot, flags).filter(
      (row) => row.methodId === methodId
    );
    if (candidates.length === 0) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.PAYMENT_CHANNEL_UNAVAILABLE,
        undefined,
        409
      );
    }
    const eligible = await this.deps.engine.getEligibleChannels(
      {
        businessId: context.businessId,
        amount,
        currency,
      },
      candidates
    );
    if (eligible.length === 0) {
      const limited = await this.anyCandidateOverLimit(candidates, amount, currency);
      throw new PaymentObligationError(
        limited
          ? PAYMENT_ERROR_CODES.PAYMENT_LIMIT_EXCEEDED
          : PAYMENT_ERROR_CODES.PAYMENT_CHANNEL_UNAVAILABLE,
        undefined,
        409
      );
    }
    return eligible[0];
  }

  private async anyCandidateOverLimit(
    candidates: Array<{ providerId: string | null; channelId: string | null }>,
    amount: string,
    currency: string
  ): Promise<boolean> {
    for (const candidate of candidates) {
      if (!candidate.providerId || !candidate.channelId) {
        continue;
      }
      const limits = await this.deps.engine.getLimits(
        candidate.providerId,
        candidate.channelId
      );
      if (!limits) {
        continue;
      }
      if (
        limits.supportedCurrencies &&
        limits.supportedCurrencies.length > 0 &&
        !limits.supportedCurrencies.some(
          (item) => item.trim().toUpperCase() === currency
        )
      ) {
        continue;
      }
      if (
        !isAmountWithinConfiguredLimits({
          amount,
          minAmount: limits.minAmount,
          maxAmount: limits.maxAmount,
          transactionLimit: limits.transactionLimit,
        })
      ) {
        return true;
      }
    }
    return false;
  }

  private async assertConfiguredLimits(
    option: EligiblePaymentOption,
    amount: string,
    currency: string
  ): Promise<void> {
    if (!option.providerId || !option.channelId) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.PAYMENT_CHANNEL_UNAVAILABLE,
        undefined,
        409
      );
    }
    const limits = await this.deps.engine.getLimits(option.providerId, option.channelId);
    if (!limits) {
      return;
    }
    if (
      limits.supportedCurrencies &&
      limits.supportedCurrencies.length > 0 &&
      !limits.supportedCurrencies.some((item) => item.trim().toUpperCase() === currency)
    ) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.PAYMENT_INVALID_CURRENCY,
        undefined,
        409
      );
    }
    if (
      !isAmountWithinConfiguredLimits({
        amount,
        minAmount: limits.minAmount,
        maxAmount: limits.maxAmount,
        transactionLimit: limits.transactionLimit,
      })
    ) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.PAYMENT_LIMIT_EXCEEDED,
        undefined,
        409
      );
    }
  }

  private async createTransaction(input: {
    context: CurrentBusinessContext;
    obligation: PaymentObligationRecord;
    option: EligiblePaymentOption;
    amount: string;
    currency: string;
    idempotencyKey: string;
    captureMode: string;
  }): Promise<PaymentTransactionRecord> {
    const transactionNumber = await this.generateTransactionNumber(
      input.context.businessId
    );
    const created = await this.deps.transactions.insert({
      businessId: input.context.businessId,
      obligationId: input.obligation.id,
      transactionNumber,
      methodId: input.option.methodId,
      networkId: input.option.railId,
      providerId: input.option.providerId,
      channelId: input.option.channelId,
      methodName: input.option.customerLabel || input.option.methodName,
      networkName: input.option.railName,
      providerName: input.option.providerName,
      channelName: input.option.channelName,
      amount: input.amount,
      currencyCode: input.currency,
      status: PAYMENT_STATUS_CODES.NOT_STARTED,
      captureMode: input.captureMode,
      providerTransactionReference: null,
      idempotencyKey: input.idempotencyKey,
      initiatedAt: new Date(),
      completedAt: null,
      failureCode: null,
      failureReason: null,
      providerResponseMetadata: null,
      outcomeMismatch: false,
      metadata: null,
      createdBy: input.context.platformUserId,
      updatedBy: input.context.platformUserId,
    });
    await this.deps.idempotency.insert({
      businessId: input.context.businessId,
      idempotencyKey: input.idempotencyKey,
      operationType: PAYMENT_IDEMPOTENCY_OPERATIONS.INITIATE_PAYMENT,
      resourceType: "payment_transaction",
      resourceId: created.id,
      createdBy: input.context.platformUserId,
    }).catch((error) => {
      if (
        error instanceof PaymentObligationError &&
        error.code === PAYMENT_ERROR_CODES.IDEMPOTENCY_CONFLICT
      ) {
        return;
      }
      throw error;
    });
    return created;
  }

  private async applyNormalizedOutcome(
    context: CurrentBusinessContext,
    transaction: PaymentTransactionRecord,
    outcome: NormalizedPaymentOutcome,
    options: { fromInitiation: boolean }
  ): Promise<PaymentTransactionRecord> {
    const nextStatus = mapNormalizedOutcomeToStatus(outcome.outcome);
    const patchMetadata = {
      ...(transaction.providerResponseMetadata ?? {}),
      lastNormalizedOutcome: outcome.outcome,
      ...(outcome.metadata ?? {}),
    };

    if (outcome.providerTransactionReference && !transaction.providerTransactionReference) {
      await this.audit(context, {
        action: PAYMENT_AUDIT_ACTIONS.PROVIDER_REFERENCE_ASSIGNED,
        obligationId: transaction.obligationId,
        paymentTransactionId: transaction.id,
        outcome: "SUCCESS",
        references: {
          providerTransactionReference: outcome.providerTransactionReference,
        },
      });
    }

    if (nextStatus === PAYMENT_STATUS_CODES.SUCCESSFUL) {
      const mismatch = this.detectOutcomeMismatch(transaction, outcome);
      if (mismatch) {
        const held = await this.deps.transactions.update(context.businessId, transaction.id, {
          providerTransactionReference:
            outcome.providerTransactionReference ?? transaction.providerTransactionReference,
          outcomeMismatch: true,
          failureCode: PAYMENT_ERROR_CODES.PAYMENT_OUTCOME_MISMATCH,
          failureReason: PAYMENT_USER_MESSAGES.PAYMENT_OUTCOME_MISMATCH,
          providerResponseMetadata: {
            ...patchMetadata,
            lastNormalizedAmount: outcome.amount,
            lastNormalizedCurrency: outcome.currency,
            lastNormalizedObligationId: outcome.obligationId,
          },
          updatedBy: context.platformUserId,
        });
        return held;
      }
    }

    if (nextStatus === null) {
      const unresolvedStatus =
        options.fromInitiation && transaction.status === PAYMENT_STATUS_CODES.NOT_STARTED
          ? PAYMENT_STATUS_CODES.INITIATED
          : transaction.status;
      if (unresolvedStatus !== transaction.status) {
        assertPaymentStatusTransition(transaction.status, unresolvedStatus);
      }
      return this.deps.transactions.update(context.businessId, transaction.id, {
        status: unresolvedStatus,
        providerTransactionReference:
          outcome.providerTransactionReference ?? transaction.providerTransactionReference,
        providerResponseMetadata: patchMetadata,
        failureCode: outcome.failureCode,
        failureReason: outcome.failureReason,
        updatedBy: context.platformUserId,
      });
    }

    if (transaction.status === nextStatus) {
      return this.deps.transactions.update(context.businessId, transaction.id, {
        providerTransactionReference:
          outcome.providerTransactionReference ?? transaction.providerTransactionReference,
        providerResponseMetadata: patchMetadata,
        failureCode: outcome.failureCode,
        failureReason: outcome.failureReason,
        updatedBy: context.platformUserId,
      });
    }

    if (
      isTerminalPaymentStatus(transaction.status) &&
      transaction.status !== nextStatus
    ) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.PAYMENT_INVALID_TRANSITION,
        undefined,
        409
      );
    }

    assertPaymentStatusTransition(transaction.status, nextStatus);

    const completed =
      nextStatus === PAYMENT_STATUS_CODES.SUCCESSFUL ||
      nextStatus === PAYMENT_STATUS_CODES.FAILED ||
      nextStatus === PAYMENT_STATUS_CODES.EXPIRED
        ? new Date()
        : transaction.completedAt;

    const failureCode =
      nextStatus === PAYMENT_STATUS_CODES.FAILED
        ? outcome.failureCode || PAYMENT_ERROR_CODES.PAYMENT_PROVIDER_REJECTED
        : nextStatus === PAYMENT_STATUS_CODES.EXPIRED
          ? outcome.failureCode || PAYMENT_ERROR_CODES.PAYMENT_EXPIRED
          : outcome.failureCode;

    const updated = await this.transitionTo(context, transaction, nextStatus, {
      providerTransactionReference:
        outcome.providerTransactionReference ?? transaction.providerTransactionReference,
      completedAt: completed,
      failureCode,
      failureReason: outcome.failureReason,
      providerResponseMetadata: patchMetadata,
    });

    if (nextStatus === PAYMENT_STATUS_CODES.SUCCESSFUL) {
      const obligation = await this.requireObligation(context, updated.obligationId);
      await this.applySuccessfulAllocation(context, obligation, updated);
      await this.maybeIssueReceipt(context, updated);
      await this.maybeTrackSettlement(context, updated);
      await this.audit(context, {
        action: PAYMENT_AUDIT_ACTIONS.PAYMENT_SUCCESSFUL,
        obligationId: updated.obligationId,
        paymentTransactionId: updated.id,
        outcome: "SUCCESS",
        references: { amount: updated.amount, currency: updated.currencyCode },
      });
    } else if (nextStatus === PAYMENT_STATUS_CODES.FAILED) {
      await this.audit(context, {
        action: PAYMENT_AUDIT_ACTIONS.PAYMENT_FAILED,
        obligationId: updated.obligationId,
        paymentTransactionId: updated.id,
        outcome: "SUCCESS",
        references: {
          failureCode: updated.failureCode,
          failureReason: updated.failureReason,
        },
      });
    } else if (nextStatus === PAYMENT_STATUS_CODES.EXPIRED) {
      await this.audit(context, {
        action: PAYMENT_AUDIT_ACTIONS.PAYMENT_EXPIRED,
        obligationId: updated.obligationId,
        paymentTransactionId: updated.id,
        outcome: "SUCCESS",
        references: {},
      });
    } else if (!options.fromInitiation) {
      await this.audit(context, {
        action: PAYMENT_AUDIT_ACTIONS.PAYMENT_STATUS_CHANGED,
        obligationId: updated.obligationId,
        paymentTransactionId: updated.id,
        outcome: "SUCCESS",
        references: { status: updated.status },
      });
    }

    return updated;
  }

  private detectOutcomeMismatch(
    transaction: PaymentTransactionRecord,
    outcome: NormalizedPaymentOutcome
  ): boolean {
    if (outcome.obligationId && outcome.obligationId !== transaction.obligationId) {
      return true;
    }
    if (
      outcome.amount &&
      comparePaymentAmount(outcome.amount, transaction.amount) !== 0
    ) {
      return true;
    }
    if (
      outcome.currency &&
      outcome.currency.trim().toUpperCase() !== transaction.currencyCode.trim().toUpperCase()
    ) {
      return true;
    }
    return false;
  }

  private async applySuccessfulAllocation(
    context: CurrentBusinessContext,
    obligation: PaymentObligationRecord,
    transaction: PaymentTransactionRecord
  ): Promise<void> {
    void obligation;
    await this.deps.allocations.allocateSuccessfulPayment(context, transaction);
  }

  private async maybeIssueReceipt(
    context: CurrentBusinessContext,
    transaction: PaymentTransactionRecord
  ): Promise<void> {
    if (!this.deps.receipts) {
      return;
    }
    try {
      await this.deps.receipts.issueForSuccessfulPayment(context, transaction.id);
    } catch {
      // Receipt failure must not change payment success.
    }
  }

  private async maybeTrackSettlement(
    context: CurrentBusinessContext,
    transaction: PaymentTransactionRecord
  ): Promise<void> {
    if (!this.deps.settlements) {
      return;
    }
    try {
      await this.deps.settlements.trackForSuccessfulPayment(context, transaction.id);
    } catch {
      // Settlement tracking failure must not change payment success.
    }
  }

  private async maybeTrackException(
    context: CurrentBusinessContext,
    transaction: PaymentTransactionRecord
  ): Promise<void> {
    if (!this.deps.exceptions) {
      return;
    }
    try {
      await this.deps.exceptions.trackFromPaymentOutcome(context, transaction.id);
    } catch {
      // Exception tracking must not change payment processing.
    }
  }

  private async maybeTrackDuplicate(
    context: CurrentBusinessContext,
    paymentTransactionId: string
  ): Promise<void> {
    if (!this.deps.exceptions) {
      return;
    }
    try {
      await this.deps.exceptions.trackDuplicateProviderReference(context, paymentTransactionId);
    } catch {
      // Duplicate tracking must not replace fail-closed conflict.
    }
  }

  private async transitionTo(
    context: CurrentBusinessContext,
    transaction: PaymentTransactionRecord,
    status: string,
    patch: {
      providerTransactionReference?: string | null;
      initiatedAt?: Date | null;
      completedAt?: Date | null;
      failureCode?: string | null;
      failureReason?: string | null;
      providerResponseMetadata?: Record<string, unknown> | null;
    }
  ): Promise<PaymentTransactionRecord> {
    assertPaymentStatusTransition(transaction.status, status);
    return this.deps.transactions.update(context.businessId, transaction.id, {
      status,
      providerTransactionReference:
        patch.providerTransactionReference ?? transaction.providerTransactionReference,
      initiatedAt: patch.initiatedAt ?? transaction.initiatedAt,
      completedAt: patch.completedAt ?? transaction.completedAt,
      failureCode: patch.failureCode ?? transaction.failureCode,
      failureReason: patch.failureReason ?? transaction.failureReason,
      providerResponseMetadata:
        patch.providerResponseMetadata ?? transaction.providerResponseMetadata,
      updatedBy: context.platformUserId,
    });
  }

  private async findOutcomeTarget(
    context: CurrentBusinessContext,
    command: ApplyPaymentOutcomeCommand
  ): Promise<PaymentTransactionRecord> {
    if (command.paymentTransactionId?.trim()) {
      const row = await this.deps.transactions.findById(
        context.businessId,
        command.paymentTransactionId.trim()
      );
      if (!row) {
        throw new PaymentObligationError(
          PAYMENT_ERROR_CODES.TRANSACTION_NOT_FOUND,
          undefined,
          404
        );
      }
      return row;
    }
    const reference = command.providerTransactionReference?.trim();
    if (!reference) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.INVALID_INPUT,
        PAYMENT_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }
    const byRef = await this.deps.transactions.findByProviderReference(
      context.businessId,
      reference
    );
    if (!byRef) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.TRANSACTION_NOT_FOUND,
        undefined,
        404
      );
    }
    return byRef;
  }

  private async findExistingInitiation(
    context: CurrentBusinessContext,
    rawKey: string
  ): Promise<PaymentInitiationResult | null> {
    const idempotencyKey = rawKey.slice(0, 180);
    const existing = await this.deps.transactions.findByIdempotencyKey(
      context.businessId,
      idempotencyKey
    );
    if (!existing) {
      return null;
    }
    const obligation = await this.requireObligation(context, existing.obligationId);
    return this.toResult(existing, obligation);
  }

  private async requireEligibleObligation(
    context: CurrentBusinessContext,
    obligationId: string
  ): Promise<PaymentObligationRecord> {
    const obligation = await this.requireObligation(context, obligationId);
    const outstanding = parsePaymentAmount(obligation.outstandingAmount);
    const due = parsePaymentAmount(obligation.amountDue);
    if (due === null || due <= 0 || outstanding === null || outstanding <= 0) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.OBLIGATION_NOT_ELIGIBLE,
        undefined,
        409
      );
    }
    if (!obligation.currencyCode?.trim()) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.CURRENCY_MISSING,
        undefined,
        409
      );
    }
    return obligation;
  }

  private async requireObligation(
    context: CurrentBusinessContext,
    obligationId: string
  ): Promise<PaymentObligationRecord> {
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

  private assertPayableAmount(
    amount: string,
    currency: string,
    obligation: PaymentObligationRecord,
    allowOverpayment: boolean
  ): void {
    if (!isPositivePaymentAmount(amount)) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.PAYMENT_INVALID_AMOUNT,
        undefined,
        400,
        { field: "amount", entity: "payment" }
      );
    }
    if (currency !== obligation.currencyCode.trim().toUpperCase()) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.PAYMENT_INVALID_CURRENCY,
        undefined,
        409,
        { field: "currency", entity: "payment" }
      );
    }
    if (comparePaymentAmount(amount, obligation.outstandingAmount) > 0) {
      if (!allowOverpayment) {
        throw new PaymentObligationError(
          PAYMENT_ERROR_CODES.PAYMENT_AMOUNT_EXCEEDS_OUTSTANDING,
          undefined,
          409,
          { field: "amount", entity: "payment" }
        );
      }
    }
  }

  private async generateTransactionNumber(businessId: string): Promise<string> {
    const count = await this.deps.transactions.countAll(businessId);
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = `${PAYMENT_TRANSACTION_NUMBER_PREFIX}-${String(count + 1 + attempt).padStart(6, "0")}`;
      const existing = await this.deps.transactions.findByTransactionNumber(
        businessId,
        candidate
      );
      if (!existing) {
        return candidate;
      }
    }
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.PROVIDER_ERROR,
      PAYMENT_USER_MESSAGES.PROVIDER_ERROR,
      500
    );
  }

  private async toResult(
    transaction: PaymentTransactionRecord,
    obligation: PaymentObligationRecord
  ): Promise<PaymentInitiationResult> {
    return {
      transaction: toTransactionView(transaction, obligation),
      obligation: toObligationView(obligation),
    };
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

export function createDefaultPaymentInitiationDependencies(): PaymentInitiationServiceDependencies {
  const catalogues = createPaymentCatalogueRepository();
  const obligations = createPaymentObligationRepository();
  const transactions = createPaymentTransactionRepository();
  const idempotency = createPaymentIdempotencyRepository();
  const audit = createPaymentAuditAdapter();
  const policy = createPaymentAllocationPolicyAdapter(false);
  const allocations = new PaymentAllocationService({
    obligations,
    transactions,
    allocations: createPaymentAllocationRepository(),
    idempotency,
    policy,
    locks: createInProcessPaymentLock(),
    audit,
  });
  return {
    obligations,
    transactions,
    idempotency,
    catalogues,
    engine: createCatalogueCapabilityPaymentEngine(
      createPaymentCapabilityStoreAdapter(catalogues),
      createInProcessPaymentInitiationAdapter()
    ),
    enablement: createBusinessPaymentEnablementAdapter(),
    currencies: createCurrencyCatalogueAdapter(),
    audit,
    allocations,
    policy,
    receipts: createPaymentReceiptService(),
    settlements: createPaymentSettlementService(),
    exceptions: createPaymentExceptionService(),
  };
}

export function createPaymentInitiationService(
  deps?: PaymentInitiationServiceDependencies
) {
  return new PaymentInitiationService(
    deps ?? createDefaultPaymentInitiationDependencies()
  );
}
