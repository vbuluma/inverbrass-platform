/**
 * Purpose:
 * Next.js instrumentation entry point for platform startup checks.
 *
 * Design rationale:
 * Runs once when the Node.js runtime boots so missing seed data is visible
 * in logs without altering request handling or approved business behaviour.
 *
 * Business rationale:
 * IP-006A requires startup validation for welcome message and core catalogues.
 *
 * Implementation Package:
 * IP-006A – Platform Initialization & Security Hardening
 */

export async function register() {
  // ----------------------------------------------------
  // Only validate against the database in the Node.js runtime.
  // Edge runtime has no postgres driver / DATABASE_URL usage here.
  // ----------------------------------------------------
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  try {
    const { runPlatformStartupValidation } = await import(
      "@/core/platform/platform-startup-validation-service"
    );
    await runPlatformStartupValidation();
  } catch (error) {
    // Never crash the application for startup validation failures.
    const message =
      error instanceof Error ? error.message : "Unknown startup validation error";
    const isProduction = process.env.NODE_ENV === "production";
    const line = `[platform-startup] Validation aborted: ${message}`;

    if (isProduction) {
      console.error(line);
    } else {
      console.warn(line);
    }
  } finally {
    // ----------------------------------------------------
    // Release the session-pooler slot after startup checks.
    // Request handlers recreate the singleton via getDb() when needed.
    // WHY: Prevents EMAXCONNSESSION during build/dev when many Node workers boot.
    // ----------------------------------------------------
    try {
      const { closeDb } = await import("@/db/client");
      await closeDb();
    } catch {
      // Ignore close failures — validation already completed or aborted.
    }
  }
}
