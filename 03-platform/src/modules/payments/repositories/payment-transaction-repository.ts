/**
 * Purpose:
 * Persist payment transactions with tenant isolation.
 *
 * Implementation Package:
 * BP-007 / IP-02 – Payment Initiation & Processing
 */

import { and, desc, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { paymentTransaction } from "@/db/schema/payment-transaction";
import { PAYMENT_ERROR_CODES, PaymentObligationError } from "@/modules/payments/errors";
import type { PaymentTransactionRepositoryPort } from "@/modules/payments/ports";
import type {
  PaymentTransactionInsert,
  PaymentTransactionPatch,
  PaymentTransactionRecord,
} from "@/modules/payments/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapRow(row: typeof paymentTransaction.$inferSelect): PaymentTransactionRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    obligationId: row.obligationId,
    transactionNumber: row.transactionNumber,
    methodId: row.methodId,
    networkId: row.networkId,
    providerId: row.providerId,
    channelId: row.channelId,
    methodName: row.methodName,
    networkName: row.networkName,
    providerName: row.providerName,
    channelName: row.channelName,
    amount: String(row.amount),
    currencyCode: row.currencyCode,
    status: row.status,
    captureMode: row.captureMode,
    providerTransactionReference: row.providerTransactionReference,
    idempotencyKey: row.idempotencyKey,
    initiatedAt: row.initiatedAt,
    completedAt: row.completedAt,
    failureCode: row.failureCode,
    failureReason: row.failureReason,
    providerResponseMetadata:
      (row.providerResponseMetadata as Record<string, unknown> | null) ?? null,
    outcomeMismatch: row.outcomeMismatch,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

export class PaymentTransactionRepository implements PaymentTransactionRepositoryPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: PaymentTransactionInsert): Promise<PaymentTransactionRecord> {
    try {
      const [row] = await this.db
        .insert(paymentTransaction)
        .values({
          id: values.id,
          businessId: values.businessId,
          obligationId: values.obligationId,
          transactionNumber: values.transactionNumber,
          methodId: values.methodId,
          networkId: values.networkId,
          providerId: values.providerId,
          channelId: values.channelId,
          methodName: values.methodName,
          networkName: values.networkName,
          providerName: values.providerName,
          channelName: values.channelName,
          amount: values.amount,
          currencyCode: values.currencyCode,
          status: values.status,
          captureMode: values.captureMode,
          providerTransactionReference: values.providerTransactionReference,
          idempotencyKey: values.idempotencyKey,
          initiatedAt: values.initiatedAt,
          completedAt: values.completedAt,
          failureCode: values.failureCode,
          failureReason: values.failureReason,
          providerResponseMetadata: values.providerResponseMetadata,
          outcomeMismatch: values.outcomeMismatch,
          metadata: values.metadata,
          createdBy: values.createdBy,
          updatedBy: values.updatedBy,
        })
        .returning();
      if (!row) {
        throw new PaymentObligationError(PAYMENT_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
      }
      return mapRow(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("payment_transaction_business_idempotency_uidx")) {
        throw new PaymentObligationError(
          PAYMENT_ERROR_CODES.PAYMENT_DUPLICATE,
          undefined,
          409
        );
      }
      throw error;
    }
  }

  async update(
    businessId: string,
    transactionId: string,
    patch: PaymentTransactionPatch
  ): Promise<PaymentTransactionRecord> {
    const [row] = await this.db
      .update(paymentTransaction)
      .set({
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.providerTransactionReference !== undefined
          ? { providerTransactionReference: patch.providerTransactionReference }
          : {}),
        ...(patch.initiatedAt !== undefined ? { initiatedAt: patch.initiatedAt } : {}),
        ...(patch.completedAt !== undefined ? { completedAt: patch.completedAt } : {}),
        ...(patch.failureCode !== undefined ? { failureCode: patch.failureCode } : {}),
        ...(patch.failureReason !== undefined ? { failureReason: patch.failureReason } : {}),
        ...(patch.providerResponseMetadata !== undefined
          ? { providerResponseMetadata: patch.providerResponseMetadata }
          : {}),
        ...(patch.outcomeMismatch !== undefined
          ? { outcomeMismatch: patch.outcomeMismatch }
          : {}),
        ...(patch.metadata !== undefined ? { metadata: patch.metadata } : {}),
        ...(patch.updatedBy !== undefined ? { updatedBy: patch.updatedBy } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(paymentTransaction.businessId, businessId),
          eq(paymentTransaction.id, transactionId)
        )
      )
      .returning();
    if (!row) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.TRANSACTION_NOT_FOUND,
        undefined,
        404
      );
    }
    return mapRow(row);
  }

  async findById(businessId: string, transactionId: string) {
    const [row] = await this.db
      .select()
      .from(paymentTransaction)
      .where(
        and(
          eq(paymentTransaction.businessId, businessId),
          eq(paymentTransaction.id, transactionId)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  async findByIdempotencyKey(businessId: string, idempotencyKey: string) {
    const [row] = await this.db
      .select()
      .from(paymentTransaction)
      .where(
        and(
          eq(paymentTransaction.businessId, businessId),
          eq(paymentTransaction.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  async findByProviderReference(businessId: string, providerTransactionReference: string) {
    const [row] = await this.db
      .select()
      .from(paymentTransaction)
      .where(
        and(
          eq(paymentTransaction.businessId, businessId),
          eq(paymentTransaction.providerTransactionReference, providerTransactionReference)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  async findByTransactionNumber(businessId: string, transactionNumber: string) {
    const [row] = await this.db
      .select()
      .from(paymentTransaction)
      .where(
        and(
          eq(paymentTransaction.businessId, businessId),
          eq(paymentTransaction.transactionNumber, transactionNumber)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  async listByObligation(businessId: string, obligationId: string) {
    const rows = await this.db
      .select()
      .from(paymentTransaction)
      .where(
        and(
          eq(paymentTransaction.businessId, businessId),
          eq(paymentTransaction.obligationId, obligationId)
        )
      )
      .orderBy(desc(paymentTransaction.createdAt));
    return rows.map(mapRow);
  }

  async countAll(businessId: string) {
    const [row] = await this.db
      .select({ value: sql<number>`count(*)` })
      .from(paymentTransaction)
      .where(eq(paymentTransaction.businessId, businessId));
    return Number(row?.value ?? 0);
  }
}

export function createPaymentTransactionRepository() {
  return new PaymentTransactionRepository();
}
