import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  AUDIT_OPERATIONS,
  AUDIT_SOURCE_MODULES,
  buildAuditRecordFromContext,
  createFieldChanges,
  type AuditService,
} from "@/core/audit";
import { AUDIT_ENTITY_NAMES } from "@/core/audit/constants";

export async function recordCrmVisitAudit(
  auditService: AuditService,
  context: CurrentBusinessContext,
  input: {
    visitId: string;
    operation: string;
    createValues?: Record<string, unknown>;
    metadata?: Record<string, unknown> | null;
  }
): Promise<void> {
  const changes = input.createValues
    ? createFieldChanges(input.createValues)
    : undefined;

  await auditService.record(
    buildAuditRecordFromContext(context, {
      entityName: AUDIT_ENTITY_NAMES.CRM_VISIT,
      entityId: input.visitId,
      operation: input.operation,
      sourceModule: AUDIT_SOURCE_MODULES.CRM_VISIT,
      changes,
      metadata: input.metadata,
    })
  );
}

export { AUDIT_OPERATIONS };
