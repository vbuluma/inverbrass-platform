"use server";

/**
 * Purpose:
 * Expose Party Identity & Regulatory Information server actions.
 *
 * Architecture:
 * UI → Server Actions → PartyIdentityRegulatoryService → IdentityRegulatoryService (ENG-003j)
 *
 * Implementation Package:
 * BP-002 / IP-013 – Identity & Regulatory Information
 */

import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import type {
  CaptureIdentifierPayload,
  UpdateIdentifierPayload,
  VerifyIdentifierPayload,
} from "@/core/identity-regulatory";
import type { PartyIdentityRegulatoryPanelView } from "@/modules/party/types";
import { PartyError } from "@/modules/party/errors";
import { createPartyIdentityRegulatoryService } from "@/modules/party/services/party-identity-regulatory-service";

function isNextDynamicServerError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).includes("DYNAMIC_SERVER_USAGE")
  );
}

async function requirePartyContext() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();

  if (!user) {
    throw new PartyError(
      "SESSION_REQUIRED",
      "Your session has expired. Please sign in again.",
      401
    );
  }

  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();

  if (!context) {
    throw new PartyError(
      "BUSINESS_CONTEXT_REQUIRED",
      "Select a business before managing parties.",
      403
    );
  }

  return context;
}

function toActionError(error: unknown): AuthActionResult<never> {
  if (isNextRedirectError(error) || isNextDynamicServerError(error)) {
    throw error;
  }

  if (error instanceof PartyError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.field ? { field: error.field } : {}),
      },
    };
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

  console.error("[party-identity-regulatory-actions] Unexpected error", error);

  const pgCode =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : null;

  if (pgCode === "42P01") {
    return {
      success: false,
      error: {
        code: "REFERENCE_DATA_MISSING",
        message:
          "Identity & Regulatory tables are not available. Run database migrations and seed, then refresh.",
      },
    };
  }

  return {
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong. Please try again.",
    },
  };
}

export async function listPartyIdentityRegulatoryAction(
  partyId: string
): Promise<AuthActionResult<PartyIdentityRegulatoryPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyIdentityRegulatoryService();
    const data = await service.getIdentityRegulatoryPanel(context, partyId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function capturePartyIdentifierAction(
  partyId: string,
  payload: CaptureIdentifierPayload
): Promise<AuthActionResult<PartyIdentityRegulatoryPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyIdentityRegulatoryService();
    const data = await service.captureIdentifier(context, partyId, payload);
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updatePartyIdentifierAction(
  partyId: string,
  identifierId: string,
  payload: UpdateIdentifierPayload
): Promise<AuthActionResult<PartyIdentityRegulatoryPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyIdentityRegulatoryService();
    const data = await service.updateIdentifier(
      context,
      partyId,
      identifierId,
      payload
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function verifyPartyIdentifierAction(
  partyId: string,
  identifierId: string,
  payload: VerifyIdentifierPayload
): Promise<AuthActionResult<PartyIdentityRegulatoryPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyIdentityRegulatoryService();
    const data = await service.verifyIdentifier(
      context,
      partyId,
      identifierId,
      payload
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function linkPartyIdentifierDocumentAction(
  partyId: string,
  identifierId: string,
  payload: { documentId: string; version: number }
): Promise<AuthActionResult<PartyIdentityRegulatoryPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyIdentityRegulatoryService();
    const data = await service.linkDocument(
      context,
      partyId,
      identifierId,
      payload
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function removePartyIdentifierAction(
  partyId: string,
  identifierId: string,
  payload: { version: number }
): Promise<AuthActionResult<PartyIdentityRegulatoryPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyIdentityRegulatoryService();
    const data = await service.removeIdentifier(
      context,
      partyId,
      identifierId,
      payload
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
