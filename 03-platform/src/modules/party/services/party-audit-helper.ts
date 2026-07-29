/**
 * Purpose:
 * Convenience wrapper for recording Party-scoped audit entries from services.
 *
 * Architecture:
 * Party Service → recordPartyEntityAudit → AuditService → AuditHistoryRepository
 *
 * Implementation Package:
 * BP-002 / IP-011 – Enterprise Audit History
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  buildAuditRecordFromContext,
  createFieldChanges,
  diffFieldChanges,
  type AuditService,
} from "@/core/audit";
import type { AuditFieldChange } from "@/core/audit/types";
import { AUDIT_OPERATIONS } from "@/core/audit/constants";

export function inferAuditOperationFromEventType(eventType: string): string {
  const normalized = eventType.toUpperCase();
  if (normalized.includes("CREATED") || normalized.includes("REGISTERED")) {
    return AUDIT_OPERATIONS.CREATE;
  }
  if (
    normalized.includes("REMOVED") ||
    normalized.includes("DELETED") ||
    normalized.includes("LEFT")
  ) {
    return AUDIT_OPERATIONS.DELETE;
  }
  if (normalized.includes("VERIFIED")) {
    return AUDIT_OPERATIONS.VERIFY;
  }
  if (
    normalized.includes("DEACTIVATED") ||
    normalized.includes("ENDED") ||
    normalized.includes("SUSPENDED")
  ) {
    return AUDIT_OPERATIONS.DEACTIVATE;
  }
  if (
    normalized.includes("REACTIVATED") ||
    normalized.includes("JOINED") ||
    normalized.includes("ACTIVATED")
  ) {
    return AUDIT_OPERATIONS.ACTIVATE;
  }
  if (normalized.includes("ARCHIVED")) {
    return AUDIT_OPERATIONS.ARCHIVE;
  }
  if (normalized.includes("RESTORED")) {
    return AUDIT_OPERATIONS.RESTORE;
  }
  return AUDIT_OPERATIONS.UPDATE;
}

type RecordPartyEntityAuditInput = {
  partyId: string;
  entityName: string;
  entityId: string;
  operation: string;
  sourceModule: string;
  changes?: AuditFieldChange[];
  createValues?: Record<string, unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  trackFields?: string[];
  metadata?: Record<string, unknown> | null;
};

export async function recordPartyEntityAudit(
  auditService: AuditService,
  context: CurrentBusinessContext,
  input: RecordPartyEntityAuditInput
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
      partyId: input.partyId,
      entityName: input.entityName,
      entityId: input.entityId,
      operation: input.operation,
      changes,
      sourceModule: input.sourceModule,
      metadata: input.metadata,
    })
  );
}
