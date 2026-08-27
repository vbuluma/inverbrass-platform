/**
 * Purpose:
 * Persist tenant-scoped payment exceptions.
 *
 * Implementation Package:
 * BP-007 / IP-08 – Payment Exceptions, Operations & Controls
 */

import { and, desc, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { paymentException } from "@/db/schema/payment-exception";
import { PAYMENT_EXCEPTION_STATUSES } from "@/modules/payments/constants";
import { PAYMENT_ERROR_CODES, PaymentObligationError } from "@/modules/payments/errors";
import type { PaymentExceptionRepositoryPort } from "@/modules/payments/ports";
import type {
  PaymentExceptionInsert,
  PaymentExceptionListFilter,
  PaymentExceptionPatch,
  PaymentExceptionRecord,
} from "@/modules/payments/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapException(row: typeof paymentException.$inferSelect): PaymentExceptionRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    exceptionNumber: row.exceptionNumber,
    numberingPolicyId: row.numberingPolicyId,
    paymentTransactionId: row.paymentTransactionId,
    paymentObligationId: row.paymentObligationId,
    exceptionType: row.exceptionType,
    severity: row.severity,
    status: row.status,
    reason: row.reason,
    detectedAt: row.detectedAt,
    detectedBy: row.detectedBy,
    assignedTo: row.assignedTo,
    resolvedBy: row.resolvedBy,
    resolutionCode: row.resolutionCode,
    resolutionNotes: row.resolutionNotes,
    resolutionEvidence: row.resolutionEvidence,
    approvalStatus: row.approvalStatus,
    requestedBy: row.requestedBy,
    approvedBy: row.approvedBy,
    proposedResolutionCode: row.proposedResolutionCode,
    proposedResolutionNotes: row.proposedResolutionNotes,
    retryOfTransactionId: row.retryOfTransactionId,
    idempotencyKey: row.idempotencyKey,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

export function createPaymentExceptionRepository(
  db: DbClient = getDb()
): PaymentExceptionRepositoryPort {
  return {
    async insert(values: PaymentExceptionInsert) {
      try {
        const [row] = await db
          .insert(paymentException)
          .values({
            id: values.id,
            businessId: values.businessId,
            exceptionNumber: values.exceptionNumber,
            numberingPolicyId: values.numberingPolicyId,
            paymentTransactionId: values.paymentTransactionId,
            paymentObligationId: values.paymentObligationId,
            exceptionType: values.exceptionType,
            severity: values.severity,
            status: values.status,
            reason: values.reason,
            detectedAt: values.detectedAt,
            detectedBy: values.detectedBy,
            assignedTo: values.assignedTo,
            resolvedBy: values.resolvedBy,
            resolutionCode: values.resolutionCode,
            resolutionNotes: values.resolutionNotes,
            resolutionEvidence: values.resolutionEvidence,
            approvalStatus: values.approvalStatus,
            requestedBy: values.requestedBy,
            approvedBy: values.approvedBy,
            proposedResolutionCode: values.proposedResolutionCode,
            proposedResolutionNotes: values.proposedResolutionNotes,
            retryOfTransactionId: values.retryOfTransactionId,
            idempotencyKey: values.idempotencyKey,
            metadata: values.metadata,
            createdBy: values.createdBy,
            updatedBy: values.updatedBy,
          })
          .returning();
        if (!row) {
          throw new PaymentObligationError(PAYMENT_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
        }
        return mapException(row);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (
          message.includes("payment_exception_business_idempotency_uidx") ||
          message.includes("payment_exception_open_type_uidx") ||
          message.includes("payment_exception_business_number_uidx")
        ) {
          throw new PaymentObligationError(
            PAYMENT_ERROR_CODES.IDEMPOTENCY_CONFLICT,
            undefined,
            409
          );
        }
        throw error;
      }
    },

    async update(businessId, exceptionId, patch: PaymentExceptionPatch) {
      const [row] = await db
        .update(paymentException)
        .set({
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.severity !== undefined ? { severity: patch.severity } : {}),
          ...(patch.assignedTo !== undefined ? { assignedTo: patch.assignedTo } : {}),
          ...(patch.resolvedBy !== undefined ? { resolvedBy: patch.resolvedBy } : {}),
          ...(patch.resolutionCode !== undefined
            ? { resolutionCode: patch.resolutionCode }
            : {}),
          ...(patch.resolutionNotes !== undefined
            ? { resolutionNotes: patch.resolutionNotes }
            : {}),
          ...(patch.resolutionEvidence !== undefined
            ? { resolutionEvidence: patch.resolutionEvidence }
            : {}),
          ...(patch.approvalStatus !== undefined
            ? { approvalStatus: patch.approvalStatus }
            : {}),
          ...(patch.requestedBy !== undefined ? { requestedBy: patch.requestedBy } : {}),
          ...(patch.approvedBy !== undefined ? { approvedBy: patch.approvedBy } : {}),
          ...(patch.proposedResolutionCode !== undefined
            ? { proposedResolutionCode: patch.proposedResolutionCode }
            : {}),
          ...(patch.proposedResolutionNotes !== undefined
            ? { proposedResolutionNotes: patch.proposedResolutionNotes }
            : {}),
          ...(patch.retryOfTransactionId !== undefined
            ? { retryOfTransactionId: patch.retryOfTransactionId }
            : {}),
          ...(patch.metadata !== undefined ? { metadata: patch.metadata } : {}),
          ...(patch.updatedBy !== undefined ? { updatedBy: patch.updatedBy } : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(paymentException.businessId, businessId),
            eq(paymentException.id, exceptionId)
          )
        )
        .returning();
      if (!row) {
        throw new PaymentObligationError(
          PAYMENT_ERROR_CODES.EXCEPTION_NOT_FOUND,
          undefined,
          404
        );
      }
      return mapException(row);
    },

    async findById(businessId, exceptionId) {
      const [row] = await db
        .select()
        .from(paymentException)
        .where(
          and(
            eq(paymentException.businessId, businessId),
            eq(paymentException.id, exceptionId)
          )
        )
        .limit(1);
      return row ? mapException(row) : null;
    },

    async findByIdempotencyKey(businessId, idempotencyKey) {
      const [row] = await db
        .select()
        .from(paymentException)
        .where(
          and(
            eq(paymentException.businessId, businessId),
            eq(paymentException.idempotencyKey, idempotencyKey)
          )
        )
        .limit(1);
      return row ? mapException(row) : null;
    },

    async findOpenByTransactionAndType(businessId, paymentTransactionId, exceptionType) {
      const [row] = await db
        .select()
        .from(paymentException)
        .where(
          and(
            eq(paymentException.businessId, businessId),
            eq(paymentException.paymentTransactionId, paymentTransactionId),
            eq(paymentException.exceptionType, exceptionType),
            inArray(paymentException.status, [
              PAYMENT_EXCEPTION_STATUSES.OPEN,
              PAYMENT_EXCEPTION_STATUSES.INVESTIGATING,
            ])
          )
        )
        .limit(1);
      return row ? mapException(row) : null;
    },

    async listByTransaction(businessId, paymentTransactionId) {
      const rows = await db
        .select()
        .from(paymentException)
        .where(
          and(
            eq(paymentException.businessId, businessId),
            eq(paymentException.paymentTransactionId, paymentTransactionId)
          )
        )
        .orderBy(desc(paymentException.createdAt));
      return rows.map(mapException);
    },

    async listByObligation(businessId, obligationId) {
      const rows = await db
        .select()
        .from(paymentException)
        .where(
          and(
            eq(paymentException.businessId, businessId),
            eq(paymentException.paymentObligationId, obligationId)
          )
        )
        .orderBy(desc(paymentException.createdAt));
      return rows.map(mapException);
    },

    async listByBusiness(businessId, filter?: PaymentExceptionListFilter) {
      const rows = await db
        .select()
        .from(paymentException)
        .where(eq(paymentException.businessId, businessId))
        .orderBy(desc(paymentException.createdAt));
      void filter;
      return rows.map(mapException);
    },
  };
}
