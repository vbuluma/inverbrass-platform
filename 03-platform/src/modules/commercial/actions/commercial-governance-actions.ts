"use server";

/**
 * Purpose:
 * Server actions for BP-005 / IP-08 Commercial Governance workspace.
 */

import { requireCommercialGovernanceChannelContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import {
  CommercialError,
  createCommercialGovernanceService,
  type CommercialGovernanceActor,
  type CommercialGovernanceWorkspaceView,
  type CommercialRuleVersionView,
  type CreateCommercialRuleDraftInput,
  type UpsertCommercialGovernancePolicyInput,
} from "@/modules/commercial";
import { getProcessCommercialGovernanceStore } from "@/modules/commercial/services/commercial-governance-drizzle-store";

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

function governanceServiceActor(
  actor: Awaited<
    ReturnType<typeof requireCommercialGovernanceChannelContext>
  >["actor"]
): CommercialGovernanceActor {
  return { ...actor, permissions: [...actor.permissions] };
}

export async function loadCommercialGovernanceWorkspaceAction(): Promise<
  AuthActionResult<CommercialGovernanceWorkspaceView>
> {
  try {
    const { context } = await requireCommercialGovernanceChannelContext();
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
    const { context, actor } = await requireCommercialGovernanceChannelContext();
    service().upsertPolicy(context, governanceServiceActor(actor), input);
    return { success: true, data: service().getWorkspace(context) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createCommercialRuleDraftAction(
  input: CreateCommercialRuleDraftInput
): Promise<AuthActionResult<CommercialRuleVersionView>> {
  try {
    const { context, actor } = await requireCommercialGovernanceChannelContext();
    const data = service().createDraft(context, governanceServiceActor(actor), input);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function submitCommercialRuleAction(
  ruleVersionId: string
): Promise<AuthActionResult<CommercialRuleVersionView>> {
  try {
    const { context, actor } = await requireCommercialGovernanceChannelContext();
    const result = service().submitForApproval(
      context,
      governanceServiceActor(actor),
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
    const { context, actor } = await requireCommercialGovernanceChannelContext();
    const data = service().approve(
      context,
      governanceServiceActor(actor),
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
    const { context, actor } = await requireCommercialGovernanceChannelContext();
    const data = service().reject(
      context,
      governanceServiceActor(actor),
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
    const { context, actor } = await requireCommercialGovernanceChannelContext();
    const data = service().activate(
      context,
      governanceServiceActor(actor),
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
    const { context, actor } = await requireCommercialGovernanceChannelContext();
    const data = service().suspend(
      context,
      governanceServiceActor(actor),
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
    const { context } = await requireCommercialGovernanceChannelContext();
    const data = service().getRuleHistory(context, ruleVersionId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
