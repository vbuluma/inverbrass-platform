/**
 * Purpose:
 * Expose reference catalog server actions for authentication and business UI forms.
 *
 * Design rationale:
 * Thin action boundary over ReferenceDataService so UI never queries Drizzle
 * directly. Empty catalogues remain success results with empty arrays.
 *
 * Why this exists:
 * BP-001 foundation correction — Industry Solutions and filtered Business Templates
 * are required for Business Registration (not Platform Registration).
 */

"use server";

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

    console.error("[catalog-actions] getCountriesAction failed.", error);

    return {
      success: false,
      error: {
        code: "PROVIDER_ERROR",
        message: "We could not load countries.",
      },
    };
  }
}

export async function getIndustriesAction(): Promise<
  AuthActionResult<
    Awaited<
      ReturnType<
        ReturnType<typeof createReferenceDataService>["getActiveIndustries"]
      >
    >
  >
> {
  try {
    const service = createReferenceDataService();
    const industries = await service.getActiveIndustries();
    return { success: true, data: industries };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        success: false,
        error: { code: error.code, message: error.message },
      };
    }

    console.error("[catalog-actions] getIndustriesAction failed.", error);

    return {
      success: false,
      error: {
        code: "PROVIDER_ERROR",
        message: "We could not load Industry Types.",
      },
    };
  }
}

export async function getBusinessTypesAction(
  industryId?: string
): Promise<
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
    const businessTypes = await service.getActiveBusinessTypes(industryId);
    return { success: true, data: businessTypes };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        success: false,
        error: { code: error.code, message: error.message },
      };
    }

    console.error("[catalog-actions] getBusinessTypesAction failed.", error);

    return {
      success: false,
      error: {
        code: "PROVIDER_ERROR",
        message: "We could not load business templates.",
      },
    };
  }
}
