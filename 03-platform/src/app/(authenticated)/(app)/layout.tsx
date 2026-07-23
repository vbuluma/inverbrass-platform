/**
 * Purpose:
 * Gate business module routes until first login completes and business context validates.
 *
 * Business Context:
 * Middleware performs Edge-safe presence checks only; this layout enforces service-layer
 * rules before dashboard and future business pages render.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (§3.4.2, ADR-012)
 *
 * Implementation Package:
 * IP-004 – Post-Implementation Validation
 *
 * Responsibilities:
 * - Delegate first-login and business context guards to AuthService and BusinessContextService
 *
 * Non-Responsibilities:
 * - Password change orchestration
 * - Business module rendering
 *
 * Dependencies:
 * - authenticated-route-guard
 *
 * Business Rules Implemented:
 * - AD-009 §3.4.2 — business modules blocked until first login completes
 * - ADR-012 — validated business context required for business modules
 *
 * Extension Points:
 * - Future business pages placed under (app) inherit both guards automatically
 */

import {
  assertBusinessContextAvailable,
  assertFirstLoginCompleted,
} from "@/core/auth/guards/authenticated-route-guard";

export default async function AppShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await assertFirstLoginCompleted();
  await assertBusinessContextAvailable();

  return children;
}
