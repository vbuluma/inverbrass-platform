/**
 * Purpose:
 * CRM audit recording helpers for quotation entities.
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  buildAuditRecordFromContext,
  createFieldChanges,
  diffFieldChanges,
  type AuditService,
} from "@/core/audit";
import type { AuditFieldChange } from "@/core/audit/types";

export const CRM_AUDIT_ENTITY_NAMES = {
  QUOTATION: "quotation",
  QUOTATION_VERSION: "quotation_version",
  QUOTATION_LINE: "quotation_line",
  CAMPAIGN: "campaign",
  CAMPAIGN_MEMBER: "campaign_member",
  SALES_ORDER: "sales_order",
} as const;

export const CRM_AUDIT_SOURCE_MODULE = "crm_quotations" as const;
export const CRM_AUDIT_SOURCE_MODULE_CAMPAIGN = "crm_campaigns" as const;

type RecordCrmEntityAuditInput = {
  partyId?: string | null;
  entityName: string;
  entityId: string;
  operation: string;
  changes?: AuditFieldChange[];
  createValues?: Record<string, unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  trackFields?: string[];
  metadata?: Record<string, unknown> | null;
  sourceModule?: string;
};

export async function recordCrmEntityAudit(
  auditService: AuditService,
  context: CurrentBusinessContext,
  input: RecordCrmEntityAuditInput
): Promise<void> {
  let changes = input.changes;

  if (!changes && input.createValues) {
    changes = createFieldChanges(input.createValues);
  }

  if (!changes && input.before && input.after) {
    changes = diffFieldChanges(input.before, input.after, input.trackFields);
  }

  await auditService.record(
    buildAuditRecordFromContext(context, {
      partyId: input.partyId ?? null,
      entityName: input.entityName,
      entityId: input.entityId,
      operation: input.operation,
      changes,
      sourceModule: input.sourceModule ?? CRM_AUDIT_SOURCE_MODULE,
      metadata: input.metadata,
    })
  );
}
