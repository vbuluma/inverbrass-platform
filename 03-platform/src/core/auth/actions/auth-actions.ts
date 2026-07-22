"use server";

import { headers } from "next/headers";

import { createAuthService } from "@/core/auth/services/auth-service";
import { AuthError } from "@/core/auth/errors";
import type { LoginCredentials } from "@/core/auth/types";
import { getClientContextFromHeaders } from "@/core/auth/utils/helpers";

export type AuthActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

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

    return {
      success: false,
      error: {
        code: "PROVIDER_ERROR",
        message: "We could not load your session.",
      },
    };
  }
}
