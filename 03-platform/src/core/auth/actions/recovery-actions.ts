"use server";

/**
 * Purpose:
 * Expose password recovery server actions for the forgot-password UI.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (§3.7)
 *
 * Implementation Package:
 * IP-005 – Authentication UI
 */

import { headers } from "next/headers";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createPasswordRecoveryService } from "@/core/auth/services/password-recovery-service";
import type {
  RecoveryCompletionPayload,
  RecoveryInitiationPayload,
} from "@/core/auth/types";
import { getClientContextFromHeaders } from "@/core/auth/utils/helpers";

export async function initiateRecoveryAction(
  payload: RecoveryInitiationPayload
): Promise<
  AuthActionResult<
    Awaited<
      ReturnType<
        ReturnType<typeof createPasswordRecoveryService>["initiateRecovery"]
      >
    >
  >
> {
  try {
    const requestHeaders = await headers();
    const service = createPasswordRecoveryService();
    const result = await service.initiateRecovery(
      payload,
      getClientContextFromHeaders(requestHeaders)
    );

    return { success: true, data: result };
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
        message: "We could not start password recovery.",
      },
    };
  }
}

export async function completeRecoveryAction(
  payload: RecoveryCompletionPayload
): Promise<AuthActionResult<{ recovered: true }>> {
  try {
    const requestHeaders = await headers();
    const service = createPasswordRecoveryService();
    await service.completeRecovery(
      payload,
      getClientContextFromHeaders(requestHeaders)
    );

    return { success: true, data: { recovered: true } };
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
        message: "We could not reset your password.",
      },
    };
  }
}
