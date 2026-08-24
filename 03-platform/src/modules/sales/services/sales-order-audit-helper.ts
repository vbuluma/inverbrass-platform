/**
 * Purpose:
 * Record BP-006 order audit events through the existing ENG-013 audit service.
 *
 * Implementation Package:
 * BP-006 / IP-01 – Sales & Order Creation
 * BP-006 / IP-03 – Delivery, Inspection & Service Completion
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
import { SALES_AUDIT_ACTIONS } from "@/modules/sales/constants";
import type { SalesAuditPort } from "@/modules/sales/ports";
import type { SalesAuditRecord } from "@/modules/sales/types";

function operationForAction(action: string): string {
  if (action === SALES_AUDIT_ACTIONS.ORDER_CREATED) {
    return AUDIT_OPERATIONS.CREATE;
  }
  if (
    action === SALES_AUDIT_ACTIONS.ORDER_CONFIRMED ||
    action === SALES_AUDIT_ACTIONS.ORDER_COMPLETED
  ) {
    return AUDIT_OPERATIONS.ACTIVATE;
  }
  return AUDIT_OPERATIONS.UPDATE;
}

export class SalesAuditAdapter implements SalesAuditPort {
  constructor(private readonly auditService: AuditService = createAuditService()) {}

  async record(entry: SalesAuditRecord): Promise<void> {
    const context: CurrentBusinessContext = {
      businessId: entry.businessId,
      platformUserId: entry.actorUserId ?? "",
      businessMembershipId: "",
    };
    await this.auditService.record(
      buildAuditRecordFromContext(context, {
        partyId: entry.partyId ?? null,
        entityName: AUDIT_ENTITY_NAMES.SALES_ORDER,
        entityId: entry.orderId,
        operation: operationForAction(entry.action),
        sourceModule: AUDIT_SOURCE_MODULES.SALES_ORDERS,
        changes: createFieldChanges({
          action: entry.action,
          outcome: entry.outcome,
          ...(entry.references ?? {}),
        }),
        metadata: {
          action: entry.action,
          outcome: entry.outcome,
          orderId: entry.orderId,
          ...(entry.references ?? {}),
        },
      })
    );
  }
}

export function createSalesAuditAdapter() {
  return new SalesAuditAdapter();
}

export class RecordingSalesAudit implements SalesAuditPort {
  readonly entries: SalesAuditRecord[] = [];

  async record(entry: SalesAuditRecord): Promise<void> {
    this.entries.push({
      ...entry,
      timestamp: entry.timestamp ?? new Date().toISOString(),
    });
  }
}
