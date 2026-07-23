/**
 * Purpose:
 * Enforce authenticated route access policies using AuthService as the authoritative source.
 *
 * Business Context:
 * Edge middleware cannot query PostgreSQL, so first-login enforcement reads
 * `user_security_profile.must_change_password` through AuthService instead of a cookie mirror.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (§3.4.2)
 *
 * Implementation Package:
 * IP-004 – First Login & Password Management
 *
 * Responsibilities:
 * - Session presence checks for authenticated route groups
 * - First-login completion checks before business module access
 *
 * Non-Responsibilities:
 * - Password change orchestration (AuthService.completeFirstLogin)
 * - Business context initialization (BusinessContextService)
 * - Credential validation (AuthService.login)
 *
 * Dependencies:
 * - AuthService
 * - Next.js navigation redirect
 *
 * Business Rules Implemented:
 * - AD-009 §3.4.2 — business modules blocked until first login completes
 *
 * Extension Points:
 * - Additional route-group guards may be added for future packages (MFA, invitations)
 */

import { redirect } from "next/navigation";

import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";

/**
 * Purpose:
 * Ensure an authenticated Supabase session exists for authenticated route groups.
 *
 * Business Context:
 * Public routes remain outside this guard; authenticated routes require a valid session.
 *
 * Outputs:
 * - Redirects to `/login` when no authenticated user is resolved
 */
export async function assertAuthenticatedSession(): Promise<void> {
  const authService = createAuthService();

  try {
    const user = await authService.getAuthenticatedUser();

    if (!user) {
      redirect("/login");
    }
  } catch {
    redirect("/login");
  }
}

/**
 * Purpose:
 * Block access to business modules until forced first-login password change completes.
 *
 * Business Context:
 * Employees with `must_change_password=true` may only use the first-login route group.
 *
 * Inputs:
 * - None — reads current session user from AuthService
 *
 * Outputs:
 * - Redirects to `/login` when unauthenticated
 * - Redirects to `/first-login` when `mustChangePassword` is true
 *
 * Exceptions:
 * - Uses redirect rather than thrown errors to preserve App Router UX
 *
 * Business Rules Implemented:
 * - AD-009 §3.4.2 — first-login route restriction
 * - Single source of truth: `user_security_profile.must_change_password`
 */
export async function assertFirstLoginCompleted(): Promise<void> {
  const authService = createAuthService();

  try {
    const user = await authService.getAuthenticatedUser();

    if (!user) {
      redirect("/login");
    }

    if (user.mustChangePassword) {
      redirect("/first-login");
    }
  } catch {
    redirect("/login");
  }
}

/**
 * Purpose:
 * Ensure a validated business context exists before rendering business module routes.
 *
 * Business Context:
 * Middleware only checks cookie presence on the Edge runtime. This guard delegates
 * signature validation to BusinessContextService so tampered cookies cannot reach
 * business modules.
 *
 * Outputs:
 * - Redirects to `/select-business` when validated context is unavailable
 *
 * Business Rules Implemented:
 * - ADR-012 — business modules require validated current business context
 */
export async function assertBusinessContextAvailable(): Promise<void> {
  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();

  if (!context) {
    redirect("/select-business");
  }
}
