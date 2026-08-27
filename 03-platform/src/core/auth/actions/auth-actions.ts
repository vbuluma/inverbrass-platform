/**
 * Purpose:
 * Expose login/logout/session server actions with standardized result envelopes.
 *
 * Design rationale:
 * UI actions must rethrow Next.js redirect control-flow errors. Successful login
 * lands on Platform Home — the entry point for Industry Solutions.
 *
 * Why this exists:
 * BP-001 foundation correction — auth failure message was caused by swallowing
 * NEXT_REDIRECT after successful login/registration.
 */

"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createAuthService } from "@/core/auth/services/auth-service";
import { AuthError } from "@/core/auth/errors";
import type { LoginCredentials } from "@/core/auth/types";
import { logAuthFailure } from "@/core/auth/utils/auth-stage-log";
import { getClientContextFromHeaders } from "@/core/auth/utils/helpers";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { loginCredentialsSchema } from "@/core/auth/validators/auth-validators";

export type AuthActionResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: {
        code: string;
        message: string;
        /** Optional form field name to highlight after validation failure. */
        field?: string;
        /** ENG-003j — conflicting value for duplicate constraint errors. */
        conflictValue?: string;
        conflictFieldLabel?: string;
      };
    };

export async function loginAction(
  credentials: LoginCredentials
): Promise<AuthActionResult<Awaited<ReturnType<ReturnType<typeof createAuthService>["login"]>>>> {
  try {
    const requestHeaders = await headers();
    const authService = createAuthService();
    const result = await authService.login(
      credentials,
      getClientContextFromHeaders(requestHeaders)
    );

    return { success: true, data: result };
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

    logAuthFailure("Authentication", error, { action: "loginAction" });

    return {
      success: false,
      error: {
        code: "PROVIDER_ERROR",
        message: "We could not complete authentication. Please try again.",
      },
    };
  }
}

export async function logoutAction(): Promise<AuthActionResult<{ loggedOut: true }>> {
  try {
    const requestHeaders = await headers();
    const authService = createAuthService();
    await authService.logout(getClientContextFromHeaders(requestHeaders));

    return {
      success: true,
      data: { loggedOut: true },
    };
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

    console.error("[auth-actions] logoutAction failed.", error);

    return {
      success: false,
      error: {
        code: "PROVIDER_ERROR",
        message: "We could not complete sign out. Please try again.",
      },
    };
  }
}

export async function getAuthenticatedUserAction(): Promise<
  AuthActionResult<
    NonNullable<Awaited<ReturnType<ReturnType<typeof createAuthService>["getAuthenticatedUser"]>>>
  | null
  >
> {
  try {
    const authService = createAuthService();
    const user = await authService.getAuthenticatedUser();

    return { success: true, data: user };
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

    console.error("[auth-actions] getAuthenticatedUserAction failed.", error);

    return {
      success: false,
      error: {
        code: "PROVIDER_ERROR",
        message: "We could not load your session.",
      },
    };
  }
}

/**
 * WHAT: Authenticate and route to first-login or Platform Home.
 * WHY: Platform Home is the post-auth entry point for all Industry Solutions.
 */
export async function loginUiAction(
  credentials: LoginCredentials
): Promise<AuthActionResult<never>> {
  const parsed = loginCredentialsSchema.safeParse(credentials);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "INVALID_INPUT",
        message:
          parsed.error.issues[0]?.message ??
          "Please check your details and try again.",
      },
    };
  }

  try {
    const requestHeaders = await headers();
    const authService = createAuthService();
    const result = await authService.login(
      parsed.data,
      getClientContextFromHeaders(requestHeaders)
    );

    if (result.requiresPasswordChange) {
      redirect("/first-login");
    }

    // Platform Home is the canonical post-authentication landing page.
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

    logAuthFailure("Authentication", error, { action: "loginUiAction" });

    return {
      success: false,
      error: {
        code: "PROVIDER_ERROR",
        message: "We could not complete authentication. Please try again.",
      },
    };
  }
}
