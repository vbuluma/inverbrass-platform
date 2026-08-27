/**
 * Purpose:
 * In-memory IP-03 delivery and inspection store for smoke validation.
 *
 * Implementation Package:
 * BP-006 / IP-03 – Delivery, Inspection & Service Completion
 */

import { SalesOrderError, SALES_ERROR_CODES } from "@/modules/sales/errors";
import type {
  SalesDeliveryEventInsert,
  SalesDeliveryEventRecord,
  SalesDeliveryRepositoryPort,
  SalesInspectionOutcomeInsert,
  SalesInspectionOutcomeRecord,
} from "@/modules/sales/ports";

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class InMemorySalesDeliveryStore implements SalesDeliveryRepositoryPort {
  readonly events = new Map<string, SalesDeliveryEventRecord>();
  readonly inspections = new Map<string, SalesInspectionOutcomeRecord>();

  async insertEvent(values: SalesDeliveryEventInsert): Promise<SalesDeliveryEventRecord> {
    const id = values.id ?? crypto.randomUUID();
    const row: SalesDeliveryEventRecord = {
      ...values,
      id,
      createdAt: new Date(),
    };
    this.events.set(id, row);
    return clone(row);
  }

  async updateEvent(
    businessId: string,
    eventId: string,
    values: Partial<SalesDeliveryEventRecord>
  ): Promise<SalesDeliveryEventRecord> {
    const existing = await this.findEventById(businessId, eventId);
    if (!existing) {
      throw new SalesOrderError(SALES_ERROR_CODES.DELIVERY_NOT_FOUND, undefined, 404);
    }
    const next: SalesDeliveryEventRecord = {
      ...existing,
      ...values,
      id: existing.id,
      businessId: existing.businessId,
    };
    this.events.set(eventId, next);
    return clone(next);
  }

  async findEventById(businessId: string, eventId: string) {
    const row = this.events.get(eventId);
    if (!row || row.businessId !== businessId) {
      return null;
    }
    return clone(row);
  }

  async listEventsByOrder(businessId: string, orderId: string) {
    return [...this.events.values()]
      .filter((row) => row.businessId === businessId && row.salesOrderId === orderId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((row) => clone(row));
  }

  async insertInspection(
    values: SalesInspectionOutcomeInsert
  ): Promise<SalesInspectionOutcomeRecord> {
    const duplicate = [...this.inspections.values()].find(
      (row) => row.deliveryEventId === values.deliveryEventId
    );
    if (duplicate) {
      throw new SalesOrderError(
        SALES_ERROR_CODES.DELIVERY_ALREADY_INSPECTED,
        undefined,
        409
      );
    }
    const id = values.id ?? crypto.randomUUID();
    const row: SalesInspectionOutcomeRecord = {
      ...values,
      id,
      createdAt: new Date(),
    };
    this.inspections.set(id, row);
    return clone(row);
  }

  async findInspectionByEvent(businessId: string, eventId: string) {
    const row = [...this.inspections.values()].find(
      (item) => item.businessId === businessId && item.deliveryEventId === eventId
    );
    return row ? clone(row) : null;
  }

  async listInspectionsByOrder(businessId: string, orderId: string) {
    return [...this.inspections.values()]
      .filter((row) => row.businessId === businessId && row.salesOrderId === orderId)
      .map((row) => clone(row));
  }
}

export function createInMemorySalesDeliveryStore() {
  return new InMemorySalesDeliveryStore();
}
