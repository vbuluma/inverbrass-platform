/**
 * Purpose:
 * Record and resolve operational inventory incidents without mutating stock.
 *
 * Implementation Package:
 * BP-008 / IP-09 – Inventory Operations, Exceptions & Controls
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { DOCUMENT_NUMBERING_DOCUMENT_TYPES } from "@/core/localization-regulatory/document-numbering";
import type { DocumentNumberingPort } from "@/core/localization-regulatory/document-numbering";
import { createDocumentNumberingPolicyRepository } from "@/core/localization-regulatory/repositories/document-numbering-policy-repository";
import { ConfigurableDocumentNumberingService } from "@/core/localization-regulatory/services/document-numbering-service";
import { WORKFLOW_ENGINE_ERROR_CODES, WorkflowEngineError } from "@/core/workflow-engine";
import type { WorkflowEnginePort } from "@/core/workflow-engine";
import { createInventoryControlWorkflowAdapter } from "@/modules/inventory/adapters/inventory-control-workflow-adapter";
import {
  INVENTORY_AUDIT_ACTIONS,
  INVENTORY_OPERATION_CODES,
  INVENTORY_OPS_INCIDENT_STATUSES,
} from "@/modules/inventory/constants";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type {
  InventoryAuditPort,
  InventoryIdempotencyPort,
  InventoryLocationRepositoryPort,
  InventoryLockPort,
  InventoryOperationControlPort,
  InventoryOpsIncidentEventRepositoryPort,
  InventoryOpsIncidentRepositoryPort,
  InventoryOpsIncidentTypeCataloguePort,
  StockItemRepositoryPort,
} from "@/modules/inventory/ports";
import { createInventoryAuditAdapter } from "@/modules/inventory/services/inventory-audit-helper";
import { createInProcessInventoryLock } from "@/modules/inventory/services/inventory-lock";
import {
  assertIncidentTransition,
  assertIncidentType,
  assertResolutionAction,
  assertResolutionReason,
  assertSeverity,
  defaultIncidentTypes,
} from "@/modules/inventory/services/inventory-ops-incident-rules";
import { createInventoryIdempotencyRepository } from "@/modules/inventory/repositories/inventory-idempotency-repository";
import { createInventoryLocationRepository } from "@/modules/inventory/repositories/inventory-location-repository";
import {
  createInventoryOpsIncidentRepository,
  createInventoryOpsIncidentTypeRepository,
} from "@/modules/inventory/repositories/inventory-ops-incident-repository";
import { createInventoryOperationControlRepository } from "@/modules/inventory/repositories/inventory-operation-control-repository";
import { createStockItemRepository } from "@/modules/inventory/repositories/stock-item-repository";
import type { StockAdjustmentService } from "@/modules/inventory/services/stock-adjustment-service";
import type {
  CreateAdjustmentCommand,
  InventoryOpsIncidentRecord,
  InventoryOpsIncidentView,
  RecordOpsIncidentCommand,
  ResolveOpsIncidentCommand,
} from "@/modules/inventory/types";

export type InventoryOpsIncidentServiceDependencies = {
  types: InventoryOpsIncidentTypeCataloguePort;
  incidents: InventoryOpsIncidentRepositoryPort;
  events: InventoryOpsIncidentEventRepositoryPort;
  stockItems: StockItemRepositoryPort;
  locations: InventoryLocationRepositoryPort;
  controls: InventoryOperationControlPort;
  workflow: WorkflowEnginePort;
  numbering: DocumentNumberingPort;
  idempotency: InventoryIdempotencyPort;
  locks: InventoryLockPort;
  audit: InventoryAuditPort;
  adjustments?: StockAdjustmentService;
};

function actorId(context: CurrentBusinessContext): string | null {
  return context.platformUserId || null;
}

function lockKey(businessId: string, incidentId?: string) {
  return incidentId
    ? `inventory-ops-incident:${businessId}:${incidentId}`
    : `inventory-ops-incident:${businessId}`;
}

export class InventoryOpsIncidentService {
  constructor(private readonly deps: InventoryOpsIncidentServiceDependencies) {}

  async recordIncident(context: CurrentBusinessContext, command: RecordOpsIncidentCommand) {
    const businessId = context.businessId;
    return this.deps.locks.runExclusive(lockKey(businessId), async () => {
      if (command.idempotencyKey) {
        const existingKey = await this.deps.incidents.findByIdempotencyKey(
          businessId,
          command.idempotencyKey
        );
        if (existingKey) {
          return this.toView(businessId, existingKey);
        }
      }
      const types = await this.deps.types.listActive();
      const type = assertIncidentType(command.incidentType, types);
      const active = await this.deps.incidents.findActiveBySource(
        businessId,
        command.sourceType,
        command.sourceId,
        type.code
      );
      if (active) {
        return this.toView(businessId, active);
      }
      const allocated = await this.deps.numbering.allocate({
        businessId,
        documentType: DOCUMENT_NUMBERING_DOCUMENT_TYPES.INVENTORY_EXCEPTION,
      });
      const created = await this.deps.incidents.insert({
        businessId,
        incidentNumber: allocated.number,
        incidentType: type.code,
        severity: assertSeverity(command.severity, type.defaultSeverity),
        status: INVENTORY_OPS_INCIDENT_STATUSES.OPEN,
        sourceType: command.sourceType.trim(),
        sourceId: command.sourceId.trim(),
        stockItemId: command.stockItemId ?? null,
        locationId: command.locationId ?? null,
        description: command.description.trim(),
        detectedAt: new Date(),
        investigationStartedAt: null,
        resolvedAt: null,
        closedAt: null,
        resolutionAction: null,
        resolutionReason: null,
        resolutionNotes: null,
        linkedAdjustmentId: null,
        makerId: null,
        checkerId: null,
        idempotencyKey: command.idempotencyKey ?? null,
        createdBy: actorId(context),
        updatedBy: actorId(context),
      });
      await this.addEvent(businessId, created.id, "CREATED", command.description, actorId(context));
      await this.audit(context, created, INVENTORY_AUDIT_ACTIONS.EXCEPTION_CREATED);
      await this.audit(context, created, INVENTORY_AUDIT_ACTIONS.EXCEPTION_OPENED);
      return this.toView(businessId, created);
    });
  }

  async recordFromOperation(context: CurrentBusinessContext, command: RecordOpsIncidentCommand) {
    try {
      return await this.recordIncident(context, command);
    } catch {
      return null;
    }
  }

  async listIncidents(
    context: CurrentBusinessContext,
    query?: {
      status?: string | null;
      incidentType?: string | null;
      severity?: string | null;
      stockItemId?: string | null;
      locationId?: string | null;
    }
  ) {
    const rows = await this.deps.incidents.listByBusiness(context.businessId);
    const filtered = rows.filter((row) => {
      if (query?.status && row.status !== query.status) return false;
      if (query?.incidentType && row.incidentType !== query.incidentType) return false;
      if (query?.severity && row.severity !== query.severity) return false;
      if (query?.stockItemId && row.stockItemId !== query.stockItemId) return false;
      if (query?.locationId && row.locationId !== query.locationId) return false;
      return true;
    });
    const views: InventoryOpsIncidentView[] = [];
    for (const row of filtered) {
      views.push(await this.toView(context.businessId, row));
    }
    await this.deps.audit.record({
      businessId: context.businessId,
      actorUserId: actorId(context),
      entityName: "inventory_ops_incident",
      entityId: context.businessId,
      action: INVENTORY_AUDIT_ACTIONS.EXCEPTION_QUERY,
      outcome: "SUCCESS",
      references: { count: views.length },
    });
    return views;
  }

  async getIncident(context: CurrentBusinessContext, incidentId: string) {
    const row = await this.requireIncident(context.businessId, incidentId);
    return this.toView(context.businessId, row);
  }

  async startInvestigation(context: CurrentBusinessContext, incidentId: string) {
    return this.transition(context, incidentId, INVENTORY_OPS_INCIDENT_STATUSES.INVESTIGATING, {
      investigationStartedAt: new Date(),
    });
  }

  async requestResolution(context: CurrentBusinessContext, command: ResolveOpsIncidentCommand) {
    const businessId = context.businessId;
    return this.deps.locks.runExclusive(lockKey(businessId, command.incidentId), async () => {
      let current = await this.requireIncident(businessId, command.incidentId);
      if (current.status === INVENTORY_OPS_INCIDENT_STATUSES.OPEN) {
        assertIncidentTransition(current.status, INVENTORY_OPS_INCIDENT_STATUSES.INVESTIGATING);
        current = await this.deps.incidents.update(businessId, current.id, {
          status: INVENTORY_OPS_INCIDENT_STATUSES.INVESTIGATING,
          investigationStartedAt: current.investigationStartedAt ?? new Date(),
          updatedBy: actorId(context),
        });
        await this.addEvent(businessId, current.id, "INVESTIGATING", null, actorId(context));
        await this.audit(context, current, INVENTORY_AUDIT_ACTIONS.EXCEPTION_INVESTIGATING);
      }
      if (current.status !== INVENTORY_OPS_INCIDENT_STATUSES.INVESTIGATING) {
        throw new InventoryError(INVENTORY_ERROR_CODES.INCIDENT_NOT_ACTIONABLE);
      }
      const action = assertResolutionAction(command.resolutionAction);
      const reason = assertResolutionReason(command.reason);
      const decision = await this.deps.workflow.evaluateOperationApproval({
        businessId,
        operationCode: INVENTORY_OPERATION_CODES.OPS_INCIDENT_RESOLUTION,
      });
      if (decision.required) {
        assertIncidentTransition(
          current.status,
          INVENTORY_OPS_INCIDENT_STATUSES.APPROVAL_PENDING
        );
        const pending = await this.deps.incidents.update(businessId, current.id, {
          status: INVENTORY_OPS_INCIDENT_STATUSES.APPROVAL_PENDING,
          investigationStartedAt: current.investigationStartedAt ?? new Date(),
          resolutionAction: action,
          resolutionReason: reason,
          resolutionNotes: command.notes ?? null,
          makerId: actorId(context),
          updatedBy: actorId(context),
        });
        await this.addEvent(businessId, current.id, "RESOLUTION_REQUESTED", reason, actorId(context));
        await this.audit(context, pending, INVENTORY_AUDIT_ACTIONS.EXCEPTION_RESOLUTION_REQUESTED);
        return this.toView(businessId, pending);
      }
      return this.completeResolution(context, current, command, action, reason);
    });
  }

  async approveResolution(context: CurrentBusinessContext, incidentId: string) {
    const businessId = context.businessId;
    return this.deps.locks.runExclusive(lockKey(businessId, incidentId), async () => {
      const current = await this.requireIncident(businessId, incidentId);
      if (current.status !== INVENTORY_OPS_INCIDENT_STATUSES.APPROVAL_PENDING) {
        throw new InventoryError(INVENTORY_ERROR_CODES.INCIDENT_NOT_ACTIONABLE);
      }
      this.assertChecker(current.makerId, actorId(context));
      const resolved = await this.completeResolution(
        context,
        current,
        {
          incidentId,
          resolutionAction: current.resolutionAction ?? "MANUAL_REVIEW_COMPLETED",
          reason: current.resolutionReason ?? "Approved",
          notes: current.resolutionNotes,
        },
        current.resolutionAction ?? "MANUAL_REVIEW_COMPLETED",
        current.resolutionReason ?? "Approved",
        actorId(context)
      );
      await this.audit(context, current, INVENTORY_AUDIT_ACTIONS.EXCEPTION_APPROVED);
      return resolved;
    });
  }

  async rejectResolution(context: CurrentBusinessContext, incidentId: string, reason: string) {
    const businessId = context.businessId;
    return this.deps.locks.runExclusive(lockKey(businessId, incidentId), async () => {
      const current = await this.requireIncident(businessId, incidentId);
      if (current.status !== INVENTORY_OPS_INCIDENT_STATUSES.APPROVAL_PENDING) {
        throw new InventoryError(INVENTORY_ERROR_CODES.INCIDENT_NOT_ACTIONABLE);
      }
      this.assertChecker(current.makerId, actorId(context));
      const updated = await this.deps.incidents.update(businessId, current.id, {
        status: INVENTORY_OPS_INCIDENT_STATUSES.INVESTIGATING,
        checkerId: actorId(context),
        resolutionNotes: reason,
        updatedBy: actorId(context),
      });
      await this.addEvent(businessId, current.id, "RESOLUTION_REJECTED", reason, actorId(context));
      await this.audit(context, updated, INVENTORY_AUDIT_ACTIONS.EXCEPTION_REJECTED);
      return this.toView(businessId, updated);
    });
  }

  async rejectIncident(context: CurrentBusinessContext, incidentId: string, reason: string) {
    return this.transition(context, incidentId, INVENTORY_OPS_INCIDENT_STATUSES.REJECTED, {
      resolutionAction: "REJECTED_AS_FALSE_POSITIVE",
      resolutionReason: assertResolutionReason(reason),
      resolvedAt: new Date(),
    });
  }

  async closeIncident(context: CurrentBusinessContext, incidentId: string, reason: string) {
    return this.transition(context, incidentId, INVENTORY_OPS_INCIDENT_STATUSES.CLOSED, {
      resolutionReason: assertResolutionReason(reason),
      closedAt: new Date(),
    });
  }

  async listTypes() {
    const rows = await this.deps.types.listActive();
    return rows.length > 0 ? rows : defaultIncidentTypes();
  }

  processTransferAttempt(): never {
    throw new InventoryError(INVENTORY_ERROR_CODES.TRANSFER_PROCESSING_UNAVAILABLE);
  }

  private async completeResolution(
    context: CurrentBusinessContext,
    current: InventoryOpsIncidentRecord,
    command: ResolveOpsIncidentCommand,
    action: string,
    reason: string,
    checkerId?: string | null
  ) {
    const businessId = context.businessId;
    assertIncidentTransition(
      current.status === INVENTORY_OPS_INCIDENT_STATUSES.APPROVAL_PENDING
        ? current.status
        : INVENTORY_OPS_INCIDENT_STATUSES.INVESTIGATING,
      INVENTORY_OPS_INCIDENT_STATUSES.RESOLVED
    );
    let linkedAdjustmentId = current.linkedAdjustmentId;
    if (command.adjustment) {
      if (!this.deps.adjustments) {
        throw new InventoryError(INVENTORY_ERROR_CODES.PROVIDER_ERROR);
      }
      const created = await this.deps.adjustments.createAdjustment(context, {
        ...command.adjustment,
        originType: "OPS_INCIDENT",
        originId: current.id,
      } as CreateAdjustmentCommand);
      linkedAdjustmentId = created.id;
    }
    const updated = await this.deps.incidents.update(businessId, current.id, {
      status: INVENTORY_OPS_INCIDENT_STATUSES.RESOLVED,
      investigationStartedAt: current.investigationStartedAt ?? new Date(),
      resolvedAt: new Date(),
      resolutionAction: action,
      resolutionReason: reason,
      resolutionNotes: command.notes ?? current.resolutionNotes,
      linkedAdjustmentId,
      makerId: current.makerId ?? actorId(context),
      checkerId: checkerId ?? current.checkerId,
      updatedBy: actorId(context),
    });
    await this.addEvent(businessId, current.id, "RESOLVED", reason, actorId(context));
    await this.audit(context, updated, INVENTORY_AUDIT_ACTIONS.EXCEPTION_RESOLVED);
    return this.toView(businessId, updated);
  }

  private async transition(
    context: CurrentBusinessContext,
    incidentId: string,
    nextStatus: string,
    patch: Partial<InventoryOpsIncidentRecord>
  ) {
    const businessId = context.businessId;
    return this.deps.locks.runExclusive(lockKey(businessId, incidentId), async () => {
      const current = await this.requireIncident(businessId, incidentId);
      assertIncidentTransition(current.status, nextStatus);
      const updated = await this.deps.incidents.update(businessId, current.id, {
        ...patch,
        status: nextStatus,
        updatedBy: actorId(context),
      });
      const action =
        nextStatus === INVENTORY_OPS_INCIDENT_STATUSES.INVESTIGATING
          ? INVENTORY_AUDIT_ACTIONS.EXCEPTION_INVESTIGATING
          : nextStatus === INVENTORY_OPS_INCIDENT_STATUSES.REJECTED
            ? INVENTORY_AUDIT_ACTIONS.EXCEPTION_REJECTED
            : INVENTORY_AUDIT_ACTIONS.EXCEPTION_CLOSED;
      await this.addEvent(businessId, current.id, nextStatus, patch.resolutionReason ?? null, actorId(context));
      await this.audit(context, updated, action);
      return this.toView(businessId, updated);
    });
  }

  private async requireIncident(businessId: string, incidentId: string) {
    const row = await this.deps.incidents.findById(businessId, incidentId);
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.INCIDENT_NOT_FOUND, undefined, 404);
    }
    return row;
  }

  private async addEvent(
    businessId: string,
    incidentId: string,
    eventType: string,
    note: string | null,
    actor: string | null
  ) {
    await this.deps.events.insertEvent({
      businessId,
      incidentId,
      eventType,
      note,
      actorId: actor,
    });
  }

  private async audit(
    context: CurrentBusinessContext,
    row: InventoryOpsIncidentRecord,
    action: string
  ) {
    await this.deps.audit.record({
      businessId: context.businessId,
      actorUserId: actorId(context),
      entityName: "inventory_ops_incident",
      entityId: row.id,
      action,
      outcome: "SUCCESS",
      references: {
        incidentNumber: row.incidentNumber,
        incidentType: row.incidentType,
        severity: row.severity,
        sourceType: row.sourceType,
        sourceId: row.sourceId,
        status: row.status,
      },
    });
  }

  private assertChecker(submittedBy: string | null, checkerId: string | null) {
    try {
      this.deps.workflow.assertDistinctActors(
        submittedBy ?? "",
        checkerId ?? "",
        "The person who submitted this exception cannot approve it."
      );
    } catch (error) {
      if (
        error instanceof WorkflowEngineError &&
        error.code === WORKFLOW_ENGINE_ERROR_CODES.SELF_APPROVAL
      ) {
        throw new InventoryError(INVENTORY_ERROR_CODES.SELF_APPROVAL);
      }
      throw error;
    }
  }

  private async toView(
    businessId: string,
    row: InventoryOpsIncidentRecord
  ): Promise<InventoryOpsIncidentView> {
    const [types, item, location, events] = await Promise.all([
      this.deps.types.listActive(),
      row.stockItemId ? this.deps.stockItems.findById(businessId, row.stockItemId) : null,
      row.locationId ? this.deps.locations.findById(businessId, row.locationId) : null,
      this.deps.events.listEvents(businessId, row.id),
    ]);
    const type = types.find((entry) => entry.code === row.incidentType);
    return {
      ...row,
      incidentTypeLabel: type?.name ?? row.incidentType.replaceAll("_", " "),
      sku: item?.sku ?? null,
      locationName: location?.name ?? null,
      events,
    };
  }
}

export function createDefaultInventoryOpsIncidentDependencies(): InventoryOpsIncidentServiceDependencies {
  const controls = createInventoryOperationControlRepository();
  const incidents = createInventoryOpsIncidentRepository();
  return {
    types: createInventoryOpsIncidentTypeRepository(),
    incidents,
    events: incidents,
    stockItems: createStockItemRepository(),
    locations: createInventoryLocationRepository(),
    controls,
    workflow: createInventoryControlWorkflowAdapter(controls),
    numbering: new ConfigurableDocumentNumberingService(createDocumentNumberingPolicyRepository()),
    idempotency: createInventoryIdempotencyRepository(),
    locks: createInProcessInventoryLock(),
    audit: createInventoryAuditAdapter(),
  };
}

export function createInventoryOpsIncidentService(deps?: InventoryOpsIncidentServiceDependencies) {
  return new InventoryOpsIncidentService(deps ?? createDefaultInventoryOpsIncidentDependencies());
}
