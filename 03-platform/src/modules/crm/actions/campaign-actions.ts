"use server";

/**
 * Purpose:
 * Expose Campaign server actions to the App Router UI.
 *
 * Implementation Package:
 * BP-004 / IP-11 – Campaign Management
 */

import { requireCrmChannelContext as requireCrmContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { CrmError } from "@/modules/crm/errors";
import { createCampaignCustomer360Provider } from "@/modules/crm/campaign/services/campaign-customer-360-provider";
import { createCampaignService } from "@/modules/crm/campaign/services/campaign-service";
import type {
  CampaignCustomer360Contribution,
  CampaignDashboardView,
  CampaignDetailView,
  CampaignSearchFilters,
  CampaignSearchResultView,
  CreateCampaignPayload,
  UpdateCampaignPayload,
} from "@/modules/crm/campaign/types";


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
  if (error instanceof CrmError) {
    return { success: false, error: { code: error.code, message: error.message } };
  }
  if (error instanceof AuthError) {
    return { success: false, error: { code: error.code, message: error.message } };
  }
  console.error("[campaign-actions] Unexpected error", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "Something went wrong. Please try again.",
    },
  };
}

function revalidateCampaign(campaignId?: string) {
  revalidatePath("/campaigns");
  if (campaignId) {
    revalidatePath(`/campaigns/${campaignId}`);
  }
}

export async function getCampaignDashboardAction(): Promise<
  AuthActionResult<CampaignDashboardView>
> {
  try {
    const context = await requireCrmContext();
    const data = await createCampaignService().getDashboard(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function searchCampaignsAction(
  filters: CampaignSearchFilters = {}
): Promise<AuthActionResult<CampaignSearchResultView>> {
  try {
    const context = await requireCrmContext();
    const data = await createCampaignService().searchCampaigns(context, filters);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getCampaignAction(
  campaignId: string
): Promise<AuthActionResult<CampaignDetailView>> {
  try {
    const context = await requireCrmContext();
    const data = await createCampaignService().getCampaignDetail(context, campaignId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createCampaignAction(
  payload: CreateCampaignPayload
): Promise<AuthActionResult<CampaignDetailView>> {
  try {
    const context = await requireCrmContext();
    const data = await createCampaignService().createCampaign(context, payload);
    revalidateCampaign(data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateCampaignAction(
  campaignId: string,
  payload: UpdateCampaignPayload
): Promise<AuthActionResult<CampaignDetailView>> {
  try {
    const context = await requireCrmContext();
    const data = await createCampaignService().updateCampaign(
      context,
      campaignId,
      payload
    );
    revalidateCampaign(campaignId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function activateCampaignAction(
  campaignId: string
): Promise<AuthActionResult<CampaignDetailView>> {
  try {
    const context = await requireCrmContext();
    const data = await createCampaignService().activateCampaign(context, campaignId);
    revalidateCampaign(campaignId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function completeCampaignAction(
  campaignId: string
): Promise<AuthActionResult<CampaignDetailView>> {
  try {
    const context = await requireCrmContext();
    const data = await createCampaignService().completeCampaign(context, campaignId);
    revalidateCampaign(campaignId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function cancelCampaignAction(
  campaignId: string
): Promise<AuthActionResult<CampaignDetailView>> {
  try {
    const context = await requireCrmContext();
    const data = await createCampaignService().cancelCampaign(context, campaignId);
    revalidateCampaign(campaignId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function syncCampaignAudienceAction(
  campaignId: string
): Promise<AuthActionResult<CampaignDetailView>> {
  try {
    const context = await requireCrmContext();
    const data = await createCampaignService().syncAudienceFromPartyGroup(
      context,
      campaignId
    );
    revalidateCampaign(campaignId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function markCampaignMemberSentAction(
  campaignId: string,
  memberId: string
): Promise<AuthActionResult<CampaignDetailView>> {
  try {
    const context = await requireCrmContext();
    const data = await createCampaignService().markMemberSent(
      context,
      campaignId,
      memberId
    );
    revalidateCampaign(campaignId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function recordCampaignMemberResponseAction(
  campaignId: string,
  memberId: string
): Promise<AuthActionResult<CampaignDetailView>> {
  try {
    const context = await requireCrmContext();
    const data = await createCampaignService().recordMemberResponse(
      context,
      campaignId,
      memberId
    );
    revalidateCampaign(campaignId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function markCampaignMemberConvertedAction(
  campaignId: string,
  memberId: string
): Promise<AuthActionResult<CampaignDetailView>> {
  try {
    const context = await requireCrmContext();
    const data = await createCampaignService().markMemberConverted(
      context,
      campaignId,
      memberId
    );
    revalidateCampaign(campaignId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getCampaignCustomer360Action(
  partyId: string
): Promise<AuthActionResult<CampaignCustomer360Contribution>> {
  try {
    const context = await requireCrmContext();
    const data = await createCampaignCustomer360Provider().getContribution(
      context,
      partyId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
