/**
 * Purpose:
 * Require an authenticated Supabase session for all authenticated route groups.
 *
 * Business Context:
 * First-login and business module routes share a parent layout so session checks are
 * enforced once before any authenticated page renders.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding
 *
 * Implementation Package:
 * IP-004 – Post-Implementation Validation
 *
 * Responsibilities:
 * - Invoke AuthService session guard for authenticated routes
 *
 * Non-Responsibilities:
 * - First-login completion checks ((app) layout)
 * - Business context validation (BusinessContextService via route guard)
 *
 * Dependencies:
 * - authenticated-route-guard
 *
 * Business Rules Implemented:
 * - AD-009 §3.5 — authenticated routes require a valid session
 *
 * Extension Points:
 * - Additional authenticated route groups inherit this layout automatically
 */

import { assertAuthenticatedSession } from "@/core/auth/guards/authenticated-route-guard";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await assertAuthenticatedSession();

  return children;
}
