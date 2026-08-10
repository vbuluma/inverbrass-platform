"use server";

/**
 * Purpose:
 * Expose Lead Management server actions to the App Router UI.
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
 */

import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { createPartyService } from "@/modules/party/services/party-service";
import type { PartySearchResultView } from "@/modules/party/types";
import { LeadError } from "@/modules/crm/lead/errors";
import { createLeadService } from "@/modules/crm/lead/services/lead-service";
import type {
  CreateLeadPayload,
  LeadConvertPayload,
  LeadDashboardView,
  LeadDetailView,
  LeadDisqualifyPayload,
  LeadListFilters,
  LeadListView,
  LeadRegistrationCatalogues,
  LeadStatusTransitionPayload,
  LeadSummaryView,
  UpdateLeadPayload,
} from "@/modules/crm/lead/types";

export type LeadActionResult<T> = AuthActionResult<T>;

async function requireLeadContext() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();

  if (!user) {
    throw new LeadError(
      "INVALID_INPUT",
      "Your session has expired. Please sign in again.",
      401
    );
  }

  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();

  if (!context) {
    throw new LeadError(
      "INVALID_INPUT",
      "Select a business to continue.",
      403
    );
  }

  return context;
}

function mapLeadError(error: unknown): LeadActionResult<never> {
  if (error instanceof LeadError) {
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

  console.error("[lead-actions]", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "Something went wrong. Please try again.",
    },
  };
}

export async function getLeadDashboardAction(): Promise<
  LeadActionResult<LeadDashboardView>
> {
  try {
    const context = await requireLeadContext();
    const data = await createLeadService().getDashboard(context);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapLeadError(error);
  }
}

export async function getLeadRegistrationCataloguesAction(): Promise<
  LeadActionResult<LeadRegistrationCatalogues>
> {
  try {
    const context = await requireLeadContext();
    const data = await createLeadService().getRegistrationCatalogues(context);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapLeadError(error);
  }
}

export async function createLeadAction(
  payload: CreateLeadPayload
): Promise<LeadActionResult<LeadDetailView>> {
  try {
    const context = await requireLeadContext();
    const data = await createLeadService().createLead(context, payload);
    revalidatePath("/leads");
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapLeadError(error);
  }
}

export async function getLeadAction(
  leadId: string
): Promise<LeadActionResult<LeadDetailView>> {
  try {
    const context = await requireLeadContext();
    const data = await createLeadService().getLead(context, leadId);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapLeadError(error);
  }
}

export async function listLeadsAction(
  filters: LeadListFilters
): Promise<LeadActionResult<LeadListView>> {
  try {
    const context = await requireLeadContext();
    const data = await createLeadService().listLeads(context, filters);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapLeadError(error);
  }
}

export async function searchLeadsAction(
  query: string
): Promise<LeadActionResult<LeadSummaryView[]>> {
  try {
    const context = await requireLeadContext();
    const data = await createLeadService().searchLeads(context, query);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapLeadError(error);
  }
}

export async function updateLeadAction(
  leadId: string,
  payload: UpdateLeadPayload
): Promise<LeadActionResult<LeadDetailView>> {
  try {
    const context = await requireLeadContext();
    const data = await createLeadService().updateLead(context, leadId, payload);
    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapLeadError(error);
  }
}

export async function transitionLeadStatusAction(
  leadId: string,
  payload: LeadStatusTransitionPayload
): Promise<LeadActionResult<LeadDetailView>> {
  try {
    const context = await requireLeadContext();
    const data = await createLeadService().transitionLeadStatus(
      context,
      leadId,
      payload
    );
    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapLeadError(error);
  }
}

export async function disqualifyLeadAction(
  leadId: string,
  payload: LeadDisqualifyPayload
): Promise<LeadActionResult<LeadDetailView>> {
  try {
    const context = await requireLeadContext();
    const data = await createLeadService().disqualifyLead(context, leadId, payload);
    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapLeadError(error);
  }
}

export async function convertLeadAction(
  leadId: string,
  payload: LeadConvertPayload
): Promise<LeadActionResult<LeadDetailView>> {
  try {
    const context = await requireLeadContext();
    const data = await createLeadService().convertLead(context, leadId, payload);
    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    if (data.convertedCrmId) {
      revalidatePath(`/customers/${data.convertedCrmId}`);
    }
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapLeadError(error);
  }
}

export async function searchPartiesForLeadRegistrationAction(
  query: string
): Promise<LeadActionResult<PartySearchResultView[]>> {
  try {
    const context = await requireLeadContext();
    const partyService = createPartyService();
    const data = await partyService.searchParties(context, query);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapLeadError(error);
  }
}
