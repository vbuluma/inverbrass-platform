/**
 * Purpose:
 * Persist payment settlement records with tenant isolation.
 *
 * Implementation Package:
 * BP-007 / IP-07 – Settlement & Reconciliation Handoff
 */

import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { paymentSettlement } from "@/db/schema/payment-settlement";
import { PAYMENT_ERROR_CODES, PaymentObligationError } from "@/modules/payments/errors";
import type { PaymentSettlementRepositoryPort } from "@/modules/payments/ports";
import type {
  PaymentSettlementInsert,
  PaymentSettlementPatch,
  PaymentSettlementRecord,
} from "@/modules/payments/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapSettlement(row: typeof paymentSettlement.$inferSelect): PaymentSettlementRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    paymentTransactionId: row.paymentTransactionId,
    paymentObligationId: row.paymentObligationId,
    settlementStatus: row.settlementStatus,
    expectedAmount: String(row.expectedAmount),
    receivedAmount: row.receivedAmount == null ? null : String(row.receivedAmount),
    varianceAmount: row.varianceAmount == null ? null : String(row.varianceAmount),
    currencyCode: row.currencyCode,
    settlementReference: row.settlementReference,
    settlementBatchReference: row.settlementBatchReference,
    settlementDate: row.settlementDate,
    receivedAt: row.receivedAt,
    confirmedAt: row.confirmedAt,
    methodId: row.methodId,
    networkId: row.networkId,
    providerId: row.providerId,
    channelId: row.channelId,
    methodName: row.methodName,
    networkName: row.networkName,
    providerName: row.providerName,
    channelName: row.channelName,
    providerTransactionReference: row.providerTransactionReference,
    providerSettlementMetadata:
      (row.providerSettlementMetadata as Record<string, unknown> | null) ?? null,
    exceptionFlag: row.exceptionFlag,
    exceptionCode: row.exceptionCode,
    exceptionReason: row.exceptionReason,
    idempotencyKey: row.idempotencyKey,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

export function createPaymentSettlementRepository(
  db: DbClient = getDb()
): PaymentSettlementRepositoryPort {
  return {
    async insert(values: PaymentSettlementInsert) {
      try {
        const [row] = await db
          .insert(paymentSettlement)
          .values({
            id: values.id,
            businessId: values.businessId,
            paymentTransactionId: values.paymentTransactionId,
            paymentObligationId: values.paymentObligationId,
            settlementStatus: values.settlementStatus,
            expectedAmount: values.expectedAmount,
            receivedAmount: values.receivedAmount,
            varianceAmount: values.varianceAmount,
            currencyCode: values.currencyCode,
            settlementReference: values.settlementReference,
            settlementBatchReference: values.settlementBatchReference,
            settlementDate: values.settlementDate,
            receivedAt: values.receivedAt,
            confirmedAt: values.confirmedAt,
            methodId: values.methodId,
            networkId: values.networkId,
            providerId: values.providerId,
            channelId: values.channelId,
            methodName: values.methodName,
            networkName: values.networkName,
            providerName: values.providerName,
            channelName: values.channelName,
            providerTransactionReference: values.providerTransactionReference,
            providerSettlementMetadata: values.providerSettlementMetadata,
            exceptionFlag: values.exceptionFlag,
            exceptionCode: values.exceptionCode,
            exceptionReason: values.exceptionReason,
            idempotencyKey: values.idempotencyKey,
            metadata: values.metadata,
            createdBy: values.createdBy,
            updatedBy: values.updatedBy,
          })
          .returning();
        if (!row) {
          throw new PaymentObligationError(PAYMENT_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
        }
        return mapSettlement(row);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (
          message.includes("payment_settlement_business_transaction_uidx") ||
          message.includes("payment_settlement_business_idempotency_uidx") ||
          message.includes("payment_settlement_business_reference_uidx")
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

    async update(businessId, settlementId, patch: PaymentSettlementPatch) {
      const [row] = await db
        .update(paymentSettlement)
        .set({
          ...(patch.settlementStatus !== undefined
            ? { settlementStatus: patch.settlementStatus }
            : {}),
          ...(patch.receivedAmount !== undefined ? { receivedAmount: patch.receivedAmount } : {}),
          ...(patch.varianceAmount !== undefined ? { varianceAmount: patch.varianceAmount } : {}),
          ...(patch.settlementReference !== undefined
            ? { settlementReference: patch.settlementReference }
            : {}),
          ...(patch.settlementBatchReference !== undefined
            ? { settlementBatchReference: patch.settlementBatchReference }
            : {}),
          ...(patch.settlementDate !== undefined ? { settlementDate: patch.settlementDate } : {}),
          ...(patch.receivedAt !== undefined ? { receivedAt: patch.receivedAt } : {}),
          ...(patch.confirmedAt !== undefined ? { confirmedAt: patch.confirmedAt } : {}),
          ...(patch.providerSettlementMetadata !== undefined
            ? { providerSettlementMetadata: patch.providerSettlementMetadata }
            : {}),
          ...(patch.exceptionFlag !== undefined ? { exceptionFlag: patch.exceptionFlag } : {}),
          ...(patch.exceptionCode !== undefined ? { exceptionCode: patch.exceptionCode } : {}),
          ...(patch.exceptionReason !== undefined
            ? { exceptionReason: patch.exceptionReason }
            : {}),
          ...(patch.metadata !== undefined ? { metadata: patch.metadata } : {}),
          ...(patch.updatedBy !== undefined ? { updatedBy: patch.updatedBy } : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(paymentSettlement.businessId, businessId),
            eq(paymentSettlement.id, settlementId)
          )
        )
        .returning();
      if (!row) {
        throw new PaymentObligationError(
          PAYMENT_ERROR_CODES.SETTLEMENT_NOT_FOUND,
          undefined,
          404
        );
      }
      return mapSettlement(row);
    },

    async findById(businessId, settlementId) {
      const [row] = await db
        .select()
        .from(paymentSettlement)
        .where(
          and(
            eq(paymentSettlement.businessId, businessId),
            eq(paymentSettlement.id, settlementId)
          )
        )
        .limit(1);
      return row ? mapSettlement(row) : null;
    },

    async findByTransaction(businessId, paymentTransactionId) {
      const [row] = await db
        .select()
        .from(paymentSettlement)
        .where(
          and(
            eq(paymentSettlement.businessId, businessId),
            eq(paymentSettlement.paymentTransactionId, paymentTransactionId)
          )
        )
        .limit(1);
      return row ? mapSettlement(row) : null;
    },

    async findByIdempotencyKey(businessId, idempotencyKey) {
      const [row] = await db
        .select()
        .from(paymentSettlement)
        .where(
          and(
            eq(paymentSettlement.businessId, businessId),
            eq(paymentSettlement.idempotencyKey, idempotencyKey)
          )
        )
        .limit(1);
      return row ? mapSettlement(row) : null;
    },

    async findBySettlementReference(businessId, settlementReference) {
      const [row] = await db
        .select()
        .from(paymentSettlement)
        .where(
          and(
            eq(paymentSettlement.businessId, businessId),
            eq(paymentSettlement.settlementReference, settlementReference)
          )
        )
        .limit(1);
      return row ? mapSettlement(row) : null;
    },
  };
}
