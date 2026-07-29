"use server";

/**
 * Purpose:
 * Expose Party Group & Membership server actions to the App Router UI.
 *
 * Architecture:
 * UI → Server Actions → PartyGroupService → Repositories → Drizzle
 *
 * Implementation Package:
 * BP-002 / IP-008 – Party Groups & Membership
 */

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { PartyError } from "@/modules/party/errors";
import { createPartyGroupRepository } from "@/modules/party/repositories/party-group-repository";
import { createPartyGroupService } from "@/modules/party/services/party-group-service";
import { createPartyService } from "@/modules/party/services/party-service";
import type {
  AddPartyGroupMemberPayload,
  AddPartyToGroupPayload,
  CreatePartyGroupPayload,
  PartyGroupDashboardView,
  PartyGroupDetailView,
  PartyGroupMembersPanelView,
  PartyGroupSearchResultView,
  PartyGroupsPanelView,
  UpdatePartyGroupMemberPayload,
  UpdatePartyGroupPayload,
  PartySearchResultView,
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

  console.error("[party-group-actions] Unexpected error", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "We could not complete that Party action. Please try again.",
    },
  };
}

export async function getPartyGroupDashboardAction(): Promise<
  AuthActionResult<PartyGroupDashboardView>
> {
  try {
    const context = await requirePartyContext();
    const service = createPartyGroupService();
    const data = await service.getGroupDashboard(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getPartyGroupDetailAction(
  partyGroupId: string
): Promise<AuthActionResult<PartyGroupDetailView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyGroupService();
    const data = await service.getGroupDetail(context, partyGroupId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getPartyGroupMembersPanelAction(
  partyGroupId: string
): Promise<AuthActionResult<PartyGroupMembersPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyGroupService();
    const data = await service.getGroupMembersPanel(context, partyGroupId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listPartyGroupsAction(
  partyId: string
): Promise<AuthActionResult<PartyGroupsPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyGroupService();
    const data = await service.getPartyGroupsPanel(context, partyId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createPartyGroupAction(
  payload: CreatePartyGroupPayload
): Promise<AuthActionResult<PartyGroupDashboardView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyGroupService();
    const data = await service.createGroup(context, payload);
    revalidatePath("/groups");
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updatePartyGroupAction(
  partyGroupId: string,
  payload: UpdatePartyGroupPayload
): Promise<AuthActionResult<PartyGroupMembersPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyGroupService();
    const data = await service.updateGroup(context, partyGroupId, payload);
    revalidatePath(`/groups/${partyGroupId}`);
    revalidatePath("/groups");
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deactivatePartyGroupAction(
  partyGroupId: string
): Promise<AuthActionResult<PartyGroupMembersPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyGroupService();
    const data = await service.deactivateGroup(context, partyGroupId);
    revalidatePath(`/groups/${partyGroupId}`);
    revalidatePath("/groups");
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function reactivatePartyGroupAction(
  partyGroupId: string
): Promise<AuthActionResult<PartyGroupMembersPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyGroupService();
    const data = await service.reactivateGroup(context, partyGroupId);
    revalidatePath(`/groups/${partyGroupId}`);
    revalidatePath("/groups");
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addPartyGroupMemberAction(
  partyGroupId: string,
  payload: AddPartyGroupMemberPayload
): Promise<AuthActionResult<PartyGroupMembersPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyGroupService();
    const data = await service.addMemberToGroup(
      context,
      partyGroupId,
      payload
    );
    revalidatePath(`/groups/${partyGroupId}`);
    revalidatePath("/groups");
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addPartyToGroupAction(
  partyId: string,
  payload: AddPartyToGroupPayload
): Promise<AuthActionResult<PartyGroupsPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyGroupService();
    const data = await service.addPartyToGroup(context, partyId, payload);
    revalidatePath(`/parties/${partyId}`);
    revalidatePath(`/groups/${payload.partyGroupId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updatePartyGroupMemberAction(
  partyGroupId: string,
  partyGroupMemberId: string,
  payload: UpdatePartyGroupMemberPayload
): Promise<AuthActionResult<PartyGroupMembersPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyGroupService();
    const data = await service.updateMember(
      context,
      partyGroupId,
      partyGroupMemberId,
      payload
    );
    revalidatePath(`/groups/${partyGroupId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function leavePartyGroupAction(
  partyId: string,
  partyGroupMemberId: string
): Promise<AuthActionResult<PartyGroupsPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyGroupService();
    const data = await service.leaveGroup(
      context,
      partyId,
      partyGroupMemberId
    );
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function exitPartyGroupMemberAction(
  partyGroupId: string,
  partyGroupMemberId: string
): Promise<AuthActionResult<PartyGroupMembersPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyGroupService();
    const data = await service.exitMemberFromGroup(
      context,
      partyGroupId,
      partyGroupMemberId
    );
    revalidatePath(`/groups/${partyGroupId}`);
    revalidatePath("/groups");
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejoinPartyGroupMemberAction(
  partyGroupId: string,
  partyGroupMemberId: string
): Promise<AuthActionResult<PartyGroupMembersPanelView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyGroupService();
    const data = await service.rejoinMember(
      context,
      partyGroupId,
      partyGroupMemberId
    );
    revalidatePath(`/groups/${partyGroupId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function searchPartyGroupsAction(
  query: string
): Promise<AuthActionResult<PartyGroupSearchResultView[]>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyGroupService();
    const data = await service.searchGroups(context, query);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function searchPartiesForGroupMemberAction(
  partyGroupId: string,
  query: string
): Promise<AuthActionResult<PartySearchResultView[]>> {
  try {
    const context = await requirePartyContext();
    const groupRepository = createPartyGroupRepository();
    const group = await groupRepository.findById(
      context.businessId,
      partyGroupId
    );
    if (!group) {
      throw new PartyError(
        "PARTY_GROUP_NOT_FOUND",
        "That group could not be found.",
        404
      );
    }
    const partyService = createPartyService();
    const data = await partyService.searchParties(context, query);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
