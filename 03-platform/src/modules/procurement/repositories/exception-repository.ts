/**
 * Purpose:
 * Persist procurement exceptions with tenant isolation.
 */

import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { procurementExceptionTypes } from "@/db/seeds/procurement-catalogues";
import { getDb } from "@/db/client";
import {
  procurementException,
  procurementExceptionAction,
  procurementExceptionControl,
  procurementExceptionLink,
  procurementExceptionType,
} from "@/db/schema/procurement-exception";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type { ExceptionControlPort, ExceptionStorePort } from "@/modules/procurement/ports";
import type {
  ExceptionActionRecord,
  ExceptionControlRecord,
  ExceptionLinkRecord,
  ExceptionRecord,
  ExceptionTypeRecord,
} from "@/modules/procurement/types";

function mapException(row: typeof procurementException.$inferSelect): ExceptionRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    exceptionNumber: row.exceptionNumber,
    exceptionTypeCode: row.exceptionTypeCode,
    severity: row.severity,
    status: row.status,
    title: row.title,
    description: row.description,
    evidenceDocumentId: row.evidenceDocumentId,
    raisedFrom: row.raisedFrom,
    sourceKey: row.sourceKey,
    profileId: row.profileId,
    ownerUserId: row.ownerUserId,
    resolutionNotes: row.resolutionNotes,
    resolutionDecision: row.resolutionDecision,
    varianceAcceptedBy: row.varianceAcceptedBy,
    requiresApproval: row.requiresApproval,
    approvedAt: row.approvedAt,
    approvedBy: row.approvedBy,
    dueAt: row.dueAt,
    closedAt: row.closedAt,
    closedBy: row.closedBy,
    cancelledAt: row.cancelledAt,
    cancelledBy: row.cancelledBy,
    cancellationReason: row.cancellationReason,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    deletedAt: row.deletedAt,
  };
}

function mapLink(row: typeof procurementExceptionLink.$inferSelect): ExceptionLinkRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    exceptionId: row.exceptionId,
    objectType: row.objectType,
    objectId: row.objectId,
    createdAt: row.createdAt,
  };
}

function mapAction(row: typeof procurementExceptionAction.$inferSelect): ExceptionActionRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    exceptionId: row.exceptionId,
    actionType: row.actionType,
    actorUserId: row.actorUserId,
    notes: row.notes,
    createdAt: row.createdAt,
  };
}

function mapType(row: typeof procurementExceptionType.$inferSelect): ExceptionTypeRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    code: row.code,
    name: row.name,
    description: row.description,
    defaultSeverity: row.defaultSeverity,
    requiresApprovalOnClose: row.requiresApprovalOnClose,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
  };
}

export class ExceptionRepository implements ExceptionStorePort {
  constructor(private readonly db = getDb()) {}

  insertException = async (
    values: Omit<ExceptionRecord, "createdAt" | "updatedAt" | "deletedAt"> & {
      deletedAt?: Date | null;
    }
  ) => {
    const [row] = await this.db
      .insert(procurementException)
      .values({
        id: values.id,
        businessId: values.businessId,
        exceptionNumber: values.exceptionNumber,
        exceptionTypeCode: values.exceptionTypeCode,
        severity: values.severity,
        status: values.status,
        title: values.title,
        description: values.description,
        evidenceDocumentId: values.evidenceDocumentId,
        raisedFrom: values.raisedFrom,
        sourceKey: values.sourceKey,
        profileId: values.profileId,
        ownerUserId: values.ownerUserId,
        resolutionNotes: values.resolutionNotes,
        resolutionDecision: values.resolutionDecision,
        varianceAcceptedBy: values.varianceAcceptedBy,
        requiresApproval: values.requiresApproval,
        approvedAt: values.approvedAt,
        approvedBy: values.approvedBy,
        dueAt: values.dueAt,
        closedAt: values.closedAt,
        closedBy: values.closedBy,
        cancelledAt: values.cancelledAt,
        cancelledBy: values.cancelledBy,
        cancellationReason: values.cancellationReason,
        createdBy: values.createdBy,
        updatedBy: values.updatedBy,
        deletedAt: values.deletedAt ?? null,
      })
      .returning();
    return mapException(row!);
  };

  updateException = async (
    businessId: string,
    exceptionId: string,
    patch: Partial<Omit<ExceptionRecord, "id" | "businessId" | "createdAt" | "createdBy">>
  ) => {
    const [row] = await this.db
      .update(procurementException)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(procurementException.id, exceptionId),
          eq(procurementException.businessId, businessId),
          isNull(procurementException.deletedAt)
        )
      )
      .returning();
    if (!row) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.EXCEPTION_NOT_FOUND, undefined, 404);
    }
    return mapException(row);
  };

  findExceptionById = async (businessId: string, exceptionId: string) => {
    const [row] = await this.db
      .select()
      .from(procurementException)
      .where(
        and(
          eq(procurementException.id, exceptionId),
          eq(procurementException.businessId, businessId),
          isNull(procurementException.deletedAt)
        )
      )
      .limit(1);
    return row ? mapException(row) : null;
  };

  findExceptionBySourceKey = async (businessId: string, sourceKey: string) => {
    const [row] = await this.db
      .select()
      .from(procurementException)
      .where(
        and(
          eq(procurementException.businessId, businessId),
          eq(procurementException.sourceKey, sourceKey),
          isNull(procurementException.deletedAt)
        )
      )
      .limit(1);
    return row ? mapException(row) : null;
  };

  listExceptionsByBusiness = async (businessId: string) => {
    const rows = await this.db
      .select()
      .from(procurementException)
      .where(
        and(eq(procurementException.businessId, businessId), isNull(procurementException.deletedAt))
      );
    return rows.map(mapException);
  };

  listExceptionsByObject = async (businessId: string, objectType: string, objectId: string) => {
    const links = await this.db
      .select()
      .from(procurementExceptionLink)
      .where(
        and(
          eq(procurementExceptionLink.businessId, businessId),
          eq(procurementExceptionLink.objectType, objectType),
          eq(procurementExceptionLink.objectId, objectId)
        )
      );
    const rows: ExceptionRecord[] = [];
    for (const link of links) {
      const row = await this.findExceptionById(businessId, link.exceptionId);
      if (row) {
        rows.push(row);
      }
    }
    return rows;
  };

  countOpenExceptions = async (businessId: string) => {
    const rows = await this.listExceptionsByBusiness(businessId);
    return rows.filter((row) => row.status !== "CLOSED" && row.status !== "CANCELLED").length;
  };

  insertLinks = async (rows: ExceptionLinkRecord[]) => {
    if (rows.length === 0) {
      return;
    }
    await this.db.insert(procurementExceptionLink).values(
      rows.map((row) => ({
        id: row.id,
        businessId: row.businessId,
        exceptionId: row.exceptionId,
        objectType: row.objectType,
        objectId: row.objectId,
      }))
    );
  };

  listLinks = async (exceptionId: string) => {
    const rows = await this.db
      .select()
      .from(procurementExceptionLink)
      .where(eq(procurementExceptionLink.exceptionId, exceptionId));
    return rows.map(mapLink);
  };

  insertAction = async (
    values: Omit<ExceptionActionRecord, "createdAt"> & { createdAt?: Date }
  ) => {
    const [row] = await this.db
      .insert(procurementExceptionAction)
      .values({
        id: values.id,
        businessId: values.businessId,
        exceptionId: values.exceptionId,
        actionType: values.actionType,
        actorUserId: values.actorUserId,
        notes: values.notes,
        createdAt: values.createdAt ?? new Date(),
      })
      .returning();
    return mapAction(row!);
  };

  listActions = async (exceptionId: string) => {
    const rows = await this.db
      .select()
      .from(procurementExceptionAction)
      .where(eq(procurementExceptionAction.exceptionId, exceptionId));
    return rows.map(mapAction).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  };

  listTypes = async (businessId: string) => {
    const rows = await this.db
      .select()
      .from(procurementExceptionType)
      .where(eq(procurementExceptionType.businessId, businessId));
    if (rows.length > 0) {
      return rows.map(mapType);
    }
    const seeded = await Promise.all(
      procurementExceptionTypes.map((item) =>
        this.insertType({
          businessId,
          code: item.code,
          name: item.name,
          description: item.description,
          defaultSeverity: item.defaultSeverity,
          requiresApprovalOnClose: item.requiresApprovalOnClose,
          displayOrder: item.displayOrder,
          isActive: item.isActive,
        })
      )
    );
    return seeded;
  };

  insertType = async (values: Omit<ExceptionTypeRecord, "id">) => {
    const [row] = await this.db
      .insert(procurementExceptionType)
      .values({
        id: randomUUID(),
        businessId: values.businessId,
        code: values.code,
        name: values.name,
        description: values.description,
        defaultSeverity: values.defaultSeverity,
        requiresApprovalOnClose: values.requiresApprovalOnClose,
        displayOrder: values.displayOrder,
        isActive: values.isActive,
      })
      .returning();
    return mapType(row!);
  };
}

export class ExceptionControlRepository implements ExceptionControlPort {
  constructor(private readonly db = getDb()) {}

  async getControl(businessId: string) {
    const [row] = await this.db
      .select()
      .from(procurementExceptionControl)
      .where(eq(procurementExceptionControl.businessId, businessId))
      .limit(1);
    if (!row) {
      return null;
    }
    return {
      businessId: row.businessId,
      highSeverityRequiresApproval: row.highSeverityRequiresApproval,
      duplicateInvoiceRequiresDecision: row.duplicateInvoiceRequiresDecision,
      defaultSlaDays: row.defaultSlaDays,
    } satisfies ExceptionControlRecord;
  }

  async getOrCreateControl(businessId: string) {
    const existing = await this.getControl(businessId);
    if (existing) {
      return existing;
    }
    const [row] = await this.db
      .insert(procurementExceptionControl)
      .values({ id: randomUUID(), businessId })
      .returning();
    return {
      businessId: row!.businessId,
      highSeverityRequiresApproval: row!.highSeverityRequiresApproval,
      duplicateInvoiceRequiresDecision: row!.duplicateInvoiceRequiresDecision,
      defaultSlaDays: row!.defaultSlaDays,
    };
  }
}

export function createExceptionRepository() {
  return new ExceptionRepository();
}

export function createExceptionControlRepository() {
  return new ExceptionControlRepository();
}
