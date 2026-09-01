"use server";

/**
 * Purpose:
 * Server actions for BP-009 IP-11 supplier performance and governance.
 */

import { revalidatePath } from "next/cache";

import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { ALL_PROCUREMENT_PERMISSIONS, ProcurementError } from "@/modules/procurement";
import { createPerformanceService } from "@/modules/procurement/services/performance-service";
import type {
  GovernanceProposalRecord,
  ProposeGovernanceCommand,
  SupplierProfilePerformanceView,
  SupplierScorecardView,
} from "@/modules/procurement/types";

export type PerformanceActionError = { code: string; message: string; field?: string };
export type PerformanceActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: PerformanceActionError };

async function requireContext() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  if (!user) {
    throw new ProcurementError("SESSION_REQUIRED", undefined, 401);
  }
  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();
  if (!context) {
    throw new ProcurementError("BUSINESS_CONTEXT_REQUIRED", undefined, 403);
  }
  return {
    context,
    actor: { userId: user.platformUserId, permissions: ALL_PROCUREMENT_PERMISSIONS },
  };
}

function toError(error: unknown): PerformanceActionError {
  if (error instanceof ProcurementError) {
    return { code: error.code, message: error.message, field: error.field };
  }
  if (isNextRedirectError(error)) {
    throw error;
  }
  return { code: "PROVIDER_ERROR", message: "Supplier performance could not be completed." };
}

function revalidateProfile(profileId: string) {
  revalidatePath(`/procurement/suppliers/${profileId}`);
  revalidatePath("/procurement/suppliers");
}

export async function getSupplierPerformanceAction(
  profileId: string
): Promise<PerformanceActionResult<SupplierProfilePerformanceView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createPerformanceService().getProfilePerformance(context, actor, profileId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function refreshSupplierScorecardAction(
  profileId: string
): Promise<PerformanceActionResult<SupplierScorecardView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createPerformanceService().refreshScorecard(context, actor, profileId);
    revalidateProfile(profileId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function proposeGovernanceAction(
  profileId: string,
  input: ProposeGovernanceCommand
): Promise<PerformanceActionResult<GovernanceProposalRecord>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createPerformanceService().proposeGovernance(context, actor, profileId, input);
    revalidateProfile(profileId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function approveGovernanceAction(
  profileId: string,
  proposalId: string
): Promise<PerformanceActionResult<GovernanceProposalRecord>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createPerformanceService().approveGovernance(context, actor, proposalId);
    revalidateProfile(profileId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function rejectGovernanceAction(
  profileId: string,
  proposalId: string,
  reason?: string | null
): Promise<PerformanceActionResult<GovernanceProposalRecord>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createPerformanceService().rejectGovernance(context, actor, proposalId, reason);
    revalidateProfile(profileId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function submitInternalEvaluationAction(
  profileId: string,
  input: import("@/modules/procurement/types").SubmitPerformanceEvaluationCommand
): Promise<PerformanceActionResult<import("@/modules/procurement/types").PerformanceEvaluationRecord>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createPerformanceService().submitInternalEvaluation(
      context,
      actor,
      profileId,
      input
    );
    revalidateProfile(profileId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function submitSupplierSelfEvaluationAction(
  profileId: string,
  input: import("@/modules/procurement/types").SubmitPerformanceEvaluationCommand
): Promise<PerformanceActionResult<import("@/modules/procurement/types").PerformanceEvaluationRecord>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createPerformanceService().submitSupplierSelfEvaluation(
      context,
      actor,
      profileId,
      input
    );
    revalidateProfile(profileId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function updatePerformanceControlAction(
  profileId: string,
  input: import("@/modules/procurement/types").UpdatePerformanceControlCommand
): Promise<PerformanceActionResult<import("@/modules/procurement/types").PerformanceControlRecord>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createPerformanceService().updatePerformanceControl(context, actor, input);
    revalidateProfile(profileId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function rankSuppliersForInvitationAction(
  profileIds: string[]
): Promise<PerformanceActionResult<import("@/modules/procurement/types").SupplierPerformanceRanking[]>> {
  try {
    const { context } = await requireContext();
    const preferredByProfile = Object.fromEntries(profileIds.map((id) => [id, false]));
    const data = await createPerformanceService().rankSuppliers(
      context,
      profileIds,
      preferredByProfile
    );
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}
