"use server";

/**
 * Purpose:
 * Expose Party Relationship Management server actions to the App Router UI.
 *
 * Architecture:
 * UI → Server Actions → PartyRelationshipService → Repositories → Drizzle
 *
 * Implementation Package:
 * BP-002 / IP-005 – Party Relationships
 */

import { requirePartyChannelContext as requirePartyContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { PartyError } from "@/modules/party/errors";
import { createPartyRelationshipService } from "@/modules/party/services/party-relationship-service";
import { createPartyService } from "@/modules/party/services/party-service";
import type {
  AddPartyRelationshipPayload,
  PartyRelationshipsPanelView,
  PartySearchResultView,
  UpdatePartyRelationshipPayload,
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

  console.error("[party-relationship-actions] Unexpected error", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "We could not complete that Party action. Please try again.",
    },
  };
}

export async function listPartyRelationshipsAction(
  partyId: string
): Promise<AuthActionResult<PartyRelationshipsPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyRelationshipService();
    const data = await service.getPartyRelationships(context, partyId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function searchPartiesForRelationshipAction(
  partyId: string,
  query: string
): Promise<AuthActionResult<PartySearchResultView[]>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyService();
    const data = await service.searchParties(context, query, partyId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addPartyRelationshipAction(
  partyId: string,
  payload: AddPartyRelationshipPayload
): Promise<AuthActionResult<PartyRelationshipsPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyRelationshipService();
    const data = await service.addRelationship(context, partyId, payload);
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updatePartyRelationshipAction(
  partyId: string,
  partyRelationshipId: string,
  payload: UpdatePartyRelationshipPayload
): Promise<AuthActionResult<PartyRelationshipsPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyRelationshipService();
    const data = await service.updateRelationship(
      context,
      partyId,
      partyRelationshipId,
      payload
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deactivatePartyRelationshipAction(
  partyId: string,
  partyRelationshipId: string
): Promise<AuthActionResult<PartyRelationshipsPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyRelationshipService();
    const data = await service.deactivateRelationship(
      context,
      partyId,
      partyRelationshipId
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function reactivatePartyRelationshipAction(
  partyId: string,
  partyRelationshipId: string
): Promise<AuthActionResult<PartyRelationshipsPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyRelationshipService();
    const data = await service.reactivateRelationship(
      context,
      partyId,
      partyRelationshipId
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function removePartyRelationshipAction(
  partyId: string,
  partyRelationshipId: string
): Promise<AuthActionResult<PartyRelationshipsPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyRelationshipService();
    const data = await service.removeRelationship(
      context,
      partyId,
      partyRelationshipId
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
