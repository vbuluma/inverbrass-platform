/**
 * Purpose:
 * Public exports for the reusable Enterprise Audit capability.
 *
 * Implementation Package:
 * BP-002 / IP-011 – Enterprise Audit History
 */

export type {
  AuthenticationAuditEvent,
  AuthenticationAuditEventType,
  AuthenticationAuditEmitterPort,
  AuditFieldChange,
  AuditHistoryDetailView,
  AuditHistoryEntryView,
  AuditHistoryFilterOptions,
  AuditHistoryListFilters,
  AuditHistoryListResult,
  AuditOutcome,
  RecordAuditPayload,
} from "@/core/audit/types";
export {
  AUTHENTICATION_AUDIT_EVENT_TYPES,
} from "@/core/audit/types";
export {
  AUDIT_DEFAULT_PAGE_SIZE,
  AUDIT_ENTITY_LABELS,
  AUDIT_ENTITY_NAMES,
  AUDIT_OPERATION_LABELS,
  AUDIT_OPERATIONS,
  AUDIT_SOURCE_MODULE_LABELS,
  AUDIT_SOURCE_MODULES,
} from "@/core/audit/constants";
export type {
  AuditEntityName,
  AuditOperation,
  AuditSourceModule,
} from "@/core/audit/constants";
export {
  AuthenticationAuditEmitter,
  getAuthenticationAuditEmitter,
  setAuthenticationAuditEmitter,
} from "@/core/audit/authentication-audit-emitter";
export {
  buildAuditRecordFromContext,
  createFieldChanges,
  diffFieldChanges,
  formatAuditValue,
} from "@/core/audit/helpers";
export {
  createAuditHistoryRepository,
  AuditHistoryRepository,
} from "@/core/audit/repositories/audit-history-repository";
export {
  createAuditService,
  AuditService,
} from "@/core/audit/services/audit-service";
