"use server";

/**
 * Purpose:
 * Expose Party Address Management server actions to the App Router UI.
 *
 * Architecture:
 * UI → Server Actions → PartyAddressService → Repositories → Drizzle
 *
 * Implementation Package:
 * BP-002 / IP-004 – Address Management
 */

import { requirePartyChannelContext as requirePartyContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { PartyError } from "@/modules/party/errors";
import { createPartyAddressService } from "@/modules/party/services/party-address-service";
import type {
  AddPartyAddressPayload,
  PartyAddressesPanelView,
  UpdatePartyAddressPayload,
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

  console.error("[party-address-actions] Unexpected error", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "We could not complete that Party action. Please try again.",
    },
  };
}

export async function listPartyAddressesAction(
  partyId: string
): Promise<AuthActionResult<PartyAddressesPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyAddressService();
    const data = await service.getPartyAddresses(context, partyId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addPartyAddressAction(
  partyId: string,
  payload: AddPartyAddressPayload
): Promise<AuthActionResult<PartyAddressesPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyAddressService();
    const data = await service.addAddress(context, partyId, payload);
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updatePartyAddressAction(
  partyId: string,
  partyAddressId: string,
  payload: UpdatePartyAddressPayload
): Promise<AuthActionResult<PartyAddressesPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyAddressService();
    const data = await service.updateAddress(
      context,
      partyId,
      partyAddressId,
      payload
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setDefaultPartyAddressAction(
  partyId: string,
  partyAddressId: string
): Promise<AuthActionResult<PartyAddressesPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyAddressService();
    const data = await service.setDefault(context, partyId, partyAddressId);
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deactivatePartyAddressAction(
  partyId: string,
  partyAddressId: string
): Promise<AuthActionResult<PartyAddressesPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyAddressService();
    const data = await service.deactivateAddress(
      context,
      partyId,
      partyAddressId
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function reactivatePartyAddressAction(
  partyId: string,
  partyAddressId: string
): Promise<AuthActionResult<PartyAddressesPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyAddressService();
    const data = await service.reactivateAddress(
      context,
      partyId,
      partyAddressId
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function removePartyAddressAction(
  partyId: string,
  partyAddressId: string
): Promise<AuthActionResult<PartyAddressesPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyAddressService();
    const data = await service.removeAddress(context, partyId, partyAddressId);
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
