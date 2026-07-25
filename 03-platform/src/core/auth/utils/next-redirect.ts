/**
 * Purpose:
 * Detect Next.js App Router redirect throws so server actions do not map them
 * to user-facing authentication errors.
 *
 * Design rationale:
 * `redirect()` throws a special error with a `NEXT_REDIRECT` digest. Catch-all
 * action handlers must rethrow that error or successful navigation appears as
 * "We could not complete authentication."
 *
 * Why this exists:
 * BP-001 foundation correction — login and registration UI actions previously
 * swallowed redirect throws after successful auth provisioning.
 *
 * Implementation Package:
 * BP-001 Foundation Alignment
 */

/**
 * WHAT: Identify Next.js redirect control-flow errors.
 * WHY: Successful redirects must propagate; only domain failures become messages.
 */
export function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}
