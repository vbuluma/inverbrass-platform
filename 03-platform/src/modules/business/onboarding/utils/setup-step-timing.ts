/**
 * Purpose:
 * Structured timing logs for Business Setup Wizard step operations.
 *
 * Design rationale:
 * Isolates start/success/failure/duration logging so hang diagnosis does not
 * pollute business-rule services with ad-hoc console formatting.
 *
 * Implementation Package:
 * BP-001 – Business Onboarding Enhancement & Stabilization
 */

import { SetupError } from "@/modules/business/onboarding/errors";

/**
 * WHAT: Run a setup step operation with structured timing logs.
 * WHY: Identify hangs and slow DB paths without logging secrets.
 */
export async function withSetupStepTiming<T>(
  stepLabel: string,
  operation: () => Promise<T>
): Promise<T> {
  const startedAt = Date.now();
  console.info(`[business-setup] ${stepLabel} - Start`);

  try {
    const result = await operation();
    console.info(`[business-setup] ${stepLabel} - Success`, {
      durationMs: Date.now() - startedAt,
    });
    return result;
  } catch (error) {
    console.error(`[business-setup] ${stepLabel} - Failure`, {
      durationMs: Date.now() - startedAt,
      code: error instanceof SetupError ? error.code : "UNKNOWN",
    });
    throw error;
  }
}
