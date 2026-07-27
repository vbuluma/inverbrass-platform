"use server";

/**
 * Purpose:
 * Expose Party Contact Management server actions to the App Router UI.
 *
 * Architecture:
 * UI → Server Actions → PartyContactService → Repositories → Drizzle
 *
 * Implementation Package:
 * BP-002 / IP-003 – Contacts & Communication
 */

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { PartyError } from "@/modules/party/errors";
import { createPartyContactService } from "@/modules/party/services/party-contact-service";
import type {
  AddPartyContactPayload,
  PartyContactsPanelView,
  UpdatePartyContactPayload,
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

  console.error("[party-contact-actions] Unexpected error", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "We could not complete that Party action. Please try again.",
    },
  };
}

export async function listPartyContactsAction(
  partyId: string
): Promise<AuthActionResult<PartyContactsPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyContactService();
    const data = await service.getPartyContacts(context, partyId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addPartyContactAction(
  partyId: string,
  payload: AddPartyContactPayload
): Promise<AuthActionResult<PartyContactsPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyContactService();
    const data = await service.addContact(context, partyId, payload);
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updatePartyContactAction(
  partyId: string,
  partyContactId: string,
  payload: UpdatePartyContactPayload
): Promise<AuthActionResult<PartyContactsPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyContactService();
    const data = await service.updateContact(
      context,
      partyId,
      partyContactId,
      payload
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setPreferredPartyContactAction(
  partyId: string,
  partyContactId: string
): Promise<AuthActionResult<PartyContactsPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyContactService();
    const data = await service.setPreferred(context, partyId, partyContactId);
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function verifyPartyContactAction(
  partyId: string,
  partyContactId: string
): Promise<AuthActionResult<PartyContactsPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyContactService();
    const data = await service.verifyContact(context, partyId, partyContactId);
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deactivatePartyContactAction(
  partyId: string,
  partyContactId: string
): Promise<AuthActionResult<PartyContactsPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyContactService();
    const data = await service.deactivateContact(
      context,
      partyId,
      partyContactId
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function reactivatePartyContactAction(
  partyId: string,
  partyContactId: string
): Promise<AuthActionResult<PartyContactsPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyContactService();
    const data = await service.reactivateContact(
      context,
      partyId,
      partyContactId
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function removePartyContactAction(
  partyId: string,
  partyContactId: string
): Promise<AuthActionResult<PartyContactsPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyContactService();
    const data = await service.removeContact(context, partyId, partyContactId);
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
