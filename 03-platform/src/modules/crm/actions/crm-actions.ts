"use server";

/**
 * Purpose:
 * Expose CRM Foundation server actions to the App Router UI.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { CrmError } from "@/modules/crm/errors";
import { createCrmService } from "@/modules/crm/services/crm-service";
import { createPartyService } from "@/modules/party/services/party-service";
import type { PartySearchResultView } from "@/modules/party/types";
import type {
  CreateCrmRecordPayload,
  CrmDashboardView,
  CrmDetailView,
  CrmListFilters,
  CrmListView,
  CrmRegistrationCatalogues,
  CrmStatusTransitionPayload,
  CrmSummaryView,
  Customer360CompositionView,
  UpdateCrmRecordPayload,
} from "@/modules/crm/types";

export type CrmActionResult<T> = AuthActionResult<T>;

async function requireCrmContext() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();

  if (!user) {
    throw new CrmError(
      "SESSION_REQUIRED",
      "Your session has expired. Please sign in again.",
      401
    );
  }

  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();

  if (!context) {
    throw new CrmError(
      "BUSINESS_CONTEXT_REQUIRED",
      "Select a business before managing customers.",
      403
    );
  }

  return context;
}

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

  console.error("[crm-actions] Unexpected error", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "We could not complete that action. Please try again.",
    },
  };
}

export async function getCrmDashboardAction(): Promise<
  CrmActionResult<CrmDashboardView>
> {
  try {
    const context = await requireCrmContext();
    const service = createCrmService();
    const data = await service.getDashboard(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getCrmRegistrationCataloguesAction(): Promise<
  CrmActionResult<CrmRegistrationCatalogues>
> {
  try {
    const context = await requireCrmContext();
    const service = createCrmService();
    const data = await service.getRegistrationCatalogues(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createCrmRecordAction(
  payload: CreateCrmRecordPayload
): Promise<CrmActionResult<CrmDetailView>> {
  try {
    const context = await requireCrmContext();
    const service = createCrmService();
    const data = await service.createCrmRecord(context, payload);
    revalidatePath("/customers");
    revalidatePath(`/customers/${data.crmId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getCrmRecordAction(
  crmId: string
): Promise<CrmActionResult<CrmDetailView>> {
  try {
    const context = await requireCrmContext();
    const service = createCrmService();
    const data = await service.getCrmRecord(context, crmId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateCrmRecordAction(
  crmId: string,
  payload: UpdateCrmRecordPayload
): Promise<CrmActionResult<CrmDetailView>> {
  try {
    const context = await requireCrmContext();
    const service = createCrmService();
    const data = await service.updateCrmRecord(context, crmId, payload);
    revalidatePath("/customers");
    revalidatePath(`/customers/${crmId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function transitionCrmStatusAction(
  crmId: string,
  payload: CrmStatusTransitionPayload
): Promise<CrmActionResult<CrmDetailView>> {
  try {
    const context = await requireCrmContext();
    const service = createCrmService();
    const data = await service.transitionCrmStatus(context, crmId, payload);
    revalidatePath("/customers");
    revalidatePath(`/customers/${crmId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listCrmRecordsAction(
  filters: CrmListFilters = {}
): Promise<CrmActionResult<CrmListView>> {
  try {
    const context = await requireCrmContext();
    const service = createCrmService();
    const data = await service.listCrmRecords(context, filters);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function searchCrmRecordsAction(
  query: string
): Promise<CrmActionResult<CrmSummaryView[]>> {
  try {
    const context = await requireCrmContext();
    const service = createCrmService();
    const data = await service.searchCrmRecords(context, query);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function searchPartiesForCrmRegistrationAction(
  query: string
): Promise<CrmActionResult<PartySearchResultView[]>> {
  try {
    const context = await requireCrmContext();
    const service = createPartyService();
    const data = await service.searchParties(context, query);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getCustomer360PanelAction(
  crmId: string
): Promise<CrmActionResult<Customer360CompositionView>> {
  try {
    const context = await requireCrmContext();
    const service = createCrmService();
    const data = await service.getCustomer360Panel(context, crmId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
