/**
 * Purpose:
 * BP-007 IP-07 orchestration — track provider settlement independently
 * of payment success. ENG-006 supplies normalized settlement data.
 * ENG-008 consumes the handoff payload later. No matching or collections.
 *
 * Implementation Package:
 * BP-007 / IP-07 – Settlement & Reconciliation Handoff
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  createCatalogueCapabilityPaymentEngine,
  createInProcessPaymentInitiationAdapter,
  type PaymentEnginePort,
} from "@/core/payment-engine";
import {
  PAYMENT_AUDIT_ACTIONS,
  PAYMENT_IDEMPOTENCY_OPERATIONS,
  SETTLEMENT_STATUS,
  SETTLEMENT_STATUS_LABELS,
} from "@/modules/payments/constants";
import {
  PAYMENT_ERROR_CODES,
  PAYMENT_USER_MESSAGES,
  PaymentObligationError,
} from "@/modules/payments/errors";
import { createPaymentSettlementPolicyAdapter } from "@/modules/payments/adapters/payment-settlement-policy-adapter";
import type {
  PaymentAuditPort,
  PaymentCatalogueRepositoryPort,
  PaymentIdempotencyRepositoryPort,
  PaymentLockPort,
  PaymentObligationRepositoryPort,
  PaymentRefundRepositoryPort,
  PaymentSettlementRepositoryPort,
  PaymentSettlementTrackerPort,
  PaymentTransactionRepositoryPort,
  SettlementPolicyPort,
} from "@/modules/payments/ports";
import { createPaymentCatalogueRepository, createPaymentCapabilityStoreAdapter } from "@/modules/payments/repositories/payment-catalogue-repository";
import { createPaymentIdempotencyRepository } from "@/modules/payments/repositories/payment-idempotency-repository";
import { createPaymentObligationRepository } from "@/modules/payments/repositories/payment-obligation-repository";
import { createPaymentRefundRepository } from "@/modules/payments/repositories/payment-refund-repository";
import { createPaymentSettlementRepository } from "@/modules/payments/repositories/payment-settlement-repository";
import { createPaymentTransactionRepository } from "@/modules/payments/repositories/payment-transaction-repository";
import { createInProcessPaymentLock } from "@/modules/payments/services/payment-lock";
import { createPaymentAuditAdapter } from "@/modules/payments/services/payment-obligation-audit-helper";
import {
  assertSettlementEligible,
  assertSettlementTransition,
  expectedSettlementFromPayment,
  hasSettlementVariance,
  initialStatusForMode,
  mapEngineSettlementStatus,
  sameSettlementNotification,
  settlementConflict,
  settlementVariance,
} from "@/modules/payments/services/payment-settlement-rules";
import type {
  ApplyProviderSettlementCommand,
  PaymentObligationRecord,
  PaymentSettlementRecord,
  PaymentTransactionRecord,
  ReconciliationHandoffPayload,
  SettlementView,
} from "@/modules/payments/types";

export type PaymentSettlementServiceDependencies = {
  transactions: PaymentTransactionRepositoryPort;
  obligations: PaymentObligationRepositoryPort;
  settlements: PaymentSettlementRepositoryPort;
  catalogues: PaymentCatalogueRepositoryPort;
  policy: SettlementPolicyPort;
  engine: PaymentEnginePort;
  refunds?: PaymentRefundRepositoryPort;
  idempotency: PaymentIdempotencyRepositoryPort;
  locks: PaymentLockPort;
  audit: PaymentAuditPort;
};

function toView(row: PaymentSettlementRecord): SettlementView {
  return {
    id: row.id,
    businessId: row.businessId,
    paymentTransactionId: row.paymentTransactionId,
    obligationId: row.paymentObligationId,
    settlementStatus: row.settlementStatus,
    settlementStatusLabel: SETTLEMENT_STATUS_LABELS[row.settlementStatus] ?? row.settlementStatus,
    expectedAmount: row.expectedAmount,
    receivedAmount: row.receivedAmount,
    varianceAmount: row.varianceAmount,
    currencyCode: row.currencyCode,
    settlementReference: row.settlementReference,
    settlementBatchReference: row.settlementBatchReference,
    settlementDate: row.settlementDate?.toISOString() ?? null,
    receivedAt: row.receivedAt?.toISOString() ?? null,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    exceptionFlag: row.exceptionFlag,
    exceptionReason: row.exceptionReason,
    methodName: row.methodName,
    networkName: row.networkName,
    providerName: row.providerName,
    channelName: row.channelName,
  };
}

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export class PaymentSettlementService implements PaymentSettlementTrackerPort {
  constructor(private readonly deps: PaymentSettlementServiceDependencies) {}

  async trackForSuccessfulPayment(
    context: CurrentBusinessContext,
    paymentTransactionId: string
  ): Promise<void> {
    await this.ensureTracked(context, paymentTransactionId);
  }

  async ensureTracked(
    context: CurrentBusinessContext,
    paymentTransactionId: string
  ): Promise<SettlementView> {
    this.assertTenant(context);
    return this.deps.locks.runExclusive(
      `settlement:${context.businessId}:${paymentTransactionId}`,
      async () => {
        return toView(await this.createInitialIfMissing(context, paymentTransactionId));
      }
    );
  }

  async applyProviderSettlement(
    context: CurrentBusinessContext,
    command: ApplyProviderSettlementCommand
  ): Promise<SettlementView> {
    this.assertTenant(context);
    const paymentTransactionId = command.paymentTransactionId.trim();
    return this.deps.locks.runExclusive(
      `settlement:${context.businessId}:${paymentTransactionId}`,
      async () => {
        const transaction = await this.requireTransaction(context, paymentTransactionId);
        assertSettlementEligible(transaction);
        const obligation = await this.requireObligation(context, transaction.obligationId);
        const snapshot = {
          status: transaction.status,
          amount: transaction.amount,
          amountDue: obligation.amountDue,
        };
        const settlement = await this.createInitialIfMissing(context, paymentTransactionId);
        const currency = (command.currency ?? settlement.currencyCode).trim().toUpperCase();
        if (currency !== settlement.currencyCode.trim().toUpperCase()) {
          throw new PaymentObligationError(
            PAYMENT_ERROR_CODES.SETTLEMENT_CURRENCY_MISMATCH,
            undefined,
            409
          );
        }
        const reference = command.settlementReference?.trim() || null;
        if (reference) {
          const byReference = await this.deps.settlements.findBySettlementReference(
            context.businessId,
            reference
          );
          if (byReference && byReference.id !== settlement.id) {
            throw new PaymentObligationError(
              PAYMENT_ERROR_CODES.SETTLEMENT_CONFLICT,
              undefined,
              409
            );
          }
          if (
            byReference &&
            settlementConflict(byReference, {
              paymentTransactionId,
              currencyCode: currency,
              receivedAmount: command.receivedAmount,
              settlementBatchReference: command.settlementBatchReference,
            })
          ) {
            throw new PaymentObligationError(
              PAYMENT_ERROR_CODES.SETTLEMENT_CONFLICT,
              undefined,
              409
            );
          }
        }
        if (
          command.expectedAmount?.trim() &&
          hasSettlementVariance(command.expectedAmount, settlement.expectedAmount)
        ) {
          throw new PaymentObligationError(
            PAYMENT_ERROR_CODES.SETTLEMENT_CONFLICT,
            undefined,
            409
          );
        }
        if (
          settlementConflict(settlement, {
            paymentTransactionId,
            currencyCode: currency,
            receivedAmount: command.receivedAmount,
            settlementBatchReference: command.settlementBatchReference,
          })
        ) {
          throw new PaymentObligationError(
            PAYMENT_ERROR_CODES.SETTLEMENT_CONFLICT,
            undefined,
            409
          );
        }
        if (
          sameSettlementNotification(settlement, {
            paymentTransactionId,
            currencyCode: currency,
            receivedAmount: command.receivedAmount,
            settlementBatchReference: command.settlementBatchReference,
            settlementReference: reference,
          }) &&
          settlement.receivedAmount != null &&
          (reference == null || settlement.settlementReference === reference)
        ) {
          await this.assertPaymentSnapshot(context, snapshot, transaction.id, obligation.id);
          return toView(settlement);
        }
        const receivedAmount = command.receivedAmount?.trim() || settlement.receivedAmount;
        const varianceAmount = settlementVariance(receivedAmount, settlement.expectedAmount);
        const exceptionFlag = hasSettlementVariance(
          receivedAmount,
          settlement.expectedAmount
        ) || command.settlementStatus === "EXCEPTION";
        const mapped = mapEngineSettlementStatus(
          command.settlementStatus ?? (receivedAmount ? "RECEIVED" : "PENDING"),
          exceptionFlag
        );
        const nextStatus =
          exceptionFlag && mapped === SETTLEMENT_STATUS.SETTLEMENT_RECEIVED
            ? SETTLEMENT_STATUS.SETTLEMENT_RECEIVED
            : mapped === SETTLEMENT_STATUS.SETTLEMENT_PENDING && receivedAmount
              ? SETTLEMENT_STATUS.SETTLEMENT_RECEIVED
              : mapped;
        if (nextStatus !== settlement.settlementStatus) {
          assertSettlementTransition(settlement.settlementStatus, nextStatus);
        }
        const now = new Date();
        const updated = await this.deps.settlements.update(context.businessId, settlement.id, {
          settlementStatus: nextStatus,
          receivedAmount,
          varianceAmount,
          settlementReference: reference ?? settlement.settlementReference,
          settlementBatchReference:
            command.settlementBatchReference?.trim() || settlement.settlementBatchReference,
          settlementDate: parseDate(command.settlementDate) ?? settlement.settlementDate ?? now,
          receivedAt:
            receivedAmount && !settlement.receivedAt ? now : settlement.receivedAt,
          confirmedAt:
            nextStatus === SETTLEMENT_STATUS.SETTLEMENT_CONFIRMED
              ? settlement.confirmedAt ?? now
              : settlement.confirmedAt,
          providerSettlementMetadata: command.metadata ?? settlement.providerSettlementMetadata,
          exceptionFlag,
          exceptionCode: exceptionFlag ? "SETTLEMENT_VARIANCE" : null,
          exceptionReason: exceptionFlag
            ? "Reported settlement amount differs from the expected settlement amount."
            : null,
          updatedBy: context.platformUserId,
        });
        const auditActions: string[] = [];
        if (nextStatus === SETTLEMENT_STATUS.SETTLEMENT_RECEIVED) {
          auditActions.push(PAYMENT_AUDIT_ACTIONS.SETTLEMENT_RECEIVED);
        } else if (nextStatus === SETTLEMENT_STATUS.SETTLEMENT_CONFIRMED) {
          auditActions.push(PAYMENT_AUDIT_ACTIONS.SETTLEMENT_CONFIRMED);
        } else if (nextStatus === SETTLEMENT_STATUS.SETTLEMENT_EXCEPTION) {
          auditActions.push(PAYMENT_AUDIT_ACTIONS.SETTLEMENT_EXCEPTION);
        } else {
          auditActions.push(PAYMENT_AUDIT_ACTIONS.SETTLEMENT_UPDATED);
        }
        if (
          exceptionFlag &&
          nextStatus !== SETTLEMENT_STATUS.SETTLEMENT_EXCEPTION
        ) {
          auditActions.push(PAYMENT_AUDIT_ACTIONS.SETTLEMENT_EXCEPTION);
        }
        for (const action of auditActions) {
          await this.auditSettlement(context, updated, action);
        }
        await this.assertPaymentSnapshot(context, snapshot, transaction.id, obligation.id);
        return toView(updated);
      }
    );
  }

  async confirmSettlement(
    context: CurrentBusinessContext,
    settlementId: string
  ): Promise<SettlementView> {
    this.assertTenant(context);
    const settlement = await this.requireSettlement(context, settlementId);
    return this.deps.locks.runExclusive(
      `settlement:${context.businessId}:${settlement.paymentTransactionId}`,
      async () => {
        const current = await this.requireSettlement(context, settlementId);
        const transaction = await this.requireTransaction(
          context,
          current.paymentTransactionId
        );
        const obligation = await this.requireObligation(context, current.paymentObligationId);
        const snapshot = {
          status: transaction.status,
          amount: transaction.amount,
          amountDue: obligation.amountDue,
        };
        assertSettlementTransition(
          current.settlementStatus,
          SETTLEMENT_STATUS.SETTLEMENT_CONFIRMED
        );
        const now = new Date();
        const updated = await this.deps.settlements.update(context.businessId, current.id, {
          settlementStatus: SETTLEMENT_STATUS.SETTLEMENT_CONFIRMED,
          confirmedAt: now,
          updatedBy: context.platformUserId,
        });
        await this.auditSettlement(
          context,
          updated,
          PAYMENT_AUDIT_ACTIONS.SETTLEMENT_CONFIRMED
        );
        await this.assertPaymentSnapshot(context, snapshot, transaction.id, obligation.id);
        return toView(updated);
      }
    );
  }

  async refreshFromEngine(
    context: CurrentBusinessContext,
    paymentTransactionId: string
  ): Promise<SettlementView> {
    this.assertTenant(context);
    const transaction = await this.requireTransaction(context, paymentTransactionId);
    assertSettlementEligible(transaction);
    const outcome = await this.deps.engine.getSettlementDetails({
      businessId: context.businessId,
      paymentTransactionId: transaction.id,
      providerId: transaction.providerId,
      channelId: transaction.channelId,
      providerTransactionReference: transaction.providerTransactionReference,
      expectedAmount: transaction.amount,
      currency: transaction.currencyCode,
    });
    return this.applyProviderSettlement(context, {
      paymentTransactionId: transaction.id,
      receivedAmount: outcome.receivedAmount,
      expectedAmount: outcome.expectedAmount,
      currency: outcome.currency,
      settlementReference: outcome.settlementReference,
      settlementBatchReference: outcome.settlementBatchReference,
      settlementDate: outcome.settlementDate,
      settlementStatus: outcome.settlementStatus,
      metadata: outcome.metadata ?? null,
    });
  }

  async getByTransaction(
    context: CurrentBusinessContext,
    paymentTransactionId: string
  ): Promise<SettlementView | null> {
    this.assertTenant(context);
    await this.requireTransaction(context, paymentTransactionId);
    const row = await this.deps.settlements.findByTransaction(
      context.businessId,
      paymentTransactionId
    );
    return row ? toView(row) : null;
  }

  async getSettlement(
    context: CurrentBusinessContext,
    settlementId: string
  ): Promise<SettlementView> {
    this.assertTenant(context);
    return toView(await this.requireSettlement(context, settlementId));
  }

  async getReconciliationHandoff(
    context: CurrentBusinessContext,
    paymentTransactionId: string
  ): Promise<ReconciliationHandoffPayload> {
    this.assertTenant(context);
    const transaction = await this.requireTransaction(context, paymentTransactionId);
    const settlement = await this.deps.settlements.findByTransaction(
      context.businessId,
      paymentTransactionId
    );
    if (!settlement) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.SETTLEMENT_NOT_FOUND,
        undefined,
        404
      );
    }
    const refunds = this.deps.refunds
      ? await this.deps.refunds.listByTransaction(context.businessId, transaction.id)
      : [];
    return {
      businessId: context.businessId,
      paymentTransactionId: transaction.id,
      transactionNumber: transaction.transactionNumber,
      obligationId: transaction.obligationId,
      paymentAmount: transaction.amount,
      currency: transaction.currencyCode,
      paymentMethod: transaction.methodName,
      paymentNetwork: transaction.networkName,
      paymentProvider: transaction.providerName,
      paymentChannel: transaction.channelName,
      providerTransactionReference: transaction.providerTransactionReference,
      settlementReference: settlement.settlementReference,
      settlementBatchReference: settlement.settlementBatchReference,
      expectedSettlementAmount: settlement.expectedAmount,
      actualSettlementAmount: settlement.receivedAmount,
      settlementVariance: settlement.varianceAmount,
      settlementStatus: settlement.settlementStatus,
      settlementDate: settlement.settlementDate?.toISOString() ?? null,
      exceptionFlag: settlement.exceptionFlag,
      refunds: refunds.map((row) => ({
        refundId: row.id,
        refundNumber: row.refundNumber,
        amount: row.amount,
        currencyCode: row.currencyCode,
        status: row.status,
      })),
    };
  }

  private async createInitialIfMissing(
    context: CurrentBusinessContext,
    paymentTransactionId: string
  ): Promise<PaymentSettlementRecord> {
    const existing = await this.deps.settlements.findByTransaction(
      context.businessId,
      paymentTransactionId
    );
    if (existing) {
      return existing;
    }
    const transaction = await this.requireTransaction(context, paymentTransactionId);
    assertSettlementEligible(transaction);
    const obligation = await this.requireObligation(context, transaction.obligationId);
    const mode = await this.deps.policy.resolveMode({
      businessId: context.businessId,
      methodId: transaction.methodId,
      channelId: transaction.channelId,
      providerId: transaction.providerId,
    });
    const status = initialStatusForMode(mode);
    const expectedAmount = expectedSettlementFromPayment(transaction);
    const receivedAmount =
      status === SETTLEMENT_STATUS.SETTLEMENT_CONFIRMED ? expectedAmount : null;
    const varianceAmount =
      receivedAmount == null ? null : settlementVariance(receivedAmount, expectedAmount);
    const now = new Date();
    const idempotencyKey = `settlement:${transaction.id}`;
    const prior = await this.deps.idempotency.find(
      context.businessId,
      PAYMENT_IDEMPOTENCY_OPERATIONS.TRACK_SETTLEMENT,
      idempotencyKey
    );
    if (prior) {
      const replayed = await this.deps.settlements.findById(
        context.businessId,
        prior.resourceId
      );
      if (replayed) {
        return replayed;
      }
    }
    const created = await this.deps.settlements.insert({
      businessId: context.businessId,
      paymentTransactionId: transaction.id,
      paymentObligationId: obligation.id,
      settlementStatus: status,
      expectedAmount,
      receivedAmount,
      varianceAmount,
      currencyCode: transaction.currencyCode,
      settlementReference: null,
      settlementBatchReference: null,
      settlementDate: status === SETTLEMENT_STATUS.SETTLEMENT_CONFIRMED ? now : null,
      receivedAt: status === SETTLEMENT_STATUS.SETTLEMENT_CONFIRMED ? now : null,
      confirmedAt: status === SETTLEMENT_STATUS.SETTLEMENT_CONFIRMED ? now : null,
      methodId: transaction.methodId,
      networkId: transaction.networkId,
      providerId: transaction.providerId,
      channelId: transaction.channelId,
      methodName: transaction.methodName,
      networkName: transaction.networkName,
      providerName: transaction.providerName,
      channelName: transaction.channelName,
      providerTransactionReference: transaction.providerTransactionReference,
      providerSettlementMetadata: null,
      exceptionFlag: false,
      exceptionCode: null,
      exceptionReason: null,
      idempotencyKey,
      metadata: { settlementMode: mode },
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });
    await this.deps.idempotency.insert({
      businessId: context.businessId,
      idempotencyKey,
      operationType: PAYMENT_IDEMPOTENCY_OPERATIONS.TRACK_SETTLEMENT,
      resourceType: "payment_settlement",
      resourceId: created.id,
      createdBy: context.platformUserId,
    });
    await this.auditSettlement(context, created, PAYMENT_AUDIT_ACTIONS.SETTLEMENT_CREATED);
    if (status === SETTLEMENT_STATUS.SETTLEMENT_PENDING) {
      await this.auditSettlement(context, created, PAYMENT_AUDIT_ACTIONS.SETTLEMENT_PENDING);
    }
    if (status === SETTLEMENT_STATUS.SETTLEMENT_CONFIRMED) {
      await this.auditSettlement(context, created, PAYMENT_AUDIT_ACTIONS.SETTLEMENT_CONFIRMED);
    }
    await this.assertPaymentUnchanged(context, transaction, obligation);
    return created;
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

  private async requireSettlement(context: CurrentBusinessContext, settlementId: string) {
    const row = await this.deps.settlements.findById(context.businessId, settlementId);
    if (!row || row.businessId !== context.businessId) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.CROSS_BUSINESS_ACCESS,
        undefined,
        403
      );
    }
    return row;
  }

  private async assertPaymentUnchanged(
    context: CurrentBusinessContext,
    transaction: PaymentTransactionRecord,
    obligation: PaymentObligationRecord
  ) {
    await this.assertPaymentSnapshot(
      context,
      {
        status: transaction.status,
        amount: transaction.amount,
        amountDue: obligation.amountDue,
      },
      transaction.id,
      obligation.id
    );
  }

  private async assertPaymentSnapshot(
    context: CurrentBusinessContext,
    snapshot: { status: string; amount: string; amountDue: string },
    transactionId: string,
    obligationId: string
  ) {
    const transaction = await this.deps.transactions.findById(
      context.businessId,
      transactionId
    );
    const obligation = await this.deps.obligations.findById(
      context.businessId,
      obligationId
    );
    if (
      !transaction ||
      transaction.status !== snapshot.status ||
      transaction.amount !== snapshot.amount ||
      !obligation ||
      obligation.amountDue !== snapshot.amountDue
    ) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.PROVIDER_ERROR,
        undefined,
        500
      );
    }
  }

  private async auditSettlement(
    context: CurrentBusinessContext,
    settlement: PaymentSettlementRecord,
    action: string
  ) {
    try {
      await this.deps.audit.record({
        businessId: context.businessId,
        actorUserId: context.platformUserId,
        obligationId: settlement.paymentObligationId,
        paymentTransactionId: settlement.paymentTransactionId,
        settlementId: settlement.id,
        operation: "UPDATE",
        action,
        outcome: "SUCCESS",
        references: {
          settlementStatus: settlement.settlementStatus,
          expectedAmount: settlement.expectedAmount,
          receivedAmount: settlement.receivedAmount,
          varianceAmount: settlement.varianceAmount,
          currencyCode: settlement.currencyCode,
          settlementReference: settlement.settlementReference,
          exceptionFlag: settlement.exceptionFlag,
        },
      });
    } catch {
      // Audit must not mask the original fail-closed error.
    }
  }
}

export function createDefaultPaymentSettlementDependencies(): PaymentSettlementServiceDependencies {
  const catalogues = createPaymentCatalogueRepository();
  return {
    transactions: createPaymentTransactionRepository(),
    obligations: createPaymentObligationRepository(),
    settlements: createPaymentSettlementRepository(),
    catalogues,
    policy: createPaymentSettlementPolicyAdapter(catalogues),
    engine: createCatalogueCapabilityPaymentEngine(
      createPaymentCapabilityStoreAdapter(catalogues),
      createInProcessPaymentInitiationAdapter()
    ),
    refunds: createPaymentRefundRepository(),
    idempotency: createPaymentIdempotencyRepository(),
    locks: createInProcessPaymentLock(),
    audit: createPaymentAuditAdapter(),
  };
}

export function createPaymentSettlementService(
  deps?: PaymentSettlementServiceDependencies
) {
  return new PaymentSettlementService(
    deps ?? createDefaultPaymentSettlementDependencies()
  );
}
