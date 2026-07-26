"use server";

/**
 * Purpose:
 * Expose business selection server actions for Open Business / Switch Business.
 *
 * Design rationale:
 * Uses server-side redirect() after setting the business-context cookie — the same
 * pattern as Create Business. Client startTransition + window.location.assign was
 * racing the App Router and leaving users on "Opening..." or bouncing to /home.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (ADR-012)
 *
 * Implementation Package:
 * BP-001 Final Stabilization
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { getClientContextFromHeaders } from "@/core/auth/utils/helpers";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";

function logOpenBusiness(
  stage: string,
  detail?: Record<string, unknown>
): void {
  // Temporary diagnostics for BP-001 Open Business P1.
  console.info(`[open-business] stage=${stage}`, detail ?? {});
}

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
 * WHAT: Form entry for Open / Switch Business (hidden membershipId field).
 * WHY: Native form actions + redirect() reliably apply Set-Cookie then navigate.
 */
export async function selectBusinessFormAction(
  formData: FormData
): Promise<void> {
  const membershipId = String(formData.get("membershipId") ?? "").trim();
  logOpenBusiness("ui.formSubmit", { membershipId });
  await selectBusinessAndRedirect(membershipId);
}

/**
 * WHAT: Set active business context cookie, then redirect to setup or dashboard.
 * WHY: Completes UI → Action → Context Service → Session → Redirect → Destination.
 */
export async function selectBusinessAndRedirect(
  membershipId: string
): Promise<void> {
  logOpenBusiness("action.start", { membershipId });

  try {
    if (!membershipId) {
      throw new AuthError(
        "INVALID_INPUT" as never,
        "Select a business to continue.",
        400
      );
    }

    const requestHeaders = await headers();
    const businessContextService = createBusinessContextService();

    logOpenBusiness("context.set.start", { membershipId });
    const context = await businessContextService.setCurrentBusiness(
      membershipId,
      getClientContextFromHeaders(requestHeaders)
    );
    logOpenBusiness("context.set.done", {
      platformUserId: context.platformUserId,
      businessId: context.businessId,
      businessMembershipId: context.businessMembershipId,
    });
    logOpenBusiness("session.cookie.set", {
      cookie: "inverbrass-business-context",
    });

    const memberships = await businessContextService.getActiveMemberships(
      context.platformUserId
    );
    const selected = memberships.find(
      (membership) => membership.membershipId === membershipId
    );

    // DRAFT → finish setup; ACTIVE → Business Dashboard.
    const nextPath =
      selected?.businessStatusCode === "DRAFT" ? "/setup" : "/dashboard";

    logOpenBusiness("redirect.execute", {
      nextPath,
      businessStatusCode: selected?.businessStatusCode ?? null,
    });

    redirect(nextPath);
  } catch (error) {
    if (isNextRedirectError(error)) {
      logOpenBusiness("redirect.propagated");
      throw error;
    }

    if (error instanceof AuthError) {
      logOpenBusiness("action.authError", {
        code: error.code,
        message: error.message,
      });
      // Surface failure on Platform Home via query — form actions cannot return JSON.
      redirect(
        `/home?openError=${encodeURIComponent(error.message)}`
      );
    }

    console.error(
      "[open-business] stage=action.failed",
      error
    );
    redirect(
      `/home?openError=${encodeURIComponent("We could not open that business.")}`
    );
  }
}
