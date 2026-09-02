/**
 * Purpose:
 * Persist supplier qualification and ENG-015 document evidence links.
 */

import { and, desc, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/db/client";
import {
  procurementQualificationEvidence,
  supplierQualification,
} from "@/db/schema/supplier-qualification";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type { SupplierQualificationRepositoryPort } from "@/modules/procurement/ports";
import type { SupplierQualificationRecord } from "@/modules/procurement/types";

function mapRow(
  row: typeof supplierQualification.$inferSelect,
  evidenceDocumentIds: string[]
): SupplierQualificationRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    profileId: row.profileId,
    qualificationTypeCode: row.qualificationTypeCode,
    outcomeCode: row.outcomeCode,
    effectiveDate: row.effectiveDate,
    expiryDate: row.expiryDate,
    reviewDate: row.reviewDate,
    reviewerUserId: row.reviewerUserId,
    notes: row.notes,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    deletedAt: row.deletedAt,
    version: row.version,
    evidenceDocumentIds,
  };
}

export class SupplierQualificationRepository implements SupplierQualificationRepositoryPort {
  constructor(private readonly db = getDb()) {}

  async insert(
    values: Omit<SupplierQualificationRecord, "createdAt" | "updatedAt" | "deletedAt">
  ) {
    const [row] = await this.db
      .insert(supplierQualification)
      .values({
        id: values.id,
        businessId: values.businessId,
        profileId: values.profileId,
        qualificationTypeCode: values.qualificationTypeCode,
        outcomeCode: values.outcomeCode,
        effectiveDate: values.effectiveDate,
        expiryDate: values.expiryDate,
        reviewDate: values.reviewDate,
        reviewerUserId: values.reviewerUserId,
        notes: values.notes,
        createdBy: values.createdBy,
        updatedBy: values.updatedBy,
        version: values.version,
      })
      .returning();
    if (!row) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
    }
    if (values.evidenceDocumentIds.length > 0) {
      await this.db.insert(procurementQualificationEvidence).values(
        values.evidenceDocumentIds.map((documentId) => ({
          id: randomUUID(),
          businessId: values.businessId,
          qualificationId: row.id,
          documentId,
          createdBy: values.createdBy,
        }))
      );
    }
    return mapRow(row, values.evidenceDocumentIds);
  }

  async update(
    businessId: string,
    qualificationId: string,
    patch: Partial<SupplierQualificationRecord>
  ) {
    const [row] = await this.db
      .update(supplierQualification)
      .set({
        qualificationTypeCode: patch.qualificationTypeCode,
        outcomeCode: patch.outcomeCode,
        effectiveDate: patch.effectiveDate,
        expiryDate: patch.expiryDate,
        reviewDate: patch.reviewDate,
        reviewerUserId: patch.reviewerUserId,
        notes: patch.notes,
        updatedBy: patch.updatedBy,
        version: patch.version,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(supplierQualification.businessId, businessId),
          eq(supplierQualification.id, qualificationId),
          isNull(supplierQualification.deletedAt)
        )
      )
      .returning();
    if (!row) {
      throw new ProcurementError(
        PROCUREMENT_ERROR_CODES.QUALIFICATION_NOT_FOUND,
        undefined,
        404
      );
    }
    const evidence = await this.listEvidence(row.id);
    return mapRow(row, evidence);
  }

  async listByProfile(businessId: string, profileId: string) {
    const rows = await this.db
      .select()
      .from(supplierQualification)
      .where(
        and(
          eq(supplierQualification.businessId, businessId),
          eq(supplierQualification.profileId, profileId),
          isNull(supplierQualification.deletedAt)
        )
      )
      .orderBy(desc(supplierQualification.createdAt));
    const result: SupplierQualificationRecord[] = [];
    for (const row of rows) {
      result.push(mapRow(row, await this.listEvidence(row.id)));
    }
    return result;
  }

  async findById(businessId: string, qualificationId: string) {
    const [row] = await this.db
      .select()
      .from(supplierQualification)
      .where(
        and(
          eq(supplierQualification.businessId, businessId),
          eq(supplierQualification.id, qualificationId),
          isNull(supplierQualification.deletedAt)
        )
      )
      .limit(1);
    if (!row) {
      return null;
    }
    return mapRow(row, await this.listEvidence(row.id));
  }

  private async listEvidence(qualificationId: string) {
    const rows = await this.db
      .select({ documentId: procurementQualificationEvidence.documentId })
      .from(procurementQualificationEvidence)
      .where(eq(procurementQualificationEvidence.qualificationId, qualificationId));
    return rows.map((row) => row.documentId);
  }
}

export function createSupplierQualificationRepository() {
  return new SupplierQualificationRepository();
}
