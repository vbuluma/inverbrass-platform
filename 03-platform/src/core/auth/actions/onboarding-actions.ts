"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createOnboardingService } from "@/core/auth/services/onboarding-service";
import { createSecurityQuestionService } from "@/core/auth/services/security-question-service";
import type {
  OwnerRegistrationPayload,
  OwnerRegistrationUiPayload,
} from "@/core/auth/types";
import { getClientContextFromHeaders } from "@/core/auth/utils/helpers";
import { mapRegistrationUiToOwnerPayload } from "@/core/auth/utils/registration-ui-mapper";
import { ownerRegistrationUiSchema } from "@/core/auth/validators/registration-ui-validators";

export async function registerOwnerAction(
  payload: OwnerRegistrationPayload
): Promise<
  AuthActionResult<
    Awaited<
      ReturnType<ReturnType<typeof createOnboardingService>["registerOwner"]>
    >
  >
> {
  try {
    const requestHeaders = await headers();
    const onboardingService = createOnboardingService();
    const result = await onboardingService.registerOwner(
      payload,
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
        message: "We could not complete registration. Please try again.",
      },
    };
  }
}

export async function registerOwnerUiAction(
  payload: OwnerRegistrationUiPayload
): Promise<
  AuthActionResult<
    Awaited<
      ReturnType<ReturnType<typeof createOnboardingService>["registerOwner"]>
    >
  >
> {
  const parsed = ownerRegistrationUiSchema.safeParse(payload);

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
    const onboardingService = createOnboardingService();
    await onboardingService.registerOwner(
      mapRegistrationUiToOwnerPayload(parsed.data),
      getClientContextFromHeaders(requestHeaders)
    );

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
        message: "We could not complete registration. Please try again.",
      },
    };
  }
}

export async function getSecurityQuestionsAction(): Promise<
  AuthActionResult<
    Awaited<
      ReturnType<
        ReturnType<typeof createSecurityQuestionService>["getActiveCatalog"]
      >
    >
  >
> {
  try {
    const securityQuestionService = createSecurityQuestionService();
    const questions = await securityQuestionService.getActiveCatalog();

    return { success: true, data: questions };
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
        message: "We could not load security questions.",
      },
    };
  }
}
