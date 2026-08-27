/**
 * Purpose:
 * Persist BP-006 IP-03 delivery events and inspection outcomes.
 *
 * Implementation Package:
 * BP-006 / IP-03 – Delivery, Inspection & Service Completion
 */

import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import {
  salesDeliveryEvent,
  salesInspectionOutcome,
} from "@/db/schema/sales-delivery";
import { SalesOrderError, SALES_ERROR_CODES } from "@/modules/sales/errors";
import type {
  SalesDeliveryEventInsert,
  SalesDeliveryEventRecord,
  SalesDeliveryRepositoryPort,
  SalesInspectionOutcomeInsert,
  SalesInspectionOutcomeRecord,
} from "@/modules/sales/ports";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapEvent(
  row: typeof salesDeliveryEvent.$inferSelect
): SalesDeliveryEventRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    salesOrderId: row.salesOrderId,
    salesOrderLineId: row.salesOrderLineId,
    eventType: row.eventType,
    status: row.status,
    claimedQuantity: String(row.claimedQuantity),
    deliveredAt: row.deliveredAt,
    recordedBy: row.recordedBy,
    recordedAt: row.recordedAt,
    notes: row.notes,
    evidenceNote: row.evidenceNote,
    evidenceRef: row.evidenceRef,
    completedBy: row.completedBy,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  };
}

function mapInspection(
  row: typeof salesInspectionOutcome.$inferSelect
): SalesInspectionOutcomeRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    salesOrderId: row.salesOrderId,
    salesOrderLineId: row.salesOrderLineId,
    deliveryEventId: row.deliveryEventId,
    acceptedQuantity: String(row.acceptedQuantity),
    rejectedQuantity: String(row.rejectedQuantity),
    comments: row.comments,
    rejectionReasonCode: row.rejectionReasonCode,
    qualityFindingCode: row.qualityFindingCode,
    evidenceNote: row.evidenceNote,
    evidenceRef: row.evidenceRef,
    inspectedBy: row.inspectedBy,
    inspectedAt: row.inspectedAt,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  };
}

export class SalesDeliveryRepository implements SalesDeliveryRepositoryPort {
  constructor(private readonly dbClient: DbClient = getDb()) {}

  async insertEvent(values: SalesDeliveryEventInsert): Promise<SalesDeliveryEventRecord> {
    const [row] = await this.dbClient
      .insert(salesDeliveryEvent)
      .values({
        id: values.id,
        businessId: values.businessId,
        salesOrderId: values.salesOrderId,
        salesOrderLineId: values.salesOrderLineId,
        eventType: values.eventType,
        status: values.status,
        claimedQuantity: values.claimedQuantity,
        deliveredAt: values.deliveredAt,
        recordedBy: values.recordedBy,
        recordedAt: values.recordedAt,
        notes: values.notes,
        evidenceNote: values.evidenceNote,
        evidenceRef: values.evidenceRef,
        completedBy: values.completedBy,
        completedAt: values.completedAt,
        createdBy: values.createdBy,
      })
      .returning();
    return mapEvent(row);
  }

  async updateEvent(
    businessId: string,
    eventId: string,
    values: Partial<SalesDeliveryEventRecord>
  ): Promise<SalesDeliveryEventRecord> {
    const [row] = await this.dbClient
      .update(salesDeliveryEvent)
      .set({
        status: values.status,
        claimedQuantity: values.claimedQuantity,
        notes: values.notes,
        evidenceNote: values.evidenceNote,
        evidenceRef: values.evidenceRef,
        completedBy: values.completedBy,
        completedAt: values.completedAt,
      })
      .where(
        and(
          eq(salesDeliveryEvent.businessId, businessId),
          eq(salesDeliveryEvent.id, eventId)
        )
      )
      .returning();
    if (!row) {
      throw new SalesOrderError(SALES_ERROR_CODES.DELIVERY_NOT_FOUND, undefined, 404);
    }
    return mapEvent(row);
  }

  async findEventById(businessId: string, eventId: string) {
    const [row] = await this.dbClient
      .select()
      .from(salesDeliveryEvent)
      .where(
        and(
          eq(salesDeliveryEvent.businessId, businessId),
          eq(salesDeliveryEvent.id, eventId)
        )
      )
      .limit(1);
    return row ? mapEvent(row) : null;
  }

  async listEventsByOrder(businessId: string, orderId: string) {
    const rows = await this.dbClient
      .select()
      .from(salesDeliveryEvent)
      .where(
        and(
          eq(salesDeliveryEvent.businessId, businessId),
          eq(salesDeliveryEvent.salesOrderId, orderId)
        )
      );
    return rows.map(mapEvent);
  }

  async insertInspection(values: SalesInspectionOutcomeInsert) {
    const [row] = await this.dbClient
      .insert(salesInspectionOutcome)
      .values({
        id: values.id,
        businessId: values.businessId,
        salesOrderId: values.salesOrderId,
        salesOrderLineId: values.salesOrderLineId,
        deliveryEventId: values.deliveryEventId,
        acceptedQuantity: values.acceptedQuantity,
        rejectedQuantity: values.rejectedQuantity,
        comments: values.comments,
        rejectionReasonCode: values.rejectionReasonCode,
        qualityFindingCode: values.qualityFindingCode,
        evidenceNote: values.evidenceNote,
        evidenceRef: values.evidenceRef,
        inspectedBy: values.inspectedBy,
        inspectedAt: values.inspectedAt,
        createdBy: values.createdBy,
      })
      .returning();
    return mapInspection(row);
  }

  async findInspectionByEvent(businessId: string, eventId: string) {
    const [row] = await this.dbClient
      .select()
      .from(salesInspectionOutcome)
      .where(
        and(
          eq(salesInspectionOutcome.businessId, businessId),
          eq(salesInspectionOutcome.deliveryEventId, eventId)
        )
      )
      .limit(1);
    return row ? mapInspection(row) : null;
  }

  async listInspectionsByOrder(businessId: string, orderId: string) {
    const rows = await this.dbClient
      .select()
      .from(salesInspectionOutcome)
      .where(
        and(
          eq(salesInspectionOutcome.businessId, businessId),
          eq(salesInspectionOutcome.salesOrderId, orderId)
        )
      );
    return rows.map(mapInspection);
  }
}

export function createSalesDeliveryRepository() {
  return new SalesDeliveryRepository();
}
