/**
 * Purpose:
 * Structured development logging for authentication failure stages.
 *
 * Why this exists:
 * "We could not complete authentication" must not swallow root causes.
 * Logs identify whether failure occurred during Authentication, Platform User
 * creation, Session creation, Redirect, or Database persistence.
 */

export type AuthFailureStage =
  | "Authentication"
  | "Platform User creation"
  | "Session creation"
  | "Redirect"
  | "Database persistence";

/**
 * WHAT: Log an auth-pipeline failure with stage and underlying error.
 * WHY: Development diagnosis without changing user-facing messages.
 */
export function logAuthFailure(
  stage: AuthFailureStage,
  error: unknown,
  metadata?: Record<string, unknown>
): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error("[auth-pipeline] Failure", {
    stage,
    message,
    stack,
    ...metadata,
  });
}
