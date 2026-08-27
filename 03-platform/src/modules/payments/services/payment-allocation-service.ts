/**
 * Purpose:
 * BP-007 IP-03 orchestration — allocate successful payments to an
 * obligation without changing the payment transaction. No invoices,
 * receipts, refunds, or settlement.
 *
 * Implementation Package:
 * BP-007 / IP-03 – Partial, Split Payment & Allocation
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  addPaymentAmounts,
  comparePaymentAmount,
  parsePaymentAmount,
} from "@/core/payment-engine";
import { createPaymentAllocationPolicyAdapter } from "@/modules/payments/adapters/payment-allocation-policy-adapter";
import {
  PAYMENT_ALLOCATION_NUMBER_PREFIX,
  PAYMENT_ALLOCATION_STATUS,
  PAYMENT_ALLOCATION_TARGET,
  PAYMENT_AUDIT_ACTIONS,
  PAYMENT_CUSTOMER_STATUS_MESSAGES,
  PAYMENT_IDEMPOTENCY_OPERATIONS,
  PAYMENT_STATUS_CODES,
  PAYMENT_STATUS_LABELS,
} from "@/modules/payments/constants";
import {
  PAYMENT_ERROR_CODES,
  PAYMENT_USER_MESSAGES,
  PaymentObligationError,
} from "@/modules/payments/errors";
import type {
  PaymentAllocationPolicyPort,
  PaymentAllocationRepositoryPort,
  PaymentAuditPort,
  PaymentIdempotencyRepositoryPort,
  PaymentLockPort,
  PaymentObligationRepositoryPort,
  PaymentTransactionRepositoryPort,
} from "@/modules/payments/ports";
import { createPaymentAllocationRepository } from "@/modules/payments/repositories/payment-allocation-repository";
import { createPaymentIdempotencyRepository } from "@/modules/payments/repositories/payment-idempotency-repository";
import { createPaymentObligationRepository } from "@/modules/payments/repositories/payment-obligation-repository";
import { createPaymentTransactionRepository } from "@/modules/payments/repositories/payment-transaction-repository";
import {
  isActiveAllocation,
  netAllocatedAmounts,
  planAllocation,
  sumAllocatedAmounts,
  unallocatedTransactionAmount,
} from "@/modules/payments/services/payment-allocation-rules";
import { createInProcessPaymentLock } from "@/modules/payments/services/payment-lock";
import { createPaymentAuditAdapter } from "@/modules/payments/services/payment-obligation-audit-helper";
import type {
  AdjustAllocationCommand,
  AllocatePaymentCommand,
  PaymentAllocationRecord,
  PaymentAllocationResult,
  PaymentAllocationView,
  PaymentObligationRecord,
  PaymentObligationView,
  PaymentTransactionRecord,
  PaymentTransactionView,
} from "@/modules/payments/types";

export type PaymentAllocationServiceDependencies = {
  obligations: PaymentObligationRepositoryPort;
  transactions: PaymentTransactionRepositoryPort;
  allocations: PaymentAllocationRepositoryPort;
  idempotency: PaymentIdempotencyRepositoryPort;
  policy: PaymentAllocationPolicyPort;
  locks: PaymentLockPort;
  audit: PaymentAuditPort;
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

export function toTransactionView(
  row: PaymentTransactionRecord,
  obligation: PaymentObligationRecord,
  allocatedAmount = "0",
  unallocatedAmount?: string
): PaymentTransactionView {
  return {
    id: row.id,
    transactionNumber: row.transactionNumber,
    businessId: row.businessId,
    obligationId: row.obligationId,
    obligationNumber: obligation.obligationNumber,
    orderNumber: obligation.orderNumber,
    customerId: obligation.customerId,
    amount: row.amount,
    currencyCode: row.currencyCode,
    methodId: row.methodId,
    methodName: row.methodName,
    networkId: row.networkId,
    networkName: row.networkName,
    providerId: row.providerId,
    providerName: row.providerName,
    channelId: row.channelId,
    channelName: row.channelName,
    status: row.status,
    statusLabel: PAYMENT_STATUS_LABELS[row.status] ?? row.status,
    customerMessage:
      PAYMENT_CUSTOMER_STATUS_MESSAGES[row.status] ??
      PAYMENT_STATUS_LABELS[row.status] ??
      row.status,
    captureMode: row.captureMode,
    providerTransactionReference: row.providerTransactionReference,
    initiatedAt: row.initiatedAt ? row.initiatedAt.toISOString() : null,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    failureCode: row.failureCode,
    failureReason: row.failureReason,
    outcomeMismatch: row.outcomeMismatch,
    allocatedAmount,
    unallocatedAmount:
      unallocatedAmount ?? unallocatedTransactionAmount(row.amount, allocatedAmount),
    createdAt: row.createdAt.toISOString(),
  };
}

function toAllocationView(
  row: PaymentAllocationRecord,
  transactionNumber: string
): PaymentAllocationView {
  return {
    id: row.id,
    allocationNumber: row.allocationNumber,
    paymentTransactionId: row.paymentTransactionId,
    transactionNumber,
    obligationId: row.obligationId,
    allocatedAmount: row.allocatedAmount,
    currencyCode: row.currencyCode,
    status: row.status,
    statusLabel: row.status === PAYMENT_ALLOCATION_STATUS.ALLOCATED ? "Applied" : "Corrected",
    createdAt: row.createdAt.toISOString(),
  };
}

export class PaymentAllocationService {
  constructor(private readonly deps: PaymentAllocationServiceDependencies) {}

  async allocate(
    context: CurrentBusinessContext,
    command: AllocatePaymentCommand
  ): Promise<PaymentAllocationResult> {
    this.assertContext(context);
    const transactionId = command.paymentTransactionId?.trim();
    if (!transactionId) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.INVALID_INPUT,
        PAYMENT_USER_MESSAGES.INVALID_INPUT,
        400,
        { field: "paymentTransactionId", entity: "payment" }
      );
    }

    const transaction = await this.requireTransaction(context, transactionId);
    const obligationId = (command.obligationId?.trim() || transaction.obligationId).trim();
    const obligation = await this.requireObligation(context, obligationId);
    this.assertSameTenant(context, transaction, obligation);
    if (transaction.obligationId !== obligation.id) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.ALLOCATION_NOT_ALLOWED,
        undefined,
        409
      );
    }

    const idempotencyKey = (
      command.idempotencyKey?.trim() ||
      `${PAYMENT_IDEMPOTENCY_OPERATIONS.ALLOCATE_PAYMENT}:${transaction.id}:${obligation.id}:${command.amount?.trim() || "auto"}`
    ).slice(0, 180);

    return this.deps.locks.runExclusive(
      `${context.businessId}:obligation:${obligation.id}`,
      () => this.allocateInsideLock(context, command, transaction.id, obligation.id, idempotencyKey)
    );
  }

  async allocateSuccessfulPayment(
    context: CurrentBusinessContext,
    transaction: PaymentTransactionRecord
  ): Promise<PaymentAllocationResult> {
    return this.allocate(context, {
      paymentTransactionId: transaction.id,
      obligationId: transaction.obligationId,
      idempotencyKey: `${PAYMENT_IDEMPOTENCY_OPERATIONS.ALLOCATE_PAYMENT}:${transaction.id}:auto`,
    });
  }

  async recordRefundEffect(
    context: CurrentBusinessContext,
    input: {
      transaction: PaymentTransactionRecord;
      refundId: string;
      amount: string;
      reason: string;
    }
  ): Promise<PaymentAllocationResult> {
    this.assertContext(context);
    return this.deps.locks.runExclusive(
      `${context.businessId}:obligation:${input.transaction.obligationId}`,
      () => this.recordRefundEffectInsideLock(context, input)
    );
  }

  async adjustAllocation(
    context: CurrentBusinessContext,
    command: AdjustAllocationCommand
  ): Promise<PaymentAllocationResult> {
    this.assertContext(context);
    const allocationId = command.allocationId?.trim();
    const reason = command.reason?.trim();
    if (!allocationId || !reason) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.INVALID_INPUT,
        PAYMENT_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }
    const existing = await this.deps.allocations.findById(context.businessId, allocationId);
    if (!existing) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.ALLOCATION_NOT_FOUND,
        undefined,
        404
      );
    }
    const idempotencyKey = (
      command.idempotencyKey?.trim() ||
      `${PAYMENT_IDEMPOTENCY_OPERATIONS.ADJUST_ALLOCATION}:${existing.id}`
    ).slice(0, 180);

    return this.deps.locks.runExclusive(
      `${context.businessId}:obligation:${existing.obligationId}`,
      () => this.adjustInsideLock(context, existing.id, reason, idempotencyKey)
    );
  }

  async listByObligation(context: CurrentBusinessContext, obligationId: string) {
    this.assertContext(context);
    return this.deps.allocations.listByObligation(context.businessId, obligationId);
  }

  async operationalSnapshot(businessId: string) {
    const [obligations, transactions, allocations] = await Promise.all([
      this.deps.obligations.listByBusiness(businessId),
      Promise.resolve([] as PaymentTransactionRecord[]),
      this.deps.allocations.listByBusiness(businessId),
    ]);
    void transactions;
    const txnList = await this.listAllTransactions(businessId, obligations);
    const partialCount = obligations.filter(
      (row) =>
        parsePaymentAmount(row.paidAmount) !== null &&
        (parsePaymentAmount(row.paidAmount) as number) > 0 &&
        parsePaymentAmount(row.outstandingAmount) !== null &&
        (parsePaymentAmount(row.outstandingAmount) as number) > 0
    ).length;
    const fullyPaidCount = obligations.filter((row) => {
      const outstanding = parsePaymentAmount(row.outstandingAmount);
      const paid = parsePaymentAmount(row.paidAmount);
      return outstanding !== null && outstanding <= 0 && paid !== null && paid > 0;
    }).length;
    const outstandingCount = obligations.filter((row) => {
      const outstanding = parsePaymentAmount(row.outstandingAmount);
      return outstanding !== null && outstanding > 0;
    }).length;
    const allocatedByTxn = new Map<string, string>();
    for (const row of allocations) {
      if (!isActiveAllocation(row)) {
        continue;
      }
      const current = allocatedByTxn.get(row.paymentTransactionId) ?? "0";
      allocatedByTxn.set(
        row.paymentTransactionId,
        addPaymentAmounts(current, row.allocatedAmount)
      );
    }
    const unallocatedPaymentCount = txnList.filter((row) => {
      if (row.status !== PAYMENT_STATUS_CODES.SUCCESSFUL) {
        return false;
      }
      const allocated = allocatedByTxn.get(row.id) ?? "0";
      return comparePaymentAmount(unallocatedTransactionAmount(row.amount, allocated), "0") > 0;
    }).length;
    const splitPaymentCount = obligations.filter((obligation) => {
      const successful = txnList.filter(
        (row) =>
          row.obligationId === obligation.id && row.status === PAYMENT_STATUS_CODES.SUCCESSFUL
      );
      return successful.length > 1;
    }).length;
    return {
      partialCount,
      fullyPaidCount,
      outstandingCount,
      unallocatedPaymentCount,
      splitPaymentCount,
    };
  }

  private async listAllTransactions(
    businessId: string,
    obligations: PaymentObligationRecord[]
  ): Promise<PaymentTransactionRecord[]> {
    const lists = await Promise.all(
      obligations.map((row) => this.deps.transactions.listByObligation(businessId, row.id))
    );
    return lists.flat();
  }

  private async allocateInsideLock(
    context: CurrentBusinessContext,
    command: AllocatePaymentCommand,
    transactionId: string,
    obligationId: string,
    idempotencyKey: string
  ): Promise<PaymentAllocationResult> {
    const duplicate = await this.deps.allocations.findByIdempotencyKey(
      context.businessId,
      idempotencyKey
    );
    if (duplicate) {
      const obligation = await this.requireObligation(context, duplicate.obligationId);
      const transaction = await this.requireTransaction(context, duplicate.paymentTransactionId);
      return this.toResult(duplicate, obligation, transaction);
    }

    const transaction = await this.requireTransaction(context, transactionId);
    const obligation = await this.requireObligation(context, obligationId);
    this.assertSameTenant(context, transaction, obligation);
    if (transaction.obligationId !== obligation.id) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.ALLOCATION_NOT_ALLOWED,
        undefined,
        409
      );
    }

    if (transaction.status !== PAYMENT_STATUS_CODES.SUCCESSFUL) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.ALLOCATION_NOT_ALLOWED,
        undefined,
        409
      );
    }
    if (
      transaction.currencyCode.trim().toUpperCase() !==
      obligation.currencyCode.trim().toUpperCase()
    ) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.ALLOCATION_CURRENCY_MISMATCH,
        undefined,
        409
      );
    }

    const policy = await this.deps.policy.getPolicy(context.businessId);
    const txnAllocations = await this.deps.allocations.listByTransaction(
      context.businessId,
      transaction.id
    );
    const obligationAllocations = await this.deps.allocations.listByObligation(
      context.businessId,
      obligation.id
    );
    const plan = planAllocation({
      amountDue: obligation.amountDue,
      allocatedToObligation: sumAllocatedAmounts(obligationAllocations),
      transactionAmount: transaction.amount,
      allocatedFromTransaction: sumAllocatedAmounts(txnAllocations),
      requestedAmount: command.amount ?? null,
      allowOverpayment: policy.allowOverpayment,
    });

    const snapshot = {
      amount: transaction.amount,
      currencyCode: transaction.currencyCode,
      methodId: transaction.methodId,
      networkId: transaction.networkId,
      providerId: transaction.providerId,
      channelId: transaction.channelId,
      providerTransactionReference: transaction.providerTransactionReference,
      status: transaction.status,
    };

    const allocationNumber = await this.generateAllocationNumber(context.businessId);
    const created = await this.deps.allocations.insert({
      businessId: context.businessId,
      obligationId: obligation.id,
      paymentTransactionId: transaction.id,
      allocationNumber,
      targetType: PAYMENT_ALLOCATION_TARGET.OBLIGATION,
      allocatedAmount: plan.allocateAmount,
      currencyCode: obligation.currencyCode,
      status: PAYMENT_ALLOCATION_STATUS.ALLOCATED,
      idempotencyKey,
      reason: command.reason?.trim() || null,
      metadata: { paymentSnapshot: snapshot },
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    await this.deps.idempotency.insert({
      businessId: context.businessId,
      idempotencyKey,
      operationType: PAYMENT_IDEMPOTENCY_OPERATIONS.ALLOCATE_PAYMENT,
      resourceType: "payment_allocation",
      resourceId: created.id,
      createdBy: context.platformUserId,
    }).catch((error) => {
      if (
        error instanceof PaymentObligationError &&
        error.code === PAYMENT_ERROR_CODES.IDEMPOTENCY_CONFLICT
      ) {
        return;
      }
      throw error;
    });

    const paymentStatus =
      parsePaymentAmount(plan.outstandingAmount) !== null &&
      (parsePaymentAmount(plan.outstandingAmount) as number) <= 0
        ? PAYMENT_STATUS_CODES.SUCCESSFUL
        : obligation.paymentStatus;

    const updatedObligation = await this.deps.obligations.update(context.businessId, obligation.id, {
      paidAmount: plan.paidAmount,
      outstandingAmount: plan.outstandingAmount,
      paymentStatus,
      updatedBy: context.platformUserId,
    });

    const unchanged = await this.requireTransaction(context, transaction.id);
    if (
      unchanged.amount !== snapshot.amount ||
      unchanged.currencyCode !== snapshot.currencyCode ||
      unchanged.providerTransactionReference !== snapshot.providerTransactionReference ||
      unchanged.methodId !== snapshot.methodId ||
      unchanged.networkId !== snapshot.networkId ||
      unchanged.providerId !== snapshot.providerId ||
      unchanged.channelId !== snapshot.channelId ||
      unchanged.status !== snapshot.status
    ) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.PROVIDER_ERROR,
        PAYMENT_USER_MESSAGES.PROVIDER_ERROR,
        500
      );
    }

    await this.audit(context, {
      action: PAYMENT_AUDIT_ACTIONS.ALLOCATION_CREATED,
      obligationId: obligation.id,
      paymentTransactionId: transaction.id,
      allocationId: created.id,
      outcome: "SUCCESS",
      references: {
        allocatedAmount: created.allocatedAmount,
        paidAmount: updatedObligation.paidAmount,
        outstandingAmount: updatedObligation.outstandingAmount,
        amountDue: updatedObligation.amountDue,
      },
    });
    await this.audit(context, {
      action: PAYMENT_AUDIT_ACTIONS.OBLIGATION_BALANCE_UPDATED,
      obligationId: obligation.id,
      paymentTransactionId: transaction.id,
      allocationId: created.id,
      outcome: "SUCCESS",
      references: {
        paidAmount: updatedObligation.paidAmount,
        outstandingAmount: updatedObligation.outstandingAmount,
      },
    });
    if (comparePaymentAmount(plan.unallocatedAfter, "0") > 0) {
      await this.audit(context, {
        action: PAYMENT_AUDIT_ACTIONS.UNALLOCATED_BALANCE_RECORDED,
        obligationId: obligation.id,
        paymentTransactionId: transaction.id,
        allocationId: created.id,
        outcome: "SUCCESS",
        references: {
          unallocatedAmount: plan.unallocatedAfter,
          amountDue: updatedObligation.amountDue,
        },
      });
    }

    return this.toResult(created, updatedObligation, unchanged);
  }

  private async adjustInsideLock(
    context: CurrentBusinessContext,
    allocationId: string,
    reason: string,
    idempotencyKey: string
  ): Promise<PaymentAllocationResult> {
    const duplicate = await this.deps.allocations.findByIdempotencyKey(
      context.businessId,
      idempotencyKey
    );
    if (duplicate) {
      const obligation = await this.requireObligation(context, duplicate.obligationId);
      const transaction = await this.requireTransaction(context, duplicate.paymentTransactionId);
      return this.toResult(duplicate, obligation, transaction);
    }

    const allocation = await this.deps.allocations.findById(context.businessId, allocationId);
    if (!allocation) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.ALLOCATION_NOT_FOUND,
        undefined,
        404
      );
    }
    if (allocation.status !== PAYMENT_ALLOCATION_STATUS.ALLOCATED) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.ALLOCATION_ALREADY_ADJUSTED,
        undefined,
        409
      );
    }

    const updated = await this.deps.allocations.update(context.businessId, allocation.id, {
      status: PAYMENT_ALLOCATION_STATUS.ADJUSTED,
      reason,
      updatedBy: context.platformUserId,
    });
    await this.deps.idempotency.insert({
      businessId: context.businessId,
      idempotencyKey,
      operationType: PAYMENT_IDEMPOTENCY_OPERATIONS.ADJUST_ALLOCATION,
      resourceType: "payment_allocation",
      resourceId: updated.id,
      createdBy: context.platformUserId,
    }).catch((error) => {
      if (
        error instanceof PaymentObligationError &&
        error.code === PAYMENT_ERROR_CODES.IDEMPOTENCY_CONFLICT
      ) {
        return;
      }
      throw error;
    });

    const obligationAllocations = await this.deps.allocations.listByObligation(
      context.businessId,
      allocation.obligationId
    );
    const obligation = await this.requireObligation(context, allocation.obligationId);
    const paidAmount = sumAllocatedAmounts(obligationAllocations);
    const outstandingScaled = parsePaymentAmount(obligation.amountDue);
    const paidScaled = parsePaymentAmount(paidAmount);
    const outstandingAmount =
      outstandingScaled !== null && paidScaled !== null && paidScaled > outstandingScaled
        ? "0"
        : unallocatedTransactionAmount(obligation.amountDue, paidAmount);
    const paymentStatus =
      parsePaymentAmount(outstandingAmount) !== null &&
      (parsePaymentAmount(outstandingAmount) as number) <= 0
        ? PAYMENT_STATUS_CODES.SUCCESSFUL
        : PAYMENT_STATUS_CODES.NOT_STARTED;

    const updatedObligation = await this.deps.obligations.update(
      context.businessId,
      obligation.id,
      {
        paidAmount,
        outstandingAmount,
        paymentStatus,
        updatedBy: context.platformUserId,
      }
    );
    const transaction = await this.requireTransaction(context, allocation.paymentTransactionId);

    await this.audit(context, {
      action: PAYMENT_AUDIT_ACTIONS.ALLOCATION_ADJUSTED,
      obligationId: obligation.id,
      paymentTransactionId: transaction.id,
      allocationId: updated.id,
      outcome: "SUCCESS",
      references: {
        reason,
        previousAmount: allocation.allocatedAmount,
        paidAmount: updatedObligation.paidAmount,
        outstandingAmount: updatedObligation.outstandingAmount,
      },
    });

    return this.toResult(updated, updatedObligation, transaction);
  }

  private async recordRefundEffectInsideLock(
    context: CurrentBusinessContext,
    input: {
      transaction: PaymentTransactionRecord;
      refundId: string;
      amount: string;
      reason: string;
    }
  ): Promise<PaymentAllocationResult> {
    const transaction = await this.requireTransaction(context, input.transaction.id);
    const obligation = await this.requireObligation(context, transaction.obligationId);
    this.assertSameTenant(context, transaction, obligation);
    const snapshot = {
      amount: transaction.amount,
      currencyCode: transaction.currencyCode,
      status: transaction.status,
      providerTransactionReference: transaction.providerTransactionReference,
    };
    const idempotencyKey =
      `${PAYMENT_IDEMPOTENCY_OPERATIONS.ALLOCATE_PAYMENT}:refund:${input.refundId}`.slice(0, 180);
    const existing = await this.deps.allocations.findByIdempotencyKey(
      context.businessId,
      idempotencyKey
    );
    if (existing) {
      return this.toResult(existing, obligation, transaction);
    }

    const allocationNumber = await this.generateAllocationNumber(context.businessId);
    const created = await this.deps.allocations.insert({
      businessId: context.businessId,
      obligationId: obligation.id,
      paymentTransactionId: transaction.id,
      allocationNumber,
      targetType: PAYMENT_ALLOCATION_TARGET.OBLIGATION,
      allocatedAmount: input.amount,
      currencyCode: obligation.currencyCode,
      status: PAYMENT_ALLOCATION_STATUS.REFUND,
      idempotencyKey,
      reason: input.reason,
      metadata: { refundId: input.refundId, originalPaymentSnapshot: snapshot },
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });
    await this.deps.idempotency
      .insert({
        businessId: context.businessId,
        idempotencyKey,
        operationType: PAYMENT_IDEMPOTENCY_OPERATIONS.ALLOCATE_PAYMENT,
        resourceType: "payment_allocation",
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

    const obligationAllocations = await this.deps.allocations.listByObligation(
      context.businessId,
      obligation.id
    );
    const paidAmount = netAllocatedAmounts(obligationAllocations);
    const outstandingAmount = unallocatedTransactionAmount(obligation.amountDue, paidAmount);
    const updatedObligation = await this.deps.obligations.update(
      context.businessId,
      obligation.id,
      {
        paidAmount,
        outstandingAmount,
        updatedBy: context.platformUserId,
      }
    );
    const unchanged = await this.requireTransaction(context, transaction.id);
    if (
      unchanged.amount !== snapshot.amount ||
      unchanged.currencyCode !== snapshot.currencyCode ||
      unchanged.status !== snapshot.status ||
      unchanged.providerTransactionReference !== snapshot.providerTransactionReference
    ) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.PROVIDER_ERROR,
        PAYMENT_USER_MESSAGES.PROVIDER_ERROR,
        500
      );
    }
    await this.audit(context, {
      action: PAYMENT_AUDIT_ACTIONS.OBLIGATION_BALANCE_UPDATED,
      obligationId: obligation.id,
      paymentTransactionId: transaction.id,
      allocationId: created.id,
      outcome: "SUCCESS",
      references: {
        refundId: input.refundId,
        paidAmount: updatedObligation.paidAmount,
        outstandingAmount: updatedObligation.outstandingAmount,
        amountDue: updatedObligation.amountDue,
      },
    });
    return this.toResult(created, updatedObligation, unchanged);
  }

  private async toResult(
    allocation: PaymentAllocationRecord,
    obligation: PaymentObligationRecord,
    transaction: PaymentTransactionRecord
  ): Promise<PaymentAllocationResult> {
    const txnAllocations = await this.deps.allocations.listByTransaction(
      obligation.businessId,
      transaction.id
    );
    const allocatedAmount = sumAllocatedAmounts(txnAllocations);
    return {
      allocation: toAllocationView(allocation, transaction.transactionNumber),
      obligation: toObligationView(obligation),
      transaction: toTransactionView(transaction, obligation, allocatedAmount),
      unallocatedAmount: unallocatedTransactionAmount(transaction.amount, allocatedAmount),
    };
  }

  private async generateAllocationNumber(businessId: string): Promise<string> {
    const count = await this.deps.allocations.countAll(businessId);
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = `${PAYMENT_ALLOCATION_NUMBER_PREFIX}-${String(count + 1 + attempt).padStart(6, "0")}`;
      const existing = await this.deps.allocations.findByAllocationNumber(
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

  private assertSameTenant(
    context: CurrentBusinessContext,
    transaction: PaymentTransactionRecord,
    obligation: PaymentObligationRecord
  ): void {
    if (
      transaction.businessId !== context.businessId ||
      obligation.businessId !== context.businessId ||
      transaction.businessId !== obligation.businessId
    ) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.CROSS_BUSINESS_ACCESS,
        undefined,
        403
      );
    }
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
      allocationId?: string | null;
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
        allocationId: entry.allocationId,
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

export function createDefaultPaymentAllocationDependencies(): PaymentAllocationServiceDependencies {
  return {
    obligations: createPaymentObligationRepository(),
    transactions: createPaymentTransactionRepository(),
    allocations: createPaymentAllocationRepository(),
    idempotency: createPaymentIdempotencyRepository(),
    policy: createPaymentAllocationPolicyAdapter(false),
    locks: createInProcessPaymentLock(),
    audit: createPaymentAuditAdapter(),
  };
}

export function createPaymentAllocationService(deps?: PaymentAllocationServiceDependencies) {
  return new PaymentAllocationService(deps ?? createDefaultPaymentAllocationDependencies());
}
