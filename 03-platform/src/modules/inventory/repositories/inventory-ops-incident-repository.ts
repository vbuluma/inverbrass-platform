/**
 * Purpose:
 * Persist operational inventory incidents with tenant isolation.
 *
 * Implementation Package:
 * BP-008 / IP-09 – Inventory Operations, Exceptions & Controls
 */

import { and, desc, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { inventoryOpsIncident, inventoryOpsIncidentEvent } from "@/db/schema/inventory-ops-incident";
import { inventoryOpsIncidentType } from "@/db/schema/inventory-ops-incident-type";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type {
  InventoryOpsIncidentEventInsert,
  InventoryOpsIncidentInsert,
  InventoryOpsIncidentPatch,
  InventoryOpsIncidentRecord,
  InventoryOpsIncidentTypeRef,
} from "@/modules/inventory/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapIncident(row: typeof inventoryOpsIncident.$inferSelect): InventoryOpsIncidentRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    incidentNumber: row.incidentNumber,
    incidentType: row.incidentType,
    severity: row.severity,
    status: row.status,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    stockItemId: row.stockItemId,
    locationId: row.locationId,
    description: row.description,
    detectedAt: row.detectedAt,
    investigationStartedAt: row.investigationStartedAt,
    resolvedAt: row.resolvedAt,
    closedAt: row.closedAt,
    resolutionAction: row.resolutionAction,
    resolutionReason: row.resolutionReason,
    resolutionNotes: row.resolutionNotes,
    linkedAdjustmentId: row.linkedAdjustmentId,
    makerId: row.makerId,
    checkerId: row.checkerId,
    idempotencyKey: row.idempotencyKey,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

export class InventoryOpsIncidentTypeRepository {
  constructor(private readonly db: DbClient = getDb()) {}

  async listActive(): Promise<InventoryOpsIncidentTypeRef[]> {
    const rows = await this.db
      .select()
      .from(inventoryOpsIncidentType)
      .where(eq(inventoryOpsIncidentType.isActive, true));
    return rows.map((row) => ({
      code: row.code,
      name: row.name,
      description: row.description,
      defaultSeverity: row.defaultSeverity,
      isActive: row.isActive,
    }));
  }
}

export class InventoryOpsIncidentRepository {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: InventoryOpsIncidentInsert) {
    const [row] = await this.db.insert(inventoryOpsIncident).values(values).returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
    }
    return mapIncident(row);
  }

  async update(businessId: string, incidentId: string, patch: InventoryOpsIncidentPatch) {
    const [row] = await this.db
      .update(inventoryOpsIncident)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(eq(inventoryOpsIncident.businessId, businessId), eq(inventoryOpsIncident.id, incidentId))
      )
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.INCIDENT_NOT_FOUND, undefined, 404);
    }
    return mapIncident(row);
  }

  async findById(businessId: string, incidentId: string) {
    const [row] = await this.db
      .select()
      .from(inventoryOpsIncident)
      .where(
        and(eq(inventoryOpsIncident.businessId, businessId), eq(inventoryOpsIncident.id, incidentId))
      )
      .limit(1);
    return row ? mapIncident(row) : null;
  }

  async findActiveBySource(
    businessId: string,
    sourceType: string,
    sourceId: string,
    incidentType: string
  ) {
    const [row] = await this.db
      .select()
      .from(inventoryOpsIncident)
      .where(
        and(
          eq(inventoryOpsIncident.businessId, businessId),
          eq(inventoryOpsIncident.sourceType, sourceType),
          eq(inventoryOpsIncident.sourceId, sourceId),
          eq(inventoryOpsIncident.incidentType, incidentType),
          inArray(inventoryOpsIncident.status, ["OPEN", "INVESTIGATING", "APPROVAL_PENDING"])
        )
      )
      .limit(1);
    return row ? mapIncident(row) : null;
  }

  async findByIdempotencyKey(businessId: string, idempotencyKey: string) {
    const [row] = await this.db
      .select()
      .from(inventoryOpsIncident)
      .where(
        and(
          eq(inventoryOpsIncident.businessId, businessId),
          eq(inventoryOpsIncident.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);
    return row ? mapIncident(row) : null;
  }

  async listByBusiness(businessId: string) {
    const rows = await this.db
      .select()
      .from(inventoryOpsIncident)
      .where(eq(inventoryOpsIncident.businessId, businessId))
      .orderBy(desc(inventoryOpsIncident.detectedAt));
    return rows.map(mapIncident);
  }

  async insertEvent(values: InventoryOpsIncidentEventInsert) {
    const [row] = await this.db.insert(inventoryOpsIncidentEvent).values(values).returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
    }
    return {
      id: row.id,
      businessId: row.businessId,
      incidentId: row.incidentId,
      eventType: row.eventType,
      note: row.note,
      actorId: row.actorId,
      createdAt: row.createdAt,
    };
  }

  async listEvents(businessId: string, incidentId: string) {
    const rows = await this.db
      .select()
      .from(inventoryOpsIncidentEvent)
      .where(
        and(
          eq(inventoryOpsIncidentEvent.businessId, businessId),
          eq(inventoryOpsIncidentEvent.incidentId, incidentId)
        )
      )
      .orderBy(inventoryOpsIncidentEvent.createdAt);
    return rows.map((row) => ({
      id: row.id,
      businessId: row.businessId,
      incidentId: row.incidentId,
      eventType: row.eventType,
      note: row.note,
      actorId: row.actorId,
      createdAt: row.createdAt,
    }));
  }
}

export function createInventoryOpsIncidentTypeRepository() {
  return new InventoryOpsIncidentTypeRepository();
}

export function createInventoryOpsIncidentRepository() {
  return new InventoryOpsIncidentRepository();
}
