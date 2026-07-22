import type {
  AuthenticationAuditEmitterPort,
  AuthenticationAuditEvent,
} from "@/core/audit/types";

export class AuthenticationAuditEmitter
  implements AuthenticationAuditEmitterPort
{
  async emit(event: AuthenticationAuditEvent): Promise<void> {
    const payload = {
      source: "ENG-001",
      engine: "authentication",
      ...event,
      timestamp: event.timestamp.toISOString(),
    };

    if (process.env.NODE_ENV === "production") {
      console.info(JSON.stringify(payload));
      return;
    }

    console.info("[audit-event]", payload);
  }
}

let auditEmitter: AuthenticationAuditEmitterPort | undefined;

export function getAuthenticationAuditEmitter(): AuthenticationAuditEmitterPort {
  if (!auditEmitter) {
    auditEmitter = new AuthenticationAuditEmitter();
  }

  return auditEmitter;
}

export function setAuthenticationAuditEmitter(
  emitter: AuthenticationAuditEmitterPort
): void {
  auditEmitter = emitter;
}
