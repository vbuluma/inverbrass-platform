"use server";

/**
 * Purpose:
 * Expose Party Timeline server actions to the App Router UI.
 *
 * Architecture:
 * UI → Server Actions → PartyTimelineQueryService → PartyTimelineService
 *
 * Implementation Package:
 * BP-002 / IP-010 – Party Timeline & Activity History
 */

import { requirePartyChannelContext as requirePartyContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { PartyError } from "@/modules/party/errors";
import { createPartyTimelineQueryService } from "@/modules/party/services/party-timeline-query-service";
import type { PartyTimelinePanelView } from "@/modules/party/types";
import type { PartyTimelineListFiltersInput } from "@/modules/party/validators/party-timeline-validators";
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
        field: error.field,
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
      code: "UNEXPECTED_ERROR",
      message: "Something went wrong. Please try again.",
    },
  };
}

export async function listPartyTimelineAction(
  partyId: string,
  filters?: PartyTimelineListFiltersInput
): Promise<AuthActionResult<PartyTimelinePanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyTimelineQueryService();
    const data = await service.getTimelinePanel(context, partyId, filters);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function loadMorePartyTimelineAction(
  partyId: string,
  filters: PartyTimelineListFiltersInput
): Promise<AuthActionResult<PartyTimelinePanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyTimelineQueryService();
    const data = await service.getTimelinePanel(context, partyId, filters);
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
