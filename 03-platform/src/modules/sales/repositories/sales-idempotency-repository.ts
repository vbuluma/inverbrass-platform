/**
 * Purpose:
 * BP-006 sales-operation idempotency persistence (SL-CUS-001).
 */

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { salesIdempotency } from "@/db/schema/sales-idempotency";
import {
  SALES_ERROR_CODES,
  SalesOrderError,
} from "@/modules/sales/errors";
import type { SalesIdempotencyOperation } from "@/modules/sales/constants";

export type SalesIdempotencyRecord = {
  id: string;
  businessId: string;
  idempotencyKey: string;
  operationType: string;
  payloadHash: string;
  resourceType: string;
  resourceId: string;
  createdAt: Date;
  createdBy: string | null;
};

export type SalesIdempotencyRepositoryPort = {
  insert(values: {
    businessId: string;
    idempotencyKey: string;
    operationType: SalesIdempotencyOperation | string;
    payloadHash: string;
    resourceType: string;
    resourceId: string;
    createdBy?: string | null;
  }): Promise<SalesIdempotencyRecord>;
  find(
    businessId: string,
    operationType: SalesIdempotencyOperation | string,
    idempotencyKey: string
  ): Promise<SalesIdempotencyRecord | null>;
};

function mapRow(row: typeof salesIdempotency.$inferSelect): SalesIdempotencyRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    idempotencyKey: row.idempotencyKey,
    operationType: row.operationType,
    payloadHash: row.payloadHash,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  };
}

export class SalesIdempotencyRepository implements SalesIdempotencyRepositoryPort {
  constructor(private readonly db = getDb()) {}

  async insert(values: {
    businessId: string;
    idempotencyKey: string;
    operationType: SalesIdempotencyOperation | string;
    payloadHash: string;
    resourceType: string;
    resourceId: string;
    createdBy?: string | null;
  }): Promise<SalesIdempotencyRecord> {
    try {
      const [row] = await this.db
        .insert(salesIdempotency)
        .values({
          businessId: values.businessId,
          idempotencyKey: values.idempotencyKey,
          operationType: values.operationType,
          payloadHash: values.payloadHash,
          resourceType: values.resourceType,
          resourceId: values.resourceId,
          createdBy: values.createdBy ?? null,
        })
        .returning();
      if (!row) {
        throw new SalesOrderError(SALES_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
      }
      return mapRow(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("sales_idempotency_business_operation_key_uidx")) {
        throw new SalesOrderError(
          SALES_ERROR_CODES.IDEMPOTENCY_CONFLICT,
          undefined,
          409
        );
      }
      throw error;
    }
  }

  async find(
    businessId: string,
    operationType: SalesIdempotencyOperation | string,
    idempotencyKey: string
  ): Promise<SalesIdempotencyRecord | null> {
    const [row] = await this.db
      .select()
      .from(salesIdempotency)
      .where(
        and(
          eq(salesIdempotency.businessId, businessId),
          eq(salesIdempotency.operationType, operationType),
          eq(salesIdempotency.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }
}

export function createSalesIdempotencyRepository(): SalesIdempotencyRepository {
  return new SalesIdempotencyRepository();
}
