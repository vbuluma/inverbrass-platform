/**
 * Purpose:
 * Expose Business Registration create actions for Platform Home → Create Business.
 *
 * Design rationale:
 * Thin action layer over BusinessRegistrationService. Industry + template are
 * validated in the service; redirect enters the existing setup wizard.
 *
 * Why this exists:
 * BP-001 foundation correction — Business Registration is separate from signup.
 */

"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createBusinessRegistrationService } from "@/core/auth/services/business-registration-service";
import type { CreateBusinessPayload } from "@/core/auth/types";
import { getClientContextFromHeaders } from "@/core/auth/utils/helpers";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { createBusinessSchema } from "@/core/auth/validators/create-business-validators";

/**
 * WHAT: Create a DRAFT business and redirect into the setup wizard.
 * WHY: Business Registration starts only after Platform Registration completes.
 */
export async function createBusinessUiAction(
  payload: CreateBusinessPayload
): Promise<AuthActionResult<never>> {
  const parsed = createBusinessSchema.safeParse(payload);

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
    const service = createBusinessRegistrationService();
    await service.createBusiness(
      parsed.data,
      getClientContextFromHeaders(requestHeaders)
    );

    redirect("/setup");
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
      "[business-registration-actions] createBusinessUiAction failed.",
      error
    );

    return {
      success: false,
      error: {
        code: "PROVIDER_ERROR",
        message: "We could not create your business. Please try again.",
      },
    };
  }
}
