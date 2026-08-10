/**
 * Audit helper for CRM Appointment entities.
 * BP-004 / IP-06
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

type RecordCrmAppointmentAuditInput = {
  appointmentId: string;
  operation: string;
  changes?: AuditFieldChange[];
  createValues?: Record<string, unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  trackFields?: string[];
  metadata?: Record<string, unknown> | null;
};

export async function recordCrmAppointmentAudit(
  auditService: AuditService,
  context: CurrentBusinessContext,
  input: RecordCrmAppointmentAuditInput
): Promise<void> {
  let changes = input.changes;

  if (!changes && input.createValues) {
    changes = createFieldChanges(input.createValues);
  } else if (!changes && input.before && input.after && input.trackFields) {
    changes = diffFieldChanges(input.before, input.after, input.trackFields);
  }

  await auditService.record(
    buildAuditRecordFromContext(context, {
      entityName: AUDIT_ENTITY_NAMES.CRM_APPOINTMENT,
      entityId: input.appointmentId,
      operation: input.operation,
      sourceModule: AUDIT_SOURCE_MODULES.CRM_APPOINTMENT,
      changes,
      metadata: input.metadata,
    })
  );
}

export { AUDIT_OPERATIONS };
