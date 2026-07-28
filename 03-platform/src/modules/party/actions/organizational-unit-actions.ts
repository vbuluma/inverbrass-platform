"use server";

/**
 * Purpose:
 * Expose Organization Structure Engine server actions to the App Router UI.
 *
 * Engine:
 * ENG-003c – Organization Structure Engine
 */

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { PartyError } from "@/modules/party/errors";
import { createOrganizationalUnitService } from "@/modules/party/services/organizational-unit-service";
import type {
  AddOrganizationalUnitPayload,
  OrganizationStructurePanelView,
  OrganizationalUnitView,
  SearchOrganizationalUnitsPayload,
  UpdateOrganizationalUnitPayload,
} from "@/modules/party/types";
import { revalidatePath } from "next/cache";

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
      error: { code: error.code, message: error.message },
    };
  }

  console.error("[organizational-unit-actions] Unexpected error", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "We could not complete that Party action. Please try again.",
    },
  };
}

export async function listOrganizationStructureAction(
  partyId: string,
  search?: SearchOrganizationalUnitsPayload
): Promise<AuthActionResult<OrganizationStructurePanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createOrganizationalUnitService();
    const data = await service.getOrganizationStructure(
      context,
      partyId,
      search
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getOrganizationalUnitAction(
  partyId: string,
  organizationalUnitId: string
): Promise<AuthActionResult<OrganizationalUnitView>> {
  try {
    const context = await requirePartyContext();
    const service = createOrganizationalUnitService();
    const data = await service.getOrganizationalUnit(
      context,
      partyId,
      organizationalUnitId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addOrganizationalUnitAction(
  partyId: string,
  payload: AddOrganizationalUnitPayload
): Promise<AuthActionResult<OrganizationStructurePanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createOrganizationalUnitService();
    const data = await service.addUnit(context, partyId, payload);
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateOrganizationalUnitAction(
  partyId: string,
  organizationalUnitId: string,
  payload: UpdateOrganizationalUnitPayload
): Promise<AuthActionResult<OrganizationStructurePanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createOrganizationalUnitService();
    const data = await service.updateUnit(
      context,
      partyId,
      organizationalUnitId,
      payload
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setHeadOfficeOrganizationalUnitAction(
  partyId: string,
  organizationalUnitId: string
): Promise<AuthActionResult<OrganizationStructurePanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createOrganizationalUnitService();
    const data = await service.setHeadOffice(
      context,
      partyId,
      organizationalUnitId
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeHeadOfficeDesignationAction(
  partyId: string,
  organizationalUnitId: string
): Promise<AuthActionResult<OrganizationStructurePanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createOrganizationalUnitService();
    const data = await service.removeHeadOfficeDesignation(
      context,
      partyId,
      organizationalUnitId
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deactivateOrganizationalUnitAction(
  partyId: string,
  organizationalUnitId: string
): Promise<AuthActionResult<OrganizationStructurePanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createOrganizationalUnitService();
    const data = await service.deactivateUnit(
      context,
      partyId,
      organizationalUnitId
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function reactivateOrganizationalUnitAction(
  partyId: string,
  organizationalUnitId: string
): Promise<AuthActionResult<OrganizationStructurePanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createOrganizationalUnitService();
    const data = await service.reactivateUnit(
      context,
      partyId,
      organizationalUnitId
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeOrganizationalUnitAction(
  partyId: string,
  organizationalUnitId: string
): Promise<AuthActionResult<OrganizationStructurePanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createOrganizationalUnitService();
    const data = await service.removeUnit(
      context,
      partyId,
      organizationalUnitId
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function searchOrganizationalUnitsAction(
  partyId: string,
  search: SearchOrganizationalUnitsPayload
): Promise<AuthActionResult<OrganizationStructurePanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createOrganizationalUnitService();
    const data = await service.getOrganizationStructure(
      context,
      partyId,
      search
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
