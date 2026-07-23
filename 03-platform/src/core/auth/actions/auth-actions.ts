"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createAuthService } from "@/core/auth/services/auth-service";
import { AuthError } from "@/core/auth/errors";
import type { LoginCredentials } from "@/core/auth/types";
import { getClientContextFromHeaders } from "@/core/auth/utils/helpers";
import { loginCredentialsSchema } from "@/core/auth/validators/auth-validators";

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

    if (result.requiresBusinessSelection) {
      redirect("/select-business");
    }

    redirect("/dashboard");
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
