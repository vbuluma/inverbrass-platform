/**
 * Purpose:
 * Persist reusable payment-operation idempotency records.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { paymentIdempotency } from "@/db/schema/payment-idempotency";
import { PAYMENT_ERROR_CODES, PaymentObligationError } from "@/modules/payments/errors";
import type { PaymentIdempotencyRepositoryPort } from "@/modules/payments/ports";
import type { PaymentIdempotencyRecord } from "@/modules/payments/types";

function mapRow(
  row: typeof paymentIdempotency.$inferSelect
): PaymentIdempotencyRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    idempotencyKey: row.idempotencyKey,
    operationType: row.operationType,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  };
}

export class PaymentIdempotencyRepository implements PaymentIdempotencyRepositoryPort {
  constructor(private readonly db = getDb()) {}

  async insert(values: {
    id?: string;
    businessId: string;
    idempotencyKey: string;
    operationType: string;
    resourceType: string;
    resourceId: string;
    createdBy: string | null;
  }): Promise<PaymentIdempotencyRecord> {
    try {
      const [row] = await this.db
        .insert(paymentIdempotency)
        .values(values)
        .returning();
      if (!row) {
        throw new PaymentObligationError(PAYMENT_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
      }
      return mapRow(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("payment_idempotency_business_operation_key_uidx")) {
        throw new PaymentObligationError(
          PAYMENT_ERROR_CODES.IDEMPOTENCY_CONFLICT,
          undefined,
          409
        );
      }
      throw error;
    }
  }

  async find(businessId: string, operationType: string, idempotencyKey: string) {
    const [row] = await this.db
      .select()
      .from(paymentIdempotency)
      .where(
        and(
          eq(paymentIdempotency.businessId, businessId),
          eq(paymentIdempotency.operationType, operationType),
          eq(paymentIdempotency.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }
}

export function createPaymentIdempotencyRepository() {
  return new PaymentIdempotencyRepository();
}
