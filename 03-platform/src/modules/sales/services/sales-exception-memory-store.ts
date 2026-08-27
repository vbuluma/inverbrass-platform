/**
 * Purpose:
 * In-memory IP-04 amendment and disposition store for smoke validation.
 *
 * Implementation Package:
 * BP-006 / IP-04 – Amendments, Cancellation & Returns
 */

import { SalesOrderError, SALES_ERROR_CODES } from "@/modules/sales/errors";
import type {
  SalesDispositionInstructionInsert,
  SalesDispositionInstructionRecord,
  SalesExceptionRepositoryPort,
  SalesOrderAmendmentInsert,
  SalesOrderAmendmentRecord,
} from "@/modules/sales/ports";

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class InMemorySalesExceptionStore implements SalesExceptionRepositoryPort {
  readonly instructions = new Map<string, SalesDispositionInstructionRecord>();
  readonly amendments = new Map<string, SalesOrderAmendmentRecord>();

  async insertInstruction(values: SalesDispositionInstructionInsert) {
    const id = values.id ?? crypto.randomUUID();
    const row: SalesDispositionInstructionRecord = {
      ...values,
      id,
      createdAt: new Date(),
    };
    this.instructions.set(id, row);
    return clone(row);
  }

  async updateInstruction(
    businessId: string,
    instructionId: string,
    values: Partial<SalesDispositionInstructionRecord>
  ) {
    const existing = await this.findInstructionById(businessId, instructionId);
    if (!existing) {
      throw new SalesOrderError(SALES_ERROR_CODES.DISPOSITION_NOT_FOUND, undefined, 404);
    }
    const next = { ...existing, ...values, id: existing.id, businessId: existing.businessId };
    this.instructions.set(instructionId, next);
    return clone(next);
  }

  async findInstructionById(businessId: string, instructionId: string) {
    const row = this.instructions.get(instructionId);
    if (!row || row.businessId !== businessId) {
      return null;
    }
    return clone(row);
  }

  async listInstructionsByOrder(businessId: string, orderId: string) {
    return [...this.instructions.values()]
      .filter((row) => row.businessId === businessId && row.salesOrderId === orderId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((row) => clone(row));
  }

  async insertAmendment(values: SalesOrderAmendmentInsert) {
    const id = values.id ?? crypto.randomUUID();
    const row: SalesOrderAmendmentRecord = {
      ...values,
      id,
      createdAt: new Date(),
    };
    this.amendments.set(id, row);
    return clone(row);
  }

  async updateAmendment(
    businessId: string,
    amendmentId: string,
    values: Partial<SalesOrderAmendmentRecord>
  ) {
    const existing = await this.findAmendmentById(businessId, amendmentId);
    if (!existing) {
      throw new SalesOrderError(SALES_ERROR_CODES.AMENDMENT_NOT_FOUND, undefined, 404);
    }
    const next = { ...existing, ...values, id: existing.id, businessId: existing.businessId };
    this.amendments.set(amendmentId, next);
    return clone(next);
  }

  async findAmendmentById(businessId: string, amendmentId: string) {
    const row = this.amendments.get(amendmentId);
    if (!row || row.businessId !== businessId) {
      return null;
    }
    return clone(row);
  }

  async listAmendmentsByOrder(businessId: string, orderId: string) {
    return [...this.amendments.values()]
      .filter((row) => row.businessId === businessId && row.salesOrderId === orderId)
      .sort((a, b) => a.versionNumber - b.versionNumber)
      .map((row) => clone(row));
  }
}

export function createInMemorySalesExceptionStore() {
  return new InMemorySalesExceptionStore();
}
