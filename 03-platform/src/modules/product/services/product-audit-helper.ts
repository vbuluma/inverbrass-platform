/**
 * Purpose:
 * Convenience wrapper for recording Product-scoped audit entries.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  buildAuditRecordFromContext,
  createFieldChanges,
  diffFieldChanges,
  type AuditService,
} from "@/core/audit";
import type { AuditFieldChange } from "@/core/audit/types";

type RecordProductEntityAuditInput = {
  productId: string;
  ownerPartyId?: string | null;
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

export async function recordProductEntityAudit(
  auditService: AuditService,
  context: CurrentBusinessContext,
  input: RecordProductEntityAuditInput
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
      partyId: input.ownerPartyId ?? null,
      entityName: input.entityName,
      entityId: input.entityId,
      operation: input.operation,
      changes,
      sourceModule: input.sourceModule,
      metadata: input.metadata,
    })
  );
}
