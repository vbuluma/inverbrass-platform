"use server";

/**
 * Purpose:
 * Expose Party Communication & Consent Preferences server actions.
 *
 * Architecture:
 * UI → Server Actions → PartyCommunicationPreferenceService → CommunicationPreferenceService
 *
 * Implementation Package:
 * BP-002 / IP-012 – Party Communication & Consent Preferences
 */

import { requirePartyChannelContext as requirePartyContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import type { SaveCommunicationPreferencePayload } from "@/core/communication-preference/types";
import type { PartyCommunicationPreferencesPanelView } from "@/modules/party/types";
import { PartyError } from "@/modules/party/errors";
import { createPartyCommunicationPreferenceService } from "@/modules/party/services/party-communication-preference-service";

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
      error: {
        code: error.code,
        message: error.message,
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

export async function getPartyCommunicationPreferencesAction(
  partyId: string
): Promise<AuthActionResult<PartyCommunicationPreferencesPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyCommunicationPreferenceService();
    const data = await service.getCommunicationPreferences(context, partyId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function savePartyCommunicationPreferencesAction(
  partyId: string,
  payload: SaveCommunicationPreferencePayload
): Promise<AuthActionResult<PartyCommunicationPreferencesPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyCommunicationPreferenceService();
    const data = await service.saveCommunicationPreferences(
      context,
      partyId,
      payload
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function resetPartyCommunicationPreferencesAction(
  partyId: string
): Promise<AuthActionResult<PartyCommunicationPreferencesPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyCommunicationPreferenceService();
    const data = await service.getCommunicationPreferences(context, partyId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
