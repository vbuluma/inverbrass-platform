/**
 * Purpose:
 * Reference existing ENG-015 party documents as qualification evidence.
 * Does not store binaries in the procurement domain.
 */

import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db/client";
import { partyDocument } from "@/db/schema/party-document";
import type { ProcurementDocumentPort } from "@/modules/procurement/ports";
import type { ProcurementDocumentRef } from "@/modules/procurement/types";

function mapRow(row: typeof partyDocument.$inferSelect): ProcurementDocumentRef {
  return {
    id: row.id,
    partyId: row.partyId,
    businessId: row.businessId,
    documentTypeCode: row.documentTypeCode,
    originalFileName: row.originalFileName,
    statusCode: row.statusCode,
  };
}

export class ProcurementDocumentAdapter implements ProcurementDocumentPort {
  constructor(private readonly db = getDb()) {}

  async findPartyDocument(businessId: string, partyId: string, documentId: string) {
    const [row] = await this.db
      .select()
      .from(partyDocument)
      .where(
        and(
          eq(partyDocument.businessId, businessId),
          eq(partyDocument.partyId, partyId),
          eq(partyDocument.id, documentId),
          isNull(partyDocument.deletedAt)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  async listPartyDocuments(businessId: string, partyId: string) {
    const rows = await this.db
      .select()
      .from(partyDocument)
      .where(
        and(
          eq(partyDocument.businessId, businessId),
          eq(partyDocument.partyId, partyId),
          isNull(partyDocument.deletedAt)
        )
      );
    return rows.map(mapRow);
  }
}

export function createProcurementDocumentAdapter() {
  return new ProcurementDocumentAdapter();
}
