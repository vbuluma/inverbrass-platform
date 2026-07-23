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
