import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  AUDIT_OPERATIONS,
  AUDIT_SOURCE_MODULES,
  buildAuditRecordFromContext,
  createFieldChanges,
  diffFieldChanges,
  type AuditService,
  createAuditService,
} from "@/core/audit";
import { AUDIT_ENTITY_NAMES } from "@/core/audit/constants";

export async function recordCrmGovernanceAudit(
  auditService: AuditService,
  context: CurrentBusinessContext,
  input: {
    entityName: string;
    entityId: string;
    operation: string;
    partyId?: string | null;
    createValues?: Record<string, unknown>;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    metadata?: Record<string, unknown> | null;
  }
): Promise<void> {
  let changes = input.createValues
    ? createFieldChanges(input.createValues)
    : undefined;

  if (!changes && input.before && input.after) {
    changes = diffFieldChanges(input.before, input.after);
  }

  await auditService.record(
    buildAuditRecordFromContext(context, {
      partyId: input.partyId ?? null,
      entityName: input.entityName,
      entityId: input.entityId,
      operation: input.operation,
      sourceModule: AUDIT_SOURCE_MODULES.CRM_GOVERNANCE,
      changes,
      metadata: input.metadata,
    })
  );
}

export { AUDIT_OPERATIONS, AUDIT_ENTITY_NAMES, createAuditService };
