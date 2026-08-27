/**
 * Purpose:
 * CRM audit helper — wraps Enterprise Audit service.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  buildAuditRecordFromContext,
  createFieldChanges,
  diffFieldChanges,
  type AuditService,
} from "@/core/audit";

export async function recordCrmEntityAudit(
  auditService: AuditService,
  context: CurrentBusinessContext,
  input: {
    partyId: string;
    entityName: string;
    entityId: string;
    operation: string;
    sourceModule: string;
    createValues?: Record<string, unknown>;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    trackFields?: string[];
  }
): Promise<void> {
  const changes = input.createValues
    ? createFieldChanges(input.createValues)
    : input.before && input.after
      ? diffFieldChanges(input.before, input.after, input.trackFields)
      : undefined;

  await auditService.record(
    buildAuditRecordFromContext(context, {
      partyId: input.partyId,
      entityName: input.entityName,
      entityId: input.entityId,
      operation: input.operation,
      changes,
      sourceModule: input.sourceModule,
    })
  );
}
