"use server";

/**
 * Purpose:
 * Expose reference catalog server actions for authentication UI forms.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding
 *
 * Implementation Package:
 * IP-005 – Authentication UI
 */

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createReferenceDataService } from "@/core/auth/services/reference-data-service";

export async function getCountriesAction(): Promise<
  AuthActionResult<
    Awaited<
      ReturnType<
        ReturnType<typeof createReferenceDataService>["getActiveCountries"]
      >
    >
  >
> {
  try {
    const service = createReferenceDataService();
    const countries = await service.getActiveCountries();
    return { success: true, data: countries };
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
        message: "We could not load countries.",
      },
    };
  }
}

export async function getBusinessTypesAction(): Promise<
  AuthActionResult<
    Awaited<
      ReturnType<
        ReturnType<typeof createReferenceDataService>["getActiveBusinessTypes"]
      >
    >
  >
> {
  try {
    const service = createReferenceDataService();
    const businessTypes = await service.getActiveBusinessTypes();
    return { success: true, data: businessTypes };
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
        message: "We could not load business types.",
      },
    };
  }
}
