/**
 * Purpose:
 * Audit helper for CRM Activity entities.
 *
 * Implementation Package:
 * BP-004 / IP-05 – Activity & Task Management
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  AUDIT_OPERATIONS,
  AUDIT_SOURCE_MODULES,
  buildAuditRecordFromContext,
  createFieldChanges,
  diffFieldChanges,
  type AuditService,
} from "@/core/audit";
import { AUDIT_ENTITY_NAMES } from "@/core/audit/constants";
import type { AuditFieldChange } from "@/core/audit/types";

type RecordCrmActivityAuditInput = {
  activityId: string;
  operation: string;
  changes?: AuditFieldChange[];
  createValues?: Record<string, unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  trackFields?: string[];
  metadata?: Record<string, unknown> | null;
};

export async function recordCrmActivityAudit(
  auditService: AuditService,
  context: CurrentBusinessContext,
  input: RecordCrmActivityAuditInput
): Promise<void> {
  let changes = input.changes;

  if (!changes && input.createValues) {
    changes = createFieldChanges(input.createValues);
  } else if (!changes && input.before && input.after && input.trackFields) {
    changes = diffFieldChanges(input.before, input.after, input.trackFields);
  }

  await auditService.record(
    buildAuditRecordFromContext(context, {
      entityName: AUDIT_ENTITY_NAMES.CRM_ACTIVITY,
      entityId: input.activityId,
      operation: input.operation,
      sourceModule: AUDIT_SOURCE_MODULES.CRM_ACTIVITY,
      changes,
      metadata: input.metadata,
    })
  );
}

export { AUDIT_OPERATIONS };
