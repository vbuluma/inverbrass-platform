/**
 * Purpose:
 * Persist and read Offering Document link rows (multi-offering support).
 *
 * Architecture:
 * OfferingDocumentService → OfferingDocumentLinkRepository → Drizzle
 *
 * Implementation Package:
 * BP-003 / IP-009 – Offering Documents & Compliance
 */

import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { offeringDocumentLink } from "@/db/schema/offering-document-link";

type DbClient = PostgresJsDatabase<typeof schema>;

export type OfferingDocumentLinkInsertValues = {
  businessId: string;
  offeringId: string;
  offeringType: string;
  documentId: string;
  isPrimary?: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
};

export class OfferingDocumentLinkRepository {
  async insert(
    values: OfferingDocumentLinkInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(offeringDocumentLink)
      .values({
        businessId: values.businessId,
        offeringId: values.offeringId,
        offeringType: values.offeringType,
        documentId: values.documentId,
        isPrimary: values.isPrimary ?? true,
        effectiveFrom: values.effectiveFrom ?? null,
        effectiveTo: values.effectiveTo ?? null,
      })
      .returning();

    return row;
  }

  async listByOfferingId(
    businessId: string,
    offeringId: string,
    offeringType: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(offeringDocumentLink)
      .where(
        and(
          eq(offeringDocumentLink.businessId, businessId),
          eq(offeringDocumentLink.offeringId, offeringId),
          eq(offeringDocumentLink.offeringType, offeringType)
        )
      );
  }

  async findPrimaryByDocumentId(
    businessId: string,
    documentId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(offeringDocumentLink)
      .where(
        and(
          eq(offeringDocumentLink.businessId, businessId),
          eq(offeringDocumentLink.documentId, documentId),
          eq(offeringDocumentLink.isPrimary, true)
        )
      )
      .limit(1);

    return row ?? null;
  }
}

export function createOfferingDocumentLinkRepository(): OfferingDocumentLinkRepository {
  return new OfferingDocumentLinkRepository();
}
