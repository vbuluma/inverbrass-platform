"use server";

/**
 * Purpose:
 * Expose Party Role Management server actions to the App Router UI.
 *
 * Architecture:
 * UI → Server Actions → PartyRoleService → Repositories → Drizzle
 *
 * Implementation Package:
 * BP-002 / IP-002 – Party Roles
 */

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { PartyError } from "@/modules/party/errors";
import { createPartyRoleService } from "@/modules/party/services/party-role-service";
import type {
  AssignPartyRolePayload,
  PartyRolesPanelView,
  UpdatePartyRolePayload,
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

  console.error("[party-role-actions] Unexpected error", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "We could not complete that Party action. Please try again.",
    },
  };
}

export async function listPartyRolesAction(
  partyId: string
): Promise<AuthActionResult<PartyRolesPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyRoleService();
    const data = await service.getPartyRoles(context, partyId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function assignPartyRoleAction(
  partyId: string,
  payload: AssignPartyRolePayload
): Promise<AuthActionResult<PartyRolesPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyRoleService();
    const data = await service.assignRole(context, partyId, payload);
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function removePartyRoleAction(
  partyId: string,
  partyRoleId: string
): Promise<AuthActionResult<PartyRolesPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyRoleService();
    const data = await service.removeRole(context, partyId, partyRoleId);
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updatePartyRoleAction(
  partyId: string,
  partyRoleId: string,
  payload: UpdatePartyRolePayload
): Promise<AuthActionResult<PartyRolesPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyRoleService();
    const data = await service.updateRole(
      context,
      partyId,
      partyRoleId,
      payload
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * WHAT: Designate an Active Party Role as the Primary Role.
 * WHY: Avoid boolean payload ambiguity on the shared update action —
 * changing primary must always clear the previous primary in one transaction.
 */
export async function setPrimaryPartyRoleAction(
  partyId: string,
  partyRoleId: string
): Promise<AuthActionResult<PartyRolesPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyRoleService();
    const data = await service.changePrimaryRole(
      context,
      partyId,
      partyRoleId
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
