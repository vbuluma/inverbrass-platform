"use server";

/**
 * Purpose:
 * Server actions for BP-005 / IP-08 Commercial Governance workspace.
 */

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import {
  CommercialError,
  COMMERCIAL_GOVERNANCE_PERMISSIONS,
  createCommercialGovernanceService,
  type CommercialGovernanceActor,
  type CommercialGovernanceWorkspaceView,
  type CommercialRuleVersionView,
  type CreateCommercialRuleDraftInput,
  type UpsertCommercialGovernancePolicyInput,
} from "@/modules/commercial";
import { getProcessCommercialGovernanceStore } from "@/modules/commercial/services/commercial-governance-drizzle-store";

async function requireContext() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  if (!user) {
    throw new CommercialError(
      "INVALID_INPUT",
      "Your session has expired. Please sign in again.",
      401,
      "session"
    );
  }
  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();
  if (!context) {
    throw new CommercialError(
      "BUSINESS_CONTEXT_MISMATCH",
      "Select a business before managing commercial governance.",
      403,
      "businessId"
    );
  }
  return { context, user };
}

/** Workspace actors receive full governance permissions until RBAC runtime gate ships. */
function actorFromUser(user: { platformUserId: string }): CommercialGovernanceActor {
  return {
    userId: user.platformUserId,
    permissions: Object.values(COMMERCIAL_GOVERNANCE_PERMISSIONS),
    roleCode: "OWNER",
  };
}

function toActionError(error: unknown): AuthActionResult<never> {
  if (isNextRedirectError(error)) {
    throw error;
  }
  if (error instanceof CommercialError) {
    const family =
      typeof error.details?.family === "string"
        ? error.details.family
        : undefined;
    const hint =
      typeof error.details?.actionableHint === "string"
        ? error.details.actionableHint
        : undefined;
    return {
      success: false,
      error: {
        code: error.code,
        message: [family ? `[${family}]` : null, error.message, hint]
          .filter(Boolean)
          .join(" "),
        field: error.field,
      },
    };
  }
  if (error instanceof AuthError) {
    return {
      success: false,
      error: { code: error.code, message: error.message },
    };
  }
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "Commercial governance action failed. Please try again.",
    },
  };
}

function service() {
  return createCommercialGovernanceService(
    getProcessCommercialGovernanceStore()
  );
}

export async function loadCommercialGovernanceWorkspaceAction(): Promise<
  AuthActionResult<CommercialGovernanceWorkspaceView>
> {
  try {
    const { context } = await requireContext();
    const data = service().getWorkspace(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function upsertCommercialGovernancePolicyAction(
  input: UpsertCommercialGovernancePolicyInput
): Promise<AuthActionResult<CommercialGovernanceWorkspaceView>> {
  try {
    const { context, user } = await requireContext();
    service().upsertPolicy(context, actorFromUser(user), input);
    return { success: true, data: service().getWorkspace(context) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createCommercialRuleDraftAction(
  input: CreateCommercialRuleDraftInput
): Promise<AuthActionResult<CommercialRuleVersionView>> {
  try {
    const { context, user } = await requireContext();
    const data = service().createDraft(context, actorFromUser(user), input);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function submitCommercialRuleAction(
  ruleVersionId: string
): Promise<AuthActionResult<CommercialRuleVersionView>> {
  try {
    const { context, user } = await requireContext();
    const result = service().submitForApproval(
      context,
      actorFromUser(user),
      ruleVersionId
    );
    return { success: true, data: result.rule };
  } catch (error) {
    return toActionError(error);
  }
}

export async function approveCommercialRuleAction(
  ruleVersionId: string
): Promise<AuthActionResult<CommercialRuleVersionView>> {
  try {
    const { context, user } = await requireContext();
    const data = service().approve(
      context,
      actorFromUser(user),
      ruleVersionId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectCommercialRuleAction(
  ruleVersionId: string,
  reason: string
): Promise<AuthActionResult<CommercialRuleVersionView>> {
  try {
    const { context, user } = await requireContext();
    const data = service().reject(
      context,
      actorFromUser(user),
      ruleVersionId,
      reason
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function activateCommercialRuleAction(
  ruleVersionId: string
): Promise<AuthActionResult<CommercialRuleVersionView>> {
  try {
    const { context, user } = await requireContext();
    const data = service().activate(
      context,
      actorFromUser(user),
      ruleVersionId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function suspendCommercialRuleAction(
  ruleVersionId: string,
  reason: string
): Promise<AuthActionResult<CommercialRuleVersionView>> {
  try {
    const { context, user } = await requireContext();
    const data = service().suspend(
      context,
      actorFromUser(user),
      ruleVersionId,
      reason
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getCommercialRuleHistoryAction(
  ruleVersionId: string
): Promise<
  AuthActionResult<
    ReturnType<
      ReturnType<typeof createCommercialGovernanceService>["getRuleHistory"]
    >
  >
> {
  try {
    const { context } = await requireContext();
    const data = service().getRuleHistory(context, ruleVersionId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
