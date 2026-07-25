"use server";

/**
 * Purpose:
 * Expose first-login server actions to the App Router UI.
 *
 * Business Context:
 * The first-login page delegates password change orchestration to AuthService while
 * preserving standardized action result envelopes used across authentication actions.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (§3.4)
 *
 * Implementation Package:
 * IP-004 – First Login & Password Management
 *
 * Responsibilities:
 * - Load first-login context for the page
 * - Invoke AuthService.completeFirstLogin and navigate on success
 *
 * Non-Responsibilities:
 * - Password hashing, security answer storage, or audit emission
 * - Route guard enforcement (authenticated-route-guard)
 *
 * Dependencies:
 * - AuthService, Next.js headers/navigation
 *
 * Business Rules Implemented:
 * - AD-009 §3.4 — first-login completion flow entry point
 *
 * Extension Points:
 * - Additional first-login UI steps may call new AuthService operations here
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import type { FirstLoginPayload } from "@/core/auth/types";
import { getClientContextFromHeaders } from "@/core/auth/utils/helpers";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";

export async function getFirstLoginContextAction(): Promise<
  AuthActionResult<
    Awaited<
      ReturnType<ReturnType<typeof createAuthService>["getFirstLoginContext"]>
    >
  >
> {
  try {
    const authService = createAuthService();
    const context = await authService.getFirstLoginContext();

    return { success: true, data: context };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      };
    }

    return {
      success: false,
      error: {
        code: "PROVIDER_ERROR",
        message: "We could not load your first-login details.",
      },
    };
  }
}

export async function completeFirstLoginAction(
  payload: FirstLoginPayload
): Promise<
  AuthActionResult<
    Awaited<
      ReturnType<ReturnType<typeof createAuthService>["completeFirstLogin"]>
    >
  >
> {
  try {
    const requestHeaders = await headers();
    const authService = createAuthService();
    await authService.completeFirstLogin(
      payload,
      getClientContextFromHeaders(requestHeaders)
    );

    // After first-login security setup, Platform Home is the entry point.
    redirect("/home");
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    if (error instanceof AuthError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      };
    }

    console.error(
      "[first-login-actions] completeFirstLoginAction failed.",
      error
    );

    return {
      success: false,
      error: {
        code: "PROVIDER_ERROR",
        message: "We could not complete your password change.",
      },
    };
  }
}
