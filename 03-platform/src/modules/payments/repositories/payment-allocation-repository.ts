/**
 * Purpose:
 * Persist payment allocations with tenant isolation.
 *
 * Implementation Package:
 * BP-007 / IP-03 – Partial, Split Payment & Allocation
 */

import { and, desc, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { paymentAllocation } from "@/db/schema/payment-allocation";
import { PAYMENT_ERROR_CODES, PaymentObligationError } from "@/modules/payments/errors";
import type { PaymentAllocationRepositoryPort } from "@/modules/payments/ports";
import type {
  PaymentAllocationInsert,
  PaymentAllocationRecord,
} from "@/modules/payments/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapRow(row: typeof paymentAllocation.$inferSelect): PaymentAllocationRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    obligationId: row.obligationId,
    paymentTransactionId: row.paymentTransactionId,
    allocationNumber: row.allocationNumber,
    targetType: row.targetType,
    allocatedAmount: String(row.allocatedAmount),
    currencyCode: row.currencyCode,
    status: row.status,
    idempotencyKey: row.idempotencyKey,
    reason: row.reason,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

export class PaymentAllocationRepository implements PaymentAllocationRepositoryPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: PaymentAllocationInsert): Promise<PaymentAllocationRecord> {
    try {
      const [row] = await this.db
        .insert(paymentAllocation)
        .values({
          id: values.id,
          businessId: values.businessId,
          obligationId: values.obligationId,
          paymentTransactionId: values.paymentTransactionId,
          allocationNumber: values.allocationNumber,
          targetType: values.targetType,
          allocatedAmount: values.allocatedAmount,
          currencyCode: values.currencyCode,
          status: values.status,
          idempotencyKey: values.idempotencyKey,
          reason: values.reason,
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
      if (message.includes("payment_allocation_business_idempotency_uidx")) {
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
    allocationId: string,
    patch: Partial<Pick<PaymentAllocationRecord, "status" | "reason" | "updatedBy" | "metadata">>
  ): Promise<PaymentAllocationRecord> {
    const [row] = await this.db
      .update(paymentAllocation)
      .set({
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.reason !== undefined ? { reason: patch.reason } : {}),
        ...(patch.updatedBy !== undefined ? { updatedBy: patch.updatedBy } : {}),
        ...(patch.metadata !== undefined ? { metadata: patch.metadata } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(paymentAllocation.businessId, businessId),
          eq(paymentAllocation.id, allocationId)
        )
      )
      .returning();
    if (!row) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.ALLOCATION_NOT_FOUND,
        undefined,
        404
      );
    }
    return mapRow(row);
  }

  async findById(businessId: string, allocationId: string) {
    const [row] = await this.db
      .select()
      .from(paymentAllocation)
      .where(
        and(
          eq(paymentAllocation.businessId, businessId),
          eq(paymentAllocation.id, allocationId)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  async findByIdempotencyKey(businessId: string, idempotencyKey: string) {
    const [row] = await this.db
      .select()
      .from(paymentAllocation)
      .where(
        and(
          eq(paymentAllocation.businessId, businessId),
          eq(paymentAllocation.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  async findByAllocationNumber(businessId: string, allocationNumber: string) {
    const [row] = await this.db
      .select()
      .from(paymentAllocation)
      .where(
        and(
          eq(paymentAllocation.businessId, businessId),
          eq(paymentAllocation.allocationNumber, allocationNumber)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  async listByObligation(businessId: string, obligationId: string) {
    const rows = await this.db
      .select()
      .from(paymentAllocation)
      .where(
        and(
          eq(paymentAllocation.businessId, businessId),
          eq(paymentAllocation.obligationId, obligationId)
        )
      )
      .orderBy(desc(paymentAllocation.createdAt));
    return rows.map(mapRow);
  }

  async listByTransaction(businessId: string, paymentTransactionId: string) {
    const rows = await this.db
      .select()
      .from(paymentAllocation)
      .where(
        and(
          eq(paymentAllocation.businessId, businessId),
          eq(paymentAllocation.paymentTransactionId, paymentTransactionId)
        )
      )
      .orderBy(desc(paymentAllocation.createdAt));
    return rows.map(mapRow);
  }

  async listByBusiness(businessId: string) {
    const rows = await this.db
      .select()
      .from(paymentAllocation)
      .where(eq(paymentAllocation.businessId, businessId))
      .orderBy(desc(paymentAllocation.createdAt));
    return rows.map(mapRow);
  }

  async countAll(businessId: string) {
    const [row] = await this.db
      .select({ value: sql<number>`count(*)` })
      .from(paymentAllocation)
      .where(eq(paymentAllocation.businessId, businessId));
    return Number(row?.value ?? 0);
  }
}

export function createPaymentAllocationRepository() {
  return new PaymentAllocationRepository();
}
