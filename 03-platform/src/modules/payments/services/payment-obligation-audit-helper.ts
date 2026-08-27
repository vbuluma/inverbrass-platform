/**
 * Purpose:
 * Record BP-007 payment-obligation audit events through ENG-013.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

import {
  AUDIT_ENTITY_NAMES,
  AUDIT_OPERATIONS,
  AUDIT_SOURCE_MODULES,
  buildAuditRecordFromContext,
  createAuditService,
  createFieldChanges,
  type AuditService,
} from "@/core/audit";
import type { CurrentBusinessContext } from "@/core/auth/types";
import { PAYMENT_AUDIT_ACTIONS } from "@/modules/payments/constants";
import type { PaymentAuditPort } from "@/modules/payments/ports";
import type { PaymentAuditRecord } from "@/modules/payments/types";

function operationForAction(action: string, outcome: string): string {
  if (action === PAYMENT_AUDIT_ACTIONS.OBLIGATION_CREATED && outcome === "SUCCESS") {
    return AUDIT_OPERATIONS.CREATE;
  }
  return AUDIT_OPERATIONS.UPDATE;
}

export class PaymentAuditAdapter implements PaymentAuditPort {
  constructor(private readonly auditService: AuditService = createAuditService()) {}

  async record(entry: PaymentAuditRecord): Promise<void> {
    const context: CurrentBusinessContext = {
      businessId: entry.businessId,
      platformUserId: entry.actorUserId ?? "",
      businessMembershipId: "",
    };
    await this.auditService.record(
      buildAuditRecordFromContext(context, {
        entityName:         entry.exceptionId
          ? AUDIT_ENTITY_NAMES.PAYMENT_EXCEPTION
          : entry.receiptId
          ? AUDIT_ENTITY_NAMES.PAYMENT_RECEIPT
          : entry.settlementId
            ? AUDIT_ENTITY_NAMES.PAYMENT_SETTLEMENT
          : entry.refundId
            ? AUDIT_ENTITY_NAMES.PAYMENT_REFUND
            : entry.invoiceId
          ? AUDIT_ENTITY_NAMES.PAYMENT_INVOICE
          : entry.allocationId
            ? AUDIT_ENTITY_NAMES.PAYMENT_ALLOCATION
            : entry.paymentTransactionId
              ? AUDIT_ENTITY_NAMES.PAYMENT_TRANSACTION
              : AUDIT_ENTITY_NAMES.PAYMENT_OBLIGATION,
        entityId:
          entry.exceptionId ??
          entry.receiptId ??
          entry.settlementId ??
          entry.refundId ??
          entry.invoiceId ??
          entry.allocationId ??
          entry.paymentTransactionId ??
          entry.obligationId ??
          entry.businessId,
        operation: operationForAction(entry.action, entry.outcome),
        sourceModule: AUDIT_SOURCE_MODULES.PAYMENTS,
        changes: createFieldChanges({
          action: entry.action,
          outcome: entry.outcome,
          ...(entry.references ?? {}),
        }),
        metadata: {
          action: entry.action,
          outcome: entry.outcome,
          obligationId: entry.obligationId,
          paymentTransactionId: entry.paymentTransactionId,
          allocationId: entry.allocationId,
          invoiceId: entry.invoiceId,
          receiptId: entry.receiptId,
          refundId: entry.refundId,
          settlementId: entry.settlementId,
          exceptionId: entry.exceptionId,
          ...(entry.references ?? {}),
        },
      })
    );
  }
}

export function createPaymentAuditAdapter() {
  return new PaymentAuditAdapter();
}

export class RecordingPaymentAudit implements PaymentAuditPort {
  readonly entries: PaymentAuditRecord[] = [];

  async record(entry: PaymentAuditRecord): Promise<void> {
    this.entries.push({
      ...entry,
      timestamp: entry.timestamp ?? new Date().toISOString(),
    });
  }
}
