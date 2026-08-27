"use server";

import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import {
  CRM_GOVERNANCE_USER_MESSAGES,
  CrmGovernanceError,
} from "@/modules/crm-governance/errors";
import { createCrmGovernanceService } from "@/modules/crm-governance/services/crm-governance-service";
import type {
  CrmApprovalMatrixView,
  CrmBusinessHoursView,
  CrmGovernanceCustomer360SettingsContribution,
  CrmGovernanceDashboardView,
  CrmHolidayView,
  CrmMergeProposalView,
  CrmPartyGovernancePanelView,
  CrmSlaPolicyView,
  DetectCrmDuplicatesPayload,
  MergeProposalActionPayload,
  RunCrmGovernanceValidationPayload,
  ToggleCrmGovernanceLockPayload,
  UpdateCrmGovernanceNotesPayload,
  UpdateCrmGovernanceOwnershipPayload,
  UpsertCrmApprovalMatrixPayload,
  UpsertCrmBusinessHoursPayload,
  UpsertCrmHolidayPayload,
  UpsertCrmSlaPolicyPayload,
} from "@/modules/crm-governance/types";

export type CrmGovernanceActionResult<T> = AuthActionResult<T>;

async function requireGovernanceContext() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  if (!user) {
    throw new CrmGovernanceError(
      "SESSION_REQUIRED",
      CRM_GOVERNANCE_USER_MESSAGES.SESSION_REQUIRED,
      401
    );
  }
  const context = await createBusinessContextService().getCurrentContext();
  if (!context) {
    throw new CrmGovernanceError(
      "BUSINESS_CONTEXT_REQUIRED",
      CRM_GOVERNANCE_USER_MESSAGES.BUSINESS_CONTEXT_REQUIRED,
      403
    );
  }
  return context;
}

function mapGovernanceError(error: unknown): AuthActionResult<never> {
  if (error instanceof CrmGovernanceError) {
    return {
      success: false,
      error: { code: error.code, message: error.message, field: error.field },
    };
  }
  if (error instanceof AuthError) {
    return {
      success: false,
      error: { code: error.code, message: error.message },
    };
  }
  throw error;
}

function revalidateGovernancePaths(partyId?: string) {
  revalidatePath("/crm/governance");
  if (partyId) {
    revalidatePath(`/crm/governance/parties/${partyId}`);
    revalidatePath(`/parties/${partyId}`);
  }
}

export async function getCrmGovernanceDashboardAction(): Promise<
  CrmGovernanceActionResult<CrmGovernanceDashboardView>
> {
  try {
    const context = await requireGovernanceContext();
    const data = await createCrmGovernanceService().getDashboard(context);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapGovernanceError(error);
  }
}

export async function getCrmPartyGovernancePanelAction(
  partyId: string
): Promise<CrmGovernanceActionResult<CrmPartyGovernancePanelView>> {
  try {
    const context = await requireGovernanceContext();
    const data = await createCrmGovernanceService().getPartyGovernancePanel(
      context,
      partyId
    );
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapGovernanceError(error);
  }
}

export async function updateCrmGovernanceOwnershipAction(
  payload: UpdateCrmGovernanceOwnershipPayload
): Promise<CrmGovernanceActionResult<CrmPartyGovernancePanelView>> {
  try {
    const context = await requireGovernanceContext();
    const data = await createCrmGovernanceService().updateOwnership(
      context,
      payload
    );
    revalidateGovernancePaths(payload.partyId);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapGovernanceError(error);
  }
}

export async function updateCrmGovernanceNotesAction(
  payload: UpdateCrmGovernanceNotesPayload
): Promise<CrmGovernanceActionResult<CrmPartyGovernancePanelView>> {
  try {
    const context = await requireGovernanceContext();
    const data = await createCrmGovernanceService().updateNotes(
      context,
      payload
    );
    revalidateGovernancePaths(payload.partyId);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapGovernanceError(error);
  }
}

export async function toggleCrmGovernanceLockAction(
  payload: ToggleCrmGovernanceLockPayload
): Promise<CrmGovernanceActionResult<CrmPartyGovernancePanelView>> {
  try {
    const context = await requireGovernanceContext();
    const data = await createCrmGovernanceService().toggleLock(context, payload);
    revalidateGovernancePaths(payload.partyId);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapGovernanceError(error);
  }
}

export async function runCrmGovernanceValidationAction(
  payload: RunCrmGovernanceValidationPayload
): Promise<CrmGovernanceActionResult<CrmPartyGovernancePanelView>> {
  try {
    const context = await requireGovernanceContext();
    const data = await createCrmGovernanceService().runValidation(
      context,
      payload
    );
    revalidateGovernancePaths(payload.partyId);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapGovernanceError(error);
  }
}

export async function detectCrmDuplicatesAction(
  payload: DetectCrmDuplicatesPayload
): Promise<CrmGovernanceActionResult<CrmMergeProposalView[]>> {
  try {
    const context = await requireGovernanceContext();
    const data = await createCrmGovernanceService().detectDuplicates(
      context,
      payload
    );
    revalidateGovernancePaths(payload.partyId);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapGovernanceError(error);
  }
}

export async function approveCrmMergeProposalAction(
  payload: MergeProposalActionPayload
): Promise<CrmGovernanceActionResult<CrmMergeProposalView>> {
  try {
    const context = await requireGovernanceContext();
    const data = await createCrmGovernanceService().approveMergeProposal(
      context,
      payload
    );
    revalidateGovernancePaths();
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapGovernanceError(error);
  }
}

export async function rejectCrmMergeProposalAction(
  payload: MergeProposalActionPayload
): Promise<CrmGovernanceActionResult<CrmMergeProposalView>> {
  try {
    const context = await requireGovernanceContext();
    const data = await createCrmGovernanceService().rejectMergeProposal(
      context,
      payload
    );
    revalidateGovernancePaths();
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapGovernanceError(error);
  }
}

export async function executeCrmMergeProposalAction(
  payload: MergeProposalActionPayload
): Promise<CrmGovernanceActionResult<CrmMergeProposalView>> {
  try {
    const context = await requireGovernanceContext();
    const data = await createCrmGovernanceService().executeMergeProposal(
      context,
      payload
    );
    revalidateGovernancePaths();
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapGovernanceError(error);
  }
}

export async function upsertCrmSlaPolicyAction(
  payload: UpsertCrmSlaPolicyPayload
): Promise<CrmGovernanceActionResult<CrmSlaPolicyView>> {
  try {
    const context = await requireGovernanceContext();
    const data = await createCrmGovernanceService().upsertSlaPolicy(
      context,
      payload
    );
    revalidateGovernancePaths();
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapGovernanceError(error);
  }
}

export async function upsertCrmBusinessHoursAction(
  payload: UpsertCrmBusinessHoursPayload
): Promise<CrmGovernanceActionResult<CrmBusinessHoursView>> {
  try {
    const context = await requireGovernanceContext();
    const data = await createCrmGovernanceService().upsertBusinessHours(
      context,
      payload
    );
    revalidateGovernancePaths();
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapGovernanceError(error);
  }
}

export async function upsertCrmHolidayAction(
  payload: UpsertCrmHolidayPayload
): Promise<CrmGovernanceActionResult<CrmHolidayView>> {
  try {
    const context = await requireGovernanceContext();
    const data = await createCrmGovernanceService().upsertHoliday(
      context,
      payload
    );
    revalidateGovernancePaths();
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapGovernanceError(error);
  }
}

export async function upsertCrmApprovalMatrixAction(
  payload: UpsertCrmApprovalMatrixPayload
): Promise<CrmGovernanceActionResult<CrmApprovalMatrixView>> {
  try {
    const context = await requireGovernanceContext();
    const data = await createCrmGovernanceService().upsertApprovalMatrixEntry(
      context,
      payload
    );
    revalidateGovernancePaths();
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapGovernanceError(error);
  }
}

export async function getCrmGovernanceCustomer360SettingsAction(): Promise<
  CrmGovernanceActionResult<CrmGovernanceCustomer360SettingsContribution>
> {
  try {
    await requireGovernanceContext();
    const data =
      createCrmGovernanceService().getCustomer360SettingsContribution();
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapGovernanceError(error);
  }
}
