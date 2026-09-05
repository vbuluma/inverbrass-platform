/**
 * Purpose:
 * In-memory quotation idempotency store for SL-CUS-003 certification concurrency.
 */

import { CRM_ERROR_CODES, CrmError, CRM_USER_MESSAGES } from "@/modules/crm/errors";
import type {
  QuotationIdempotencyRecord,
  QuotationIdempotencyRepositoryPort,
} from "@/modules/crm/quotation/repositories/quotation-idempotency-repository";

export class InMemoryQuotationIdempotencyStore
  implements QuotationIdempotencyRepositoryPort
{
  readonly rows: QuotationIdempotencyRecord[] = [];
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
  }): Promise<QuotationIdempotencyRecord> {
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
    this.locks.set(lockKey, previous.then(() => gate));
    await previous;
    try {
      const existing = await this.find(
        values.businessId,
        values.operationType,
        values.idempotencyKey
      );
      if (existing) {
        throw new CrmError(
          CRM_ERROR_CODES.IDEMPOTENCY_CONFLICT,
          CRM_USER_MESSAGES.IDEMPOTENCY_CONFLICT,
          409
        );
      }
      const row: QuotationIdempotencyRecord = {
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
  ): Promise<QuotationIdempotencyRecord | null> {
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

export function createInMemoryQuotationIdempotencyStore() {
  return new InMemoryQuotationIdempotencyStore();
}
