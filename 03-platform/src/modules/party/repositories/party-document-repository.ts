/**
 * Purpose:
 * Persist and read Party Document metadata (persistence only).
 *
 * Architecture:
 * PartyDocumentService → PartyDocumentRepository → Drizzle
 *
 * Implementation Package:
 * BP-002 / IP-007 – Party Documents
 */

import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { partyDocument } from "@/db/schema/party-document";
import type { PartyDocumentStatusCode } from "@/modules/party/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type PartyDocumentInsertValues = {
  businessId: string;
  partyId: string;
  documentTypeCode: string;
  storageProviderCode: string;
  storageBucket: string;
  fileReference: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  fileHash?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  statusCode: PartyDocumentStatusCode;
  isVerified?: boolean;
  verifiedBy?: string | null;
  verifiedAt?: Date | null;
  verificationMethodCode?: string | null;
  supersedesDocumentId?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type PartyDocumentUpdateValues = {
  statusCode?: PartyDocumentStatusCode;
  isVerified?: boolean;
  verifiedBy?: string | null;
  verifiedAt?: Date | null;
  verificationMethodCode?: string | null;
  notes?: string | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
};

export class PartyDocumentRepository {
  async insert(
    values: PartyDocumentInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(partyDocument)
      .values({
        businessId: values.businessId,
        partyId: values.partyId,
        documentTypeCode: values.documentTypeCode,
        storageProviderCode: values.storageProviderCode,
        storageBucket: values.storageBucket,
        fileReference: values.fileReference,
        originalFileName: values.originalFileName,
        mimeType: values.mimeType,
        fileSizeBytes: values.fileSizeBytes,
        fileHash: values.fileHash ?? null,
        issueDate: values.issueDate ?? null,
        expiryDate: values.expiryDate ?? null,
        statusCode: values.statusCode,
        isVerified: values.isVerified ?? false,
        verifiedBy: values.verifiedBy ?? null,
        verifiedAt: values.verifiedAt ?? null,
        verificationMethodCode: values.verificationMethodCode ?? null,
        supersedesDocumentId: values.supersedesDocumentId ?? null,
        notes: values.notes ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async findById(
    businessId: string,
    partyDocumentId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(partyDocument)
      .where(
        and(
          eq(partyDocument.businessId, businessId),
          eq(partyDocument.id, partyDocumentId),
          isNull(partyDocument.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async listByPartyId(
    businessId: string,
    partyId: string,
    documentTypeCode?: string,
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(partyDocument.businessId, businessId),
      eq(partyDocument.partyId, partyId),
      isNull(partyDocument.deletedAt),
    ];

    if (documentTypeCode) {
      conditions.push(eq(partyDocument.documentTypeCode, documentTypeCode));
    }

    return dbClient
      .select()
      .from(partyDocument)
      .where(and(...conditions))
      .orderBy(
        asc(partyDocument.documentTypeCode),
        desc(partyDocument.createdAt)
      );
  }

  async findDuplicateByTypeAndHash(
    businessId: string,
    partyId: string,
    documentTypeCode: string,
    fileHash: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ id: partyDocument.id })
      .from(partyDocument)
      .where(
        and(
          eq(partyDocument.businessId, businessId),
          eq(partyDocument.partyId, partyId),
          eq(partyDocument.documentTypeCode, documentTypeCode),
          eq(partyDocument.fileHash, fileHash),
          isNull(partyDocument.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async updateById(
    businessId: string,
    partyDocumentId: string,
    values: PartyDocumentUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(partyDocument)
      .set({
        ...(values.statusCode !== undefined ? { statusCode: values.statusCode } : {}),
        ...(values.isVerified !== undefined ? { isVerified: values.isVerified } : {}),
        ...(values.verifiedBy !== undefined ? { verifiedBy: values.verifiedBy } : {}),
        ...(values.verifiedAt !== undefined ? { verifiedAt: values.verifiedAt } : {}),
        ...(values.verificationMethodCode !== undefined
          ? { verificationMethodCode: values.verificationMethodCode }
          : {}),
        ...(values.notes !== undefined ? { notes: values.notes } : {}),
        ...(values.deletedAt !== undefined ? { deletedAt: values.deletedAt } : {}),
        ...(values.updatedBy !== undefined ? { updatedBy: values.updatedBy } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(partyDocument.businessId, businessId),
          eq(partyDocument.id, partyDocumentId),
          isNull(partyDocument.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }
}

export function createPartyDocumentRepository(): PartyDocumentRepository {
  return new PartyDocumentRepository();
}
