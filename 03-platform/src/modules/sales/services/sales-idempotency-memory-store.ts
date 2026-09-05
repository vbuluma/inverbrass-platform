/**
 * Purpose:
 * In-memory sales idempotency store for SL-CUS-001 certification concurrency.
 */

import {
  SALES_ERROR_CODES,
  SalesOrderError,
} from "@/modules/sales/errors";
import type {
  SalesIdempotencyRecord,
  SalesIdempotencyRepositoryPort,
} from "@/modules/sales/repositories/sales-idempotency-repository";

export class InMemorySalesIdempotencyStore
  implements SalesIdempotencyRepositoryPort
{
  readonly rows: SalesIdempotencyRecord[] = [];
  private locks = new Map<string, Promise<void>>();

  private keyOf(
    businessId: string,
    operationType: string,
    idempotencyKey: string
  ) {
    return `${businessId}|${operationType}|${idempotencyKey}`;
  }

  async insert(values: {
    businessId: string;
    idempotencyKey: string;
    operationType: string;
    payloadHash: string;
    resourceType: string;
    resourceId: string;
    createdBy?: string | null;
  }): Promise<SalesIdempotencyRecord> {
    const lockKey = this.keyOf(
      values.businessId,
      values.operationType,
      values.idempotencyKey
    );
    const previous = this.locks.get(lockKey) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(
      lockKey,
      previous.then(() => gate)
    );
    await previous;
    try {
      const existing = await this.find(
        values.businessId,
        values.operationType,
        values.idempotencyKey
      );
      if (existing) {
        throw new SalesOrderError(
          SALES_ERROR_CODES.IDEMPOTENCY_CONFLICT,
          undefined,
          409
        );
      }
      const row: SalesIdempotencyRecord = {
        id: crypto.randomUUID(),
        businessId: values.businessId,
        idempotencyKey: values.idempotencyKey,
        operationType: values.operationType,
        payloadHash: values.payloadHash,
        resourceType: values.resourceType,
        resourceId: values.resourceId,
        createdAt: new Date(),
        createdBy: values.createdBy ?? null,
      };
      this.rows.push(row);
      return { ...row };
    } finally {
      release();
    }
  }

  async find(
    businessId: string,
    operationType: string,
    idempotencyKey: string
  ): Promise<SalesIdempotencyRecord | null> {
    return (
      this.rows.find(
        (row) =>
          row.businessId === businessId &&
          row.operationType === operationType &&
          row.idempotencyKey === idempotencyKey
      ) ?? null
    );
  }
}

export function createInMemorySalesIdempotencyStore() {
  return new InMemorySalesIdempotencyStore();
}
