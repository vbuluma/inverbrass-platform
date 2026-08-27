/**
 * Purpose:
 * Persist refund/reversal transactions with tenant isolation.
 *
 * Implementation Package:
 * BP-007 / IP-06 – Refunds, Reversals & Adjustments
 */

import { and, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { paymentRefund } from "@/db/schema/payment-refund";
import { PAYMENT_ERROR_CODES, PaymentObligationError } from "@/modules/payments/errors";
import type { PaymentRefundRepositoryPort } from "@/modules/payments/ports";
import type {
  PaymentRefundInsert,
  PaymentRefundPatch,
  PaymentRefundRecord,
} from "@/modules/payments/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapRefund(row: typeof paymentRefund.$inferSelect): PaymentRefundRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    refundNumber: row.refundNumber,
    numberingPolicyId: row.numberingPolicyId,
    originalPaymentTransactionId: row.originalPaymentTransactionId,
    originalPaymentReference: row.originalPaymentReference,
    paymentObligationId: row.paymentObligationId,
    originalReceiptId: row.originalReceiptId,
    originatingFinancialInstructionId: row.originatingFinancialInstructionId,
    invoiceId: row.invoiceId,
    refundType: row.refundType,
    amount: String(row.amount),
    currencyCode: row.currencyCode,
    methodId: row.methodId,
    networkId: row.networkId,
    providerId: row.providerId,
    channelId: row.channelId,
    methodName: row.methodName,
    networkName: row.networkName,
    providerName: row.providerName,
    channelName: row.channelName,
    status: row.status,
    reason: row.reason,
    providerRefundReference: row.providerRefundReference,
    idempotencyKey: row.idempotencyKey,
    requestedBy: row.requestedBy,
    approvedBy: row.approvedBy,
    initiatedAt: row.initiatedAt,
    completedAt: row.completedAt,
    failureCode: row.failureCode,
    failureReason: row.failureReason,
    providerMetadata: (row.providerMetadata as Record<string, unknown> | null) ?? null,
    documentId: row.documentId,
    documentStorageKey: row.documentStorageKey,
    documentStatus: row.documentStatus,
    captureMode: row.captureMode,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

export function createPaymentRefundRepository(
  db: DbClient = getDb()
): PaymentRefundRepositoryPort {
  return {
    async insert(values: PaymentRefundInsert) {
      try {
        const [row] = await db
          .insert(paymentRefund)
          .values({
            id: values.id,
            businessId: values.businessId,
            refundNumber: values.refundNumber,
            numberingPolicyId: values.numberingPolicyId,
            originalPaymentTransactionId: values.originalPaymentTransactionId,
            originalPaymentReference: values.originalPaymentReference,
            paymentObligationId: values.paymentObligationId,
            originalReceiptId: values.originalReceiptId,
            originatingFinancialInstructionId: values.originatingFinancialInstructionId,
            invoiceId: values.invoiceId,
            refundType: values.refundType,
            amount: values.amount,
            currencyCode: values.currencyCode,
            methodId: values.methodId,
            networkId: values.networkId,
            providerId: values.providerId,
            channelId: values.channelId,
            methodName: values.methodName,
            networkName: values.networkName,
            providerName: values.providerName,
            channelName: values.channelName,
            status: values.status,
            reason: values.reason,
            providerRefundReference: values.providerRefundReference,
            idempotencyKey: values.idempotencyKey,
            requestedBy: values.requestedBy,
            approvedBy: values.approvedBy,
            initiatedAt: values.initiatedAt,
            completedAt: values.completedAt,
            failureCode: values.failureCode,
            failureReason: values.failureReason,
            providerMetadata: values.providerMetadata,
            documentId: values.documentId,
            documentStorageKey: values.documentStorageKey,
            documentStatus: values.documentStatus,
            captureMode: values.captureMode,
            metadata: values.metadata,
            createdBy: values.createdBy,
            updatedBy: values.updatedBy,
          })
          .returning();
        if (!row) {
          throw new PaymentObligationError(PAYMENT_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
        }
        return mapRefund(row);
      } catch (error) {
        if (error instanceof PaymentObligationError) {
          throw error;
        }
        throw new PaymentObligationError(
          PAYMENT_ERROR_CODES.IDEMPOTENCY_CONFLICT,
          undefined,
          409
        );
      }
    },

    async update(businessId, refundId, patch: PaymentRefundPatch) {
      const [row] = await db
        .update(paymentRefund)
        .set({
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.approvedBy !== undefined ? { approvedBy: patch.approvedBy } : {}),
          ...(patch.initiatedAt !== undefined ? { initiatedAt: patch.initiatedAt } : {}),
          ...(patch.completedAt !== undefined ? { completedAt: patch.completedAt } : {}),
          ...(patch.failureCode !== undefined ? { failureCode: patch.failureCode } : {}),
          ...(patch.failureReason !== undefined ? { failureReason: patch.failureReason } : {}),
          ...(patch.providerRefundReference !== undefined
            ? { providerRefundReference: patch.providerRefundReference }
            : {}),
          ...(patch.providerMetadata !== undefined
            ? { providerMetadata: patch.providerMetadata }
            : {}),
          ...(patch.documentId !== undefined ? { documentId: patch.documentId } : {}),
          ...(patch.documentStorageKey !== undefined
            ? { documentStorageKey: patch.documentStorageKey }
            : {}),
          ...(patch.documentStatus !== undefined ? { documentStatus: patch.documentStatus } : {}),
          ...(patch.metadata !== undefined ? { metadata: patch.metadata } : {}),
          updatedBy: patch.updatedBy ?? null,
          updatedAt: new Date(),
        })
        .where(and(eq(paymentRefund.id, refundId), eq(paymentRefund.businessId, businessId)))
        .returning();
      if (!row) {
        throw new PaymentObligationError(PAYMENT_ERROR_CODES.REFUND_NOT_FOUND, undefined, 404);
      }
      return mapRefund(row);
    },

    async findById(businessId, refundId) {
      const [row] = await db
        .select()
        .from(paymentRefund)
        .where(and(eq(paymentRefund.id, refundId), eq(paymentRefund.businessId, businessId)))
        .limit(1);
      return row ? mapRefund(row) : null;
    },

    async findByIdempotencyKey(businessId, idempotencyKey) {
      const [row] = await db
        .select()
        .from(paymentRefund)
        .where(
          and(
            eq(paymentRefund.businessId, businessId),
            eq(paymentRefund.idempotencyKey, idempotencyKey)
          )
        )
        .limit(1);
      return row ? mapRefund(row) : null;
    },

    async listByTransaction(businessId, originalPaymentTransactionId) {
      const rows = await db
        .select()
        .from(paymentRefund)
        .where(
          and(
            eq(paymentRefund.businessId, businessId),
            eq(paymentRefund.originalPaymentTransactionId, originalPaymentTransactionId)
          )
        )
        .orderBy(desc(paymentRefund.createdAt));
      return rows.map(mapRefund);
    },

    async listByObligation(businessId, obligationId) {
      const rows = await db
        .select()
        .from(paymentRefund)
        .where(
          and(
            eq(paymentRefund.businessId, businessId),
            eq(paymentRefund.paymentObligationId, obligationId)
          )
        )
        .orderBy(desc(paymentRefund.createdAt));
      return rows.map(mapRefund);
    },

    async listByBusiness(businessId) {
      const rows = await db
        .select()
        .from(paymentRefund)
        .where(eq(paymentRefund.businessId, businessId))
        .orderBy(desc(paymentRefund.createdAt));
      return rows.map(mapRefund);
    },
  };
}
