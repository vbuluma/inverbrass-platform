"use server";

/**
 * Purpose:
 * Expose business selection server actions for multi-business users.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (ADR-012)
 *
 * Implementation Package:
 * IP-005 – Authentication UI
 */

import { headers } from "next/headers";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { getClientContextFromHeaders } from "@/core/auth/utils/helpers";

export async function getSelectableBusinessesAction(): Promise<
  AuthActionResult<
    Awaited<
      ReturnType<
        ReturnType<
          typeof createBusinessContextService
        >["getSelectableBusinesses"]
      >
    >
  >
> {
  try {
    const authService = createAuthService();
    const user = await authService.getAuthenticatedUser();

    if (!user) {
      throw new AuthError(
        "SESSION_REQUIRED" as never,
        "Your session has expired. Please sign in again.",
        401
      );
    }

    const businessContextService = createBusinessContextService();
    const businesses = await businessContextService.getSelectableBusinesses(
      user.platformUserId
    );

    return { success: true, data: businesses };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        success: false,
        error: { code: error.code, message: error.message },
      };
    }

    return {
      success: false,
      error: {
        code: "PROVIDER_ERROR",
        message: "We could not load your businesses.",
      },
    };
  }
}

/**
 * WHAT: Set the current business context and return the next route.
 * WHY: Client performs hard navigation after the Set-Cookie response so Open /
 * Switch Business cannot snap back to Platform Home (Next.js redirect +
 * startTransition race on App Router).
 */
export async function selectBusinessAction(
  membershipId: string
): Promise<AuthActionResult<{ nextPath: "/setup" | "/dashboard" }>> {
  try {
    const requestHeaders = await headers();
    const businessContextService = createBusinessContextService();
    const context = await businessContextService.setCurrentBusiness(
      membershipId,
      getClientContextFromHeaders(requestHeaders)
    );

    // IP-006 — DRAFT businesses continue into setup; ACTIVE go to dashboard.
    const memberships = await businessContextService.getActiveMemberships(
      context.platformUserId
    );
    const selected = memberships.find(
      (membership) => membership.membershipId === membershipId
    );

    const nextPath =
      selected?.businessStatusCode === "DRAFT" ? "/setup" : "/dashboard";

    return { success: true, data: { nextPath } };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        success: false,
        error: { code: error.code, message: error.message },
      };
    }

    console.error(
      "[select-business-actions] selectBusinessAction failed.",
      error
    );

    return {
      success: false,
      error: {
        code: "PROVIDER_ERROR",
        message: "We could not select that business.",
      },
    };
  }
}
