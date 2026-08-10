import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  AUDIT_OPERATIONS,
  AUDIT_SOURCE_MODULES,
  buildAuditRecordFromContext,
  createFieldChanges,
  type AuditService,
} from "@/core/audit";
import { AUDIT_ENTITY_NAMES } from "@/core/audit/constants";

export async function recordCrmCaseAudit(
  auditService: AuditService,
  context: CurrentBusinessContext,
  input: {
    caseId: string;
    operation: string;
    createValues?: Record<string, unknown>;
    metadata?: Record<string, unknown> | null;
  }
): Promise<void> {
  await auditService.record(
    buildAuditRecordFromContext(context, {
      entityName: AUDIT_ENTITY_NAMES.CRM_CASE,
      entityId: input.caseId,
      operation: input.operation,
      sourceModule: AUDIT_SOURCE_MODULES.CRM_CASE,
      changes: input.createValues
        ? createFieldChanges(input.createValues)
        : undefined,
      metadata: input.metadata,
    })
  );
}

export { AUDIT_OPERATIONS };
