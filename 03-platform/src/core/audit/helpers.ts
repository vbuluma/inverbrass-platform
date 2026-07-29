/**
 * Purpose:
 * Build audit payloads and compute field-level changes.
 *
 * Implementation Package:
 * BP-002 / IP-011 – Enterprise Audit History
 */

import { randomUUID } from "node:crypto";

import type { CurrentBusinessContext } from "@/core/auth/types";
import type { ClientContext } from "@/core/auth/types";
import { AUDIT_SOURCE_MODULES } from "@/core/audit/constants";
import type {
  AuditFieldChange,
  RecordAuditPayload,
} from "@/core/audit/types";

export function formatAuditValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function createFieldChanges(
  values: Record<string, unknown>
): AuditFieldChange[] {
  return Object.entries(values)
    .filter(([, value]) => value !== undefined)
    .map(([fieldName, value]) => ({
      fieldName,
      oldValue: null,
      newValue: formatAuditValue(value),
    }));
}

export function diffFieldChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  trackFields?: string[]
): AuditFieldChange[] {
  const keys =
    trackFields ??
    [...new Set([...Object.keys(before), ...Object.keys(after)])];

  const changes: AuditFieldChange[] = [];

  for (const fieldName of keys) {
    const oldValue = formatAuditValue(before[fieldName]);
    const newValue = formatAuditValue(after[fieldName]);
    if (oldValue !== newValue) {
      changes.push({ fieldName, oldValue, newValue });
    }
  }

  return changes;
}

type AuditRecordInput = {
  partyId?: string | null;
  entityName: string;
  entityId: string;
  operation: string;
  changes?: AuditFieldChange[];
  sourceModule?: string;
  correlationId?: string | null;
  requestId?: string | null;
  clientContext?: ClientContext;
  metadata?: Record<string, unknown> | null;
  systemGenerated?: boolean;
  retentionFlag?: boolean;
  changedDateTime?: Date;
};

export function buildAuditRecordFromContext(
  context: CurrentBusinessContext,
  input: AuditRecordInput
): RecordAuditPayload {
  return {
    businessId: context.businessId,
    partyId: input.partyId ?? null,
    entityName: input.entityName,
    entityId: input.entityId,
    operation: input.operation,
    changes: input.changes,
    changedBy: context.platformUserId,
    changedDateTime: input.changedDateTime ?? new Date(),
    sourceModule: input.sourceModule ?? AUDIT_SOURCE_MODULES.PARTY_MANAGEMENT,
    correlationId: input.correlationId ?? randomUUID(),
    requestId: input.requestId ?? null,
    ipAddress: input.clientContext?.ipAddress ?? null,
    browserClient: input.clientContext?.userAgent ?? null,
    device: null,
    systemGenerated: input.systemGenerated ?? false,
    metadata: input.metadata ?? null,
    retentionFlag: input.retentionFlag ?? false,
  };
}
