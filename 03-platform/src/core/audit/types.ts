/**
 * Purpose:
 * Type contracts for the Enterprise Audit capability.
 *
 * Implementation Package:
 * BP-002 / IP-011 – Enterprise Audit History
 */

import type {
  AuditEntityName,
  AuditOperation,
  AuditSourceModule,
} from "@/core/audit/constants";

export const AUTHENTICATION_AUDIT_EVENT_TYPES = {
  USER_REGISTERED: "USER_REGISTERED",
  BUSINESS_CREATED: "BUSINESS_CREATED",
  MEMBERSHIP_CREATED: "MEMBERSHIP_CREATED",
  ROLE_ASSIGNED: "ROLE_ASSIGNED",
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILURE: "LOGIN_FAILURE",
  LOGOUT: "LOGOUT",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  FIRST_LOGIN_COMPLETED: "FIRST_LOGIN_COMPLETED",
  PASSWORD_RESET: "PASSWORD_RESET",
  BUSINESS_SWITCH: "BUSINESS_SWITCH",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  INVITATION_ACCEPTED: "INVITATION_ACCEPTED",
} as const;

export type AuthenticationAuditEventType =
  (typeof AUTHENTICATION_AUDIT_EVENT_TYPES)[keyof typeof AUTHENTICATION_AUDIT_EVENT_TYPES];

export type AuditOutcome = "SUCCESS" | "FAILURE";

export type AuthenticationAuditEvent = {
  eventType: AuthenticationAuditEventType;
  outcome: AuditOutcome;
  timestamp: Date;
  platformUserId?: string;
  businessId?: string;
  clientContext?: {
    ipAddress?: string;
    userAgent?: string;
  };
  metadata?: Record<string, unknown>;
};

export interface AuthenticationAuditEmitterPort {
  emit(event: AuthenticationAuditEvent): Promise<void>;
}

export type AuditFieldChange = {
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
};

export type RecordAuditPayload = {
  businessId: string;
  partyId?: string | null;
  entityName: AuditEntityName | string;
  entityId: string;
  operation: AuditOperation | string;
  changes?: AuditFieldChange[];
  changedBy?: string | null;
  changedDateTime?: Date;
  sourceModule: AuditSourceModule | string;
  correlationId?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
  browserClient?: string | null;
  device?: string | null;
  systemGenerated?: boolean;
  metadata?: Record<string, unknown> | null;
  retentionFlag?: boolean;
};

export type AuditHistoryListFilters = {
  operation?: string;
  entityName?: string;
  changedBy?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};

export type AuditHistoryEntryView = {
  id: string;
  changedDateTime: string;
  changedByName: string | null;
  operation: string;
  operationLabel: string;
  entityName: string;
  entityLabel: string;
  entityId: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  sourceModule: string;
  sourceModuleLabel: string;
  correlationId: string | null;
  systemGenerated: boolean;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  browserClient: string | null;
  device: string | null;
};

export type AuditHistoryListResult = {
  entries: AuditHistoryEntryView[];
  totalCount: number;
  hasMore: boolean;
  pageSize: number;
  offset: number;
};

export type AuditHistoryFilterOptions = {
  operations: Array<{ code: string; label: string }>;
  entities: Array<{ code: string; label: string }>;
  users: Array<{ id: string; name: string }>;
};

export type AuditHistoryDetailView = AuditHistoryEntryView & {
  changedByUserId: string | null;
  requestId: string | null;
  relatedChanges: AuditHistoryEntryView[];
};
