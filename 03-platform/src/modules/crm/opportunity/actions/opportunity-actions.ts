"use server";

/**
 * Purpose:
 * Expose Opportunity Management server actions.
 *
 * Implementation Package:
 * BP-004 / IP-03 – Opportunity Management
 */

import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { OpportunityError } from "@/modules/crm/opportunity/errors";
import { createOpportunityService } from "@/modules/crm/opportunity/services/opportunity-service";
import type {
  CreateOpportunityPayload,
  OpportunityDashboardView,
  OpportunityDetailView,
  OpportunityLineItemPayload,
  OpportunityRegistrationCatalogues,
  OpportunityStageTransitionPayload,
  OpportunitySummaryView,
  UpdateOpportunityPayload,
} from "@/modules/crm/opportunity/types";

export type OpportunityActionResult<T> = AuthActionResult<T>;

async function requireOpportunityContext() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  if (!user) {
    throw new OpportunityError(
      "INVALID_INPUT",
      "Your session has expired. Please sign in again.",
      401
    );
  }

  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();
  if (!context) {
    throw new OpportunityError("INVALID_INPUT", "Select a business to continue.", 403);
  }

  return context;
}

function mapError(error: unknown): OpportunityActionResult<never> {
  if (isNextRedirectError(error)) throw error;

  if (error instanceof OpportunityError) {
    return {
      success: false,
      error: { code: error.code, message: error.message, field: error.field },
    };
  }

  if (error instanceof AuthError) {
    return { success: false, error: { code: error.code, message: error.message } };
  }

  console.error("[opportunity-actions]", error);
  return {
    success: false,
    error: { code: "PROVIDER_ERROR", message: "Something went wrong. Please try again." },
  };
}

export async function getOpportunityDashboardAction(): Promise<
  OpportunityActionResult<OpportunityDashboardView>
> {
  try {
    const context = await requireOpportunityContext();
    const data = await createOpportunityService().getDashboard(context);
    return { success: true, data };
  } catch (error) {
    return mapError(error);
  }
}

export async function getOpportunityRegistrationCataloguesAction(): Promise<
  OpportunityActionResult<OpportunityRegistrationCatalogues>
> {
  try {
    const context = await requireOpportunityContext();
    const data = await createOpportunityService().getRegistrationCatalogues(context);
    return { success: true, data };
  } catch (error) {
    return mapError(error);
  }
}

export async function createOpportunityAction(
  payload: CreateOpportunityPayload
): Promise<OpportunityActionResult<OpportunityDetailView>> {
  try {
    const context = await requireOpportunityContext();
    const data = await createOpportunityService().createOpportunity(context, payload);
    revalidatePath("/opportunities");
    return { success: true, data };
  } catch (error) {
    return mapError(error);
  }
}

export async function getOpportunityAction(
  opportunityId: string
): Promise<OpportunityActionResult<OpportunityDetailView>> {
  try {
    const context = await requireOpportunityContext();
    const data = await createOpportunityService().getOpportunity(context, opportunityId);
    return { success: true, data };
  } catch (error) {
    return mapError(error);
  }
}

export async function searchOpportunitiesAction(
  query: string
): Promise<OpportunityActionResult<OpportunitySummaryView[]>> {
  try {
    const context = await requireOpportunityContext();
    const data = await createOpportunityService().searchOpportunities(context, query);
    return { success: true, data };
  } catch (error) {
    return mapError(error);
  }
}

export async function transitionOpportunityStageAction(
  opportunityId: string,
  payload: OpportunityStageTransitionPayload
): Promise<OpportunityActionResult<OpportunityDetailView>> {
  try {
    const context = await requireOpportunityContext();
    const data = await createOpportunityService().transitionStage(
      context,
      opportunityId,
      payload
    );
    revalidatePath("/opportunities");
    revalidatePath(`/opportunities/${opportunityId}`);
    return { success: true, data };
  } catch (error) {
    return mapError(error);
  }
}

export async function updateOpportunityAction(
  opportunityId: string,
  payload: UpdateOpportunityPayload
): Promise<OpportunityActionResult<OpportunityDetailView>> {
  try {
    const context = await requireOpportunityContext();
    const data = await createOpportunityService().updateOpportunity(
      context,
      opportunityId,
      payload
    );
    revalidatePath("/opportunities");
    revalidatePath(`/opportunities/${opportunityId}`);
    return { success: true, data };
  } catch (error) {
    return mapError(error);
  }
}

export async function addOpportunityLineItemAction(
  opportunityId: string,
  payload: OpportunityLineItemPayload
): Promise<OpportunityActionResult<OpportunityDetailView>> {
  try {
    const context = await requireOpportunityContext();
    const data = await createOpportunityService().addLineItem(
      context,
      opportunityId,
      payload
    );
    revalidatePath(`/opportunities/${opportunityId}`);
    return { success: true, data };
  } catch (error) {
    return mapError(error);
  }
}
