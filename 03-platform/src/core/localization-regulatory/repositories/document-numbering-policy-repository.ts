/**
 * Purpose:
 * Persist ENG-003b document numbering policies and allocate the next number.
 *
 * Engine:
 * ENG-003b – Localization & Regulatory Engine
 */

import { and, eq, isNull, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  DOCUMENT_NUMBERING_ERROR_CODES,
  DocumentNumberingError,
  type DocumentNumberingPolicy,
} from "@/core/localization-regulatory/document-numbering";
import type { DocumentNumberingStorePort } from "@/core/localization-regulatory/services/document-numbering-service";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { documentNumberingPolicy } from "@/db/schema/document-numbering-policy";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapRow(
  row: typeof documentNumberingPolicy.$inferSelect
): DocumentNumberingPolicy {
  return {
    id: row.id,
    businessId: row.businessId,
    documentType: row.documentType,
    policyCode: row.policyCode,
    prefix: row.prefix,
    nextValue: row.nextValue,
    padding: row.padding,
    isActive: row.isActive,
  };
}

export class DocumentNumberingPolicyRepository implements DocumentNumberingStorePort {
  constructor(private readonly db: DbClient = getDb()) {}

  async findActivePolicy(businessId: string, documentType: string) {
    const rows = await this.db
      .select()
      .from(documentNumberingPolicy)
      .where(
        and(
          eq(documentNumberingPolicy.documentType, documentType),
          eq(documentNumberingPolicy.isActive, true),
          or(
            eq(documentNumberingPolicy.businessId, businessId),
            isNull(documentNumberingPolicy.businessId)
          )
        )
      );
    const mapped = rows.map(mapRow);
    return (
      mapped.find((row) => row.businessId === businessId) ??
      mapped.find((row) => row.businessId === null) ??
      null
    );
  }

  async allocateNext(policyId: string) {
    const [row] = await this.db
      .update(documentNumberingPolicy)
      .set({
        nextValue: sql`${documentNumberingPolicy.nextValue} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(documentNumberingPolicy.id, policyId))
      .returning();
    if (!row) {
      throw new DocumentNumberingError(
        DOCUMENT_NUMBERING_ERROR_CODES.POLICY_MISSING,
        "Document numbering is not configured for this business."
      );
    }
    return mapRow(row);
  }
}

export function createDocumentNumberingPolicyRepository() {
  return new DocumentNumberingPolicyRepository();
}
