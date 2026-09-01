/**
 * Purpose:
 * Record BP-009 IP-01 events through ENG-013.
 */

import {
  AUDIT_ENTITY_NAMES,
  AUDIT_OPERATIONS,
  AUDIT_SOURCE_MODULES,
  buildAuditRecordFromContext,
  createAuditService,
  createFieldChanges,
  type AuditService,
} from "@/core/audit";
import type { CurrentBusinessContext } from "@/core/auth/types";
import { PROCUREMENT_AUDIT_ACTIONS } from "@/modules/procurement/constants";
import type { ProcurementAuditPort } from "@/modules/procurement/ports";
import type { ProcurementAuditRecord } from "@/modules/procurement/types";

function operationForAction(action: string): string {
  if (
    action === PROCUREMENT_AUDIT_ACTIONS.PROFILE_CREATED ||
    action === PROCUREMENT_AUDIT_ACTIONS.PARTY_LINKED ||
    action === PROCUREMENT_AUDIT_ACTIONS.QUALIFICATION_CREATED ||
    action === PROCUREMENT_AUDIT_ACTIONS.REQUEST_CREATED ||
    action === PROCUREMENT_AUDIT_ACTIONS.SOURCING_CREATED ||
    action === PROCUREMENT_AUDIT_ACTIONS.CONTRACT_CREATED ||
    action === PROCUREMENT_AUDIT_ACTIONS.RECEIPT_CREATED ||
    action === PROCUREMENT_AUDIT_ACTIONS.INVOICE_CREATED ||
    action === PROCUREMENT_AUDIT_ACTIONS.EXCEPTION_RAISED
  ) {
    return AUDIT_OPERATIONS.CREATE;
  }
  if (action === PROCUREMENT_AUDIT_ACTIONS.SUPPLIER_REACTIVATED) {
    return AUDIT_OPERATIONS.ACTIVATE;
  }
  if (action === PROCUREMENT_AUDIT_ACTIONS.SUPPLIER_DEACTIVATED) {
    return AUDIT_OPERATIONS.DEACTIVATE;
  }
  return AUDIT_OPERATIONS.UPDATE;
}

function entityNameForAction(action: string) {
  if (action.startsWith("PROCUREMENT_QUALIFICATION")) {
    return AUDIT_ENTITY_NAMES.SUPPLIER_QUALIFICATION;
  }
  if (action.startsWith("PROCUREMENT_REQUEST")) {
    return AUDIT_ENTITY_NAMES.PURCHASE_REQUEST;
  }
  if (action.startsWith("PROCUREMENT_SOURCING")) {
    return AUDIT_ENTITY_NAMES.SOURCING_EVENT;
  }
  if (action.startsWith("PROCUREMENT_CONTRACT")) {
    return AUDIT_ENTITY_NAMES.PROCUREMENT_CONTRACT;
  }
  if (action.startsWith("PROCUREMENT_RECEIPT") || action.startsWith("PROCUREMENT_GOODS") || action.startsWith("PROCUREMENT_ASSET") || action.startsWith("PROCUREMENT_SERVICE") || action.startsWith("PROCUREMENT_INSPECTION") || action.startsWith("PROCUREMENT_DISCREPANCY") || action.startsWith("PROCUREMENT_OVER")) {
    return AUDIT_ENTITY_NAMES.PROCUREMENT_RECEIPT;
  }
  if (
    action.startsWith("PROCUREMENT_INVOICE") ||
    action.startsWith("PROCUREMENT_AP_HANDOFF")
  ) {
    return AUDIT_ENTITY_NAMES.PROCUREMENT_SUPPLIER_INVOICE;
  }
  if (action.startsWith("PROCUREMENT_EXCEPTION")) {
    return AUDIT_ENTITY_NAMES.PROCUREMENT_EXCEPTION;
  }
  if (action.startsWith("PROCUREMENT_SCORECARD") || action.startsWith("PROCUREMENT_PERFORMANCE")) {
    return AUDIT_ENTITY_NAMES.PROCUREMENT_SCORECARD;
  }
  if (action.startsWith("PROCUREMENT_GOVERNANCE") || action.startsWith("PROCUREMENT_PREFERRED")) {
    return AUDIT_ENTITY_NAMES.PROCUREMENT_GOVERNANCE;
  }
  return AUDIT_ENTITY_NAMES.PROCUREMENT_PROFILE;
}

export class ProcurementAuditAdapter implements ProcurementAuditPort {
  constructor(private readonly auditService: AuditService = createAuditService()) {}

  async record(entry: ProcurementAuditRecord): Promise<void> {
    const context: CurrentBusinessContext = {
      businessId: entry.businessId,
      platformUserId: entry.actorUserId ?? "",
      businessMembershipId: "",
    };
    await this.auditService.record(
      buildAuditRecordFromContext(context, {
        entityName: entityNameForAction(entry.action),
        entityId: entry.entityId,
        operation: operationForAction(entry.action),
        sourceModule: AUDIT_SOURCE_MODULES.PROCUREMENT,
        changes: createFieldChanges({
          action: entry.action,
          outcome: entry.outcome,
          ...(entry.reason ? { reason: entry.reason } : {}),
          ...(entry.references ?? {}),
        }),
        metadata: {
          action: entry.action,
          outcome: entry.outcome,
          reason: entry.reason ?? null,
          ...(entry.references ?? {}),
        },
      })
    );
  }
}

export function createProcurementAuditAdapter() {
  return new ProcurementAuditAdapter();
}

export class RecordingProcurementAudit implements ProcurementAuditPort {
  readonly entries: ProcurementAuditRecord[] = [];

  async record(entry: ProcurementAuditRecord): Promise<void> {
    this.entries.push({
      ...entry,
      timestamp: entry.timestamp ?? new Date().toISOString(),
    });
  }
}
