/**
 * Purpose:
 * Persist and read Offering Document metadata (persistence only).
 *
 * Architecture:
 * OfferingDocumentService → OfferingDocumentRepository → Drizzle
 *
 * Implementation Package:
 * BP-003 / IP-009 – Offering Documents & Compliance
 */

import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { offeringDocument } from "@/db/schema/offering-document";
import type { OfferingDocumentStatusCode } from "@/modules/product/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type OfferingDocumentInsertValues = {
  businessId: string;
  productId: string;
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
  statusCode: OfferingDocumentStatusCode;
  isVerified?: boolean;
  verifiedBy?: string | null;
  verifiedAt?: Date | null;
  verificationMethodCode?: string | null;
  supersedesDocumentId?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type OfferingDocumentUpdateValues = {
  statusCode?: OfferingDocumentStatusCode;
  isVerified?: boolean;
  verifiedBy?: string | null;
  verifiedAt?: Date | null;
  verificationMethodCode?: string | null;
  notes?: string | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
};

export class OfferingDocumentRepository {
  async insert(
    values: OfferingDocumentInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(offeringDocument)
      .values({
        businessId: values.businessId,
        productId: values.productId,
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
    offeringDocumentId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(offeringDocument)
      .where(
        and(
          eq(offeringDocument.businessId, businessId),
          eq(offeringDocument.id, offeringDocumentId),
          isNull(offeringDocument.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async listByProductId(
    businessId: string,
    productId: string,
    documentTypeCode?: string,
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(offeringDocument.businessId, businessId),
      eq(offeringDocument.productId, productId),
      isNull(offeringDocument.deletedAt),
    ];

    if (documentTypeCode) {
      conditions.push(eq(offeringDocument.documentTypeCode, documentTypeCode));
    }

    return dbClient
      .select()
      .from(offeringDocument)
      .where(and(...conditions))
      .orderBy(
        asc(offeringDocument.documentTypeCode),
        desc(offeringDocument.createdAt)
      );
  }

  async findDuplicateByTypeAndHash(
    businessId: string,
    productId: string,
    documentTypeCode: string,
    fileHash: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ id: offeringDocument.id })
      .from(offeringDocument)
      .where(
        and(
          eq(offeringDocument.businessId, businessId),
          eq(offeringDocument.productId, productId),
          eq(offeringDocument.documentTypeCode, documentTypeCode),
          eq(offeringDocument.fileHash, fileHash),
          isNull(offeringDocument.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async updateById(
    businessId: string,
    offeringDocumentId: string,
    values: OfferingDocumentUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(offeringDocument)
      .set({
        ...(values.statusCode !== undefined
          ? { statusCode: values.statusCode }
          : {}),
        ...(values.isVerified !== undefined
          ? { isVerified: values.isVerified }
          : {}),
        ...(values.verifiedBy !== undefined
          ? { verifiedBy: values.verifiedBy }
          : {}),
        ...(values.verifiedAt !== undefined
          ? { verifiedAt: values.verifiedAt }
          : {}),
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
          eq(offeringDocument.businessId, businessId),
          eq(offeringDocument.id, offeringDocumentId),
          isNull(offeringDocument.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }
}

export function createOfferingDocumentRepository(): OfferingDocumentRepository {
  return new OfferingDocumentRepository();
}
