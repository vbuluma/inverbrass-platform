/**
 * Purpose:
 * BP-004 quotation-operation idempotency persistence (SL-CUS-003).
 */

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { quotationIdempotency } from "@/db/schema/quotation-idempotency";
import { CRM_ERROR_CODES, CrmError, CRM_USER_MESSAGES } from "@/modules/crm/errors";

export type QuotationIdempotencyRecord = {
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

export type QuotationIdempotencyRepositoryPort = {
  insert(values: {
    businessId: string;
    idempotencyKey: string;
    operationType: string;
    payloadHash: string;
    resourceType: string;
    resourceId: string;
    createdBy?: string | null;
  }): Promise<QuotationIdempotencyRecord>;
  find(
    businessId: string,
    operationType: string,
    idempotencyKey: string
  ): Promise<QuotationIdempotencyRecord | null>;
};

function mapRow(
  row: typeof quotationIdempotency.$inferSelect
): QuotationIdempotencyRecord {
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

export class QuotationIdempotencyRepository
  implements QuotationIdempotencyRepositoryPort
{
  constructor(private readonly db = getDb()) {}

  async insert(values: {
    businessId: string;
    idempotencyKey: string;
    operationType: string;
    payloadHash: string;
    resourceType: string;
    resourceId: string;
    createdBy?: string | null;
  }): Promise<QuotationIdempotencyRecord> {
    try {
      const [row] = await this.db
        .insert(quotationIdempotency)
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
        throw new CrmError(
          CRM_ERROR_CODES.PROVIDER_ERROR,
          CRM_USER_MESSAGES.PROVIDER_ERROR,
          500
        );
      }
      return mapRow(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new CrmError(
          CRM_ERROR_CODES.IDEMPOTENCY_CONFLICT,
          CRM_USER_MESSAGES.IDEMPOTENCY_CONFLICT,
          409
        );
      }
      throw error;
    }
  }

  async find(
    businessId: string,
    operationType: string,
    idempotencyKey: string
  ): Promise<QuotationIdempotencyRecord | null> {
    const [row] = await this.db
      .select()
      .from(quotationIdempotency)
      .where(
        and(
          eq(quotationIdempotency.businessId, businessId),
          eq(quotationIdempotency.operationType, operationType),
          eq(quotationIdempotency.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }
}

function isUniqueViolation(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const record = current as {
      code?: unknown;
      message?: unknown;
      cause?: unknown;
    };
    if (record.code === "23505") return true;
    const message = typeof record.message === "string" ? record.message : "";
    if (
      message.includes("quotation_idempotency_business_operation_key_uidx") ||
      message.includes("duplicate key") ||
      /unique/i.test(message)
    ) {
      return true;
    }
    current = record.cause;
  }
  return false;
}

export function createQuotationIdempotencyRepository(): QuotationIdempotencyRepositoryPort {
  return new QuotationIdempotencyRepository();
}
