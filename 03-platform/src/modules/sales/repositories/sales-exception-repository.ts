/**
 * Purpose:
 * Persist BP-006 IP-04 cancellation/return instructions and amendment versions.
 *
 * Implementation Package:
 * BP-006 / IP-04 – Amendments, Cancellation & Returns
 */

import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import {
  salesDispositionInstruction,
  salesOrderAmendment,
} from "@/db/schema/sales-exception";
import { SalesOrderError, SALES_ERROR_CODES } from "@/modules/sales/errors";
import type {
  SalesDispositionInstructionInsert,
  SalesDispositionInstructionRecord,
  SalesExceptionRepositoryPort,
  SalesOrderAmendmentInsert,
  SalesOrderAmendmentRecord,
} from "@/modules/sales/ports";
import type { CommercialSnapshot, CommercialTransactionContract } from "@/modules/commercial/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapInstruction(
  row: typeof salesDispositionInstruction.$inferSelect
): SalesDispositionInstructionRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    salesOrderId: row.salesOrderId,
    salesOrderLineId: row.salesOrderLineId,
    instructionType: row.instructionType,
    status: row.status,
    quantity: String(row.quantity),
    reasonCode: row.reasonCode,
    comments: row.comments,
    financialInstructionEmitted: row.financialInstructionEmitted,
    stockInstructionEmitted: row.stockInstructionEmitted,
    refundExecuted: row.refundExecuted,
    stockMoved: row.stockMoved,
    submittedBy: row.submittedBy,
    submittedAt: row.submittedAt,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt,
    rejectedBy: row.rejectedBy,
    rejectedAt: row.rejectedAt,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  };
}

function mapAmendment(
  row: typeof salesOrderAmendment.$inferSelect
): SalesOrderAmendmentRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    salesOrderId: row.salesOrderId,
    salesOrderLineId: row.salesOrderLineId,
    versionNumber: row.versionNumber,
    status: row.status,
    reason: row.reason,
    previousQuantity: String(row.previousQuantity),
    proposedQuantity: String(row.proposedQuantity),
    previousExpectedAmount: String(row.previousExpectedAmount),
    proposedExpectedAmount: String(row.proposedExpectedAmount),
    previousCommercialContractId: row.previousCommercialContractId,
    proposedCommercialContractId: row.proposedCommercialContractId,
    previousSnapshotId: row.previousSnapshotId,
    proposedSnapshotId: row.proposedSnapshotId,
    snapshotPayload: row.snapshotPayload as CommercialSnapshot,
    contractPayload: row.contractPayload as CommercialTransactionContract,
    proposedBy: row.proposedBy,
    proposedAt: row.proposedAt,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  };
}

export class SalesExceptionRepository implements SalesExceptionRepositoryPort {
  constructor(private readonly dbClient: DbClient = getDb()) {}

  async insertInstruction(values: SalesDispositionInstructionInsert) {
    const [row] = await this.dbClient
      .insert(salesDispositionInstruction)
      .values({
        id: values.id,
        businessId: values.businessId,
        salesOrderId: values.salesOrderId,
        salesOrderLineId: values.salesOrderLineId,
        instructionType: values.instructionType,
        status: values.status,
        quantity: values.quantity,
        reasonCode: values.reasonCode,
        comments: values.comments,
        financialInstructionEmitted: values.financialInstructionEmitted,
        stockInstructionEmitted: values.stockInstructionEmitted,
        refundExecuted: false,
        stockMoved: false,
        submittedBy: values.submittedBy,
        submittedAt: values.submittedAt,
        approvedBy: values.approvedBy,
        approvedAt: values.approvedAt,
        createdBy: values.createdBy,
      })
      .returning();
    return mapInstruction(row);
  }

  async updateInstruction(
    businessId: string,
    instructionId: string,
    values: Partial<SalesDispositionInstructionRecord>
  ) {
    const [row] = await this.dbClient
      .update(salesDispositionInstruction)
      .set({
        status: values.status,
        approvedBy: values.approvedBy,
        approvedAt: values.approvedAt,
        rejectedBy: values.rejectedBy,
        rejectedAt: values.rejectedAt,
        comments: values.comments,
      })
      .where(
        and(
          eq(salesDispositionInstruction.businessId, businessId),
          eq(salesDispositionInstruction.id, instructionId)
        )
      )
      .returning();
    if (!row) {
      throw new SalesOrderError(SALES_ERROR_CODES.DISPOSITION_NOT_FOUND, undefined, 404);
    }
    return mapInstruction(row);
  }

  async findInstructionById(businessId: string, instructionId: string) {
    const [row] = await this.dbClient
      .select()
      .from(salesDispositionInstruction)
      .where(
        and(
          eq(salesDispositionInstruction.businessId, businessId),
          eq(salesDispositionInstruction.id, instructionId)
        )
      )
      .limit(1);
    return row ? mapInstruction(row) : null;
  }

  async listInstructionsByOrder(businessId: string, orderId: string) {
    const rows = await this.dbClient
      .select()
      .from(salesDispositionInstruction)
      .where(
        and(
          eq(salesDispositionInstruction.businessId, businessId),
          eq(salesDispositionInstruction.salesOrderId, orderId)
        )
      );
    return rows.map(mapInstruction);
  }

  async insertAmendment(values: SalesOrderAmendmentInsert) {
    const [row] = await this.dbClient
      .insert(salesOrderAmendment)
      .values({
        id: values.id,
        businessId: values.businessId,
        salesOrderId: values.salesOrderId,
        salesOrderLineId: values.salesOrderLineId,
        versionNumber: values.versionNumber,
        status: values.status,
        reason: values.reason,
        previousQuantity: values.previousQuantity,
        proposedQuantity: values.proposedQuantity,
        previousExpectedAmount: values.previousExpectedAmount,
        proposedExpectedAmount: values.proposedExpectedAmount,
        previousCommercialContractId: values.previousCommercialContractId,
        proposedCommercialContractId: values.proposedCommercialContractId,
        previousSnapshotId: values.previousSnapshotId,
        proposedSnapshotId: values.proposedSnapshotId,
        snapshotPayload: values.snapshotPayload,
        contractPayload: values.contractPayload,
        proposedBy: values.proposedBy,
        proposedAt: values.proposedAt,
        approvedBy: values.approvedBy,
        approvedAt: values.approvedAt,
        createdBy: values.createdBy,
      })
      .returning();
    return mapAmendment(row);
  }

  async updateAmendment(
    businessId: string,
    amendmentId: string,
    values: Partial<SalesOrderAmendmentRecord>
  ) {
    const [row] = await this.dbClient
      .update(salesOrderAmendment)
      .set({
        status: values.status,
        approvedBy: values.approvedBy,
        approvedAt: values.approvedAt,
      })
      .where(
        and(
          eq(salesOrderAmendment.businessId, businessId),
          eq(salesOrderAmendment.id, amendmentId)
        )
      )
      .returning();
    if (!row) {
      throw new SalesOrderError(SALES_ERROR_CODES.AMENDMENT_NOT_FOUND, undefined, 404);
    }
    return mapAmendment(row);
  }

  async findAmendmentById(businessId: string, amendmentId: string) {
    const [row] = await this.dbClient
      .select()
      .from(salesOrderAmendment)
      .where(
        and(
          eq(salesOrderAmendment.businessId, businessId),
          eq(salesOrderAmendment.id, amendmentId)
        )
      )
      .limit(1);
    return row ? mapAmendment(row) : null;
  }

  async listAmendmentsByOrder(businessId: string, orderId: string) {
    const rows = await this.dbClient
      .select()
      .from(salesOrderAmendment)
      .where(
        and(
          eq(salesOrderAmendment.businessId, businessId),
          eq(salesOrderAmendment.salesOrderId, orderId)
        )
      );
    return rows.map(mapAmendment);
  }
}

export function createSalesExceptionRepository() {
  return new SalesExceptionRepository();
}
