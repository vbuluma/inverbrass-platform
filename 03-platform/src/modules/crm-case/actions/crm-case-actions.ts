"use server";

import { requireCrmChannelContext as requireCaseContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import {
  platformError,
  platformSuccess,
} from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
import { CRM_CASE_USER_MESSAGES, CrmCaseError } from "@/modules/crm-case/errors";
import { createCrmCaseService } from "@/modules/crm-case/services/crm-case-service";
import type {
  AssignCrmCasePayload,
  CloseCrmCasePayload,
  CreateCrmCasePayload,
  CrmCaseCustomer360Contribution,
  CrmCaseDashboardView,
  CrmCaseDetailView,
  CrmCaseListFilters,
  CrmCaseRegistrationCatalogues,
  CrmCaseSummaryView,
  EscalateCrmCasePayload,
  ReopenCrmCasePayload,
  ResolveCrmCasePayload,
  SetPendingCustomerPayload,
  UpdateCrmCasePayload,
} from "@/modules/crm-case/types";

export type CrmCaseActionResult<T> = AuthActionResult<T> & {
  platform?: PlatformActionResult<T>;
};


function mapCaseError(error: unknown): AuthActionResult<never> {
  if (error instanceof CrmCaseError) {
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

function revalidateCasePaths(caseId: string, partyId: string) {
  revalidatePath("/crm/cases");
  revalidatePath(`/crm/cases/${caseId}`);
  revalidatePath(`/parties/${partyId}`);
}

export async function getCrmCaseDashboardAction(): Promise<
  CrmCaseActionResult<CrmCaseDashboardView>
> {
  try {
    const context = await requireCaseContext();
    const data = await createCrmCaseService().getDashboard(context);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapCaseError(error);
  }
}

export async function listCrmCasesAction(
  filters: CrmCaseListFilters = {}
): Promise<CrmCaseActionResult<CrmCaseSummaryView[]>> {
  try {
    const context = await requireCaseContext();
    const data = await createCrmCaseService().listCases(context, filters);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapCaseError(error);
  }
}

export async function getCrmCaseAction(
  caseId: string
): Promise<CrmCaseActionResult<CrmCaseDetailView>> {
  try {
    const context = await requireCaseContext();
    const data = await createCrmCaseService().getCase(context, caseId);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapCaseError(error);
  }
}

export async function getCrmCaseRegistrationCataloguesAction(): Promise<
  CrmCaseActionResult<CrmCaseRegistrationCatalogues>
> {
  try {
    const context = await requireCaseContext();
    const data = await createCrmCaseService().getRegistrationCatalogues(context);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapCaseError(error);
  }
}

export async function createCrmCaseAction(
  payload: CreateCrmCasePayload
): Promise<CrmCaseActionResult<CrmCaseDetailView>> {
  try {
    const context = await requireCaseContext();
    const data = await createCrmCaseService().createCase(context, payload);
    revalidateCasePaths(data.id, data.primaryPartyId);
    return {
      success: true,
      data,
      platform: platformSuccess(
        "Case created",
        `${data.caseNumber} registered.`,
        data,
        [{ label: "Open case", href: `/crm/cases/${data.id}` }]
      ),
    };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    const mapped = mapCaseError(error);
    if (!mapped.success) {
      return {
        ...mapped,
        platform: platformError(
          "Could not create case",
          mapped.error.message,
          mapped.error.field
        ),
      };
    }
    return mapped;
  }
}

export async function assignCrmCaseAction(
  caseId: string,
  payload: AssignCrmCasePayload
): Promise<CrmCaseActionResult<CrmCaseDetailView>> {
  try {
    const context = await requireCaseContext();
    const data = await createCrmCaseService().assignCase(context, caseId, payload);
    revalidateCasePaths(data.id, data.primaryPartyId);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapCaseError(error);
  }
}

export async function updateCrmCaseAction(
  caseId: string,
  payload: UpdateCrmCasePayload
): Promise<CrmCaseActionResult<CrmCaseDetailView>> {
  try {
    const context = await requireCaseContext();
    const data = await createCrmCaseService().updateCase(context, caseId, payload);
    revalidateCasePaths(data.id, data.primaryPartyId);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapCaseError(error);
  }
}

export async function setPendingCustomerCrmCaseAction(
  caseId: string,
  payload: SetPendingCustomerPayload = {}
): Promise<CrmCaseActionResult<CrmCaseDetailView>> {
  try {
    const context = await requireCaseContext();
    const data = await createCrmCaseService().setPendingCustomer(
      context,
      caseId,
      payload
    );
    revalidateCasePaths(data.id, data.primaryPartyId);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapCaseError(error);
  }
}

export async function resumeCrmCaseAction(
  caseId: string
): Promise<CrmCaseActionResult<CrmCaseDetailView>> {
  try {
    const context = await requireCaseContext();
    const data = await createCrmCaseService().resumeCase(context, caseId);
    revalidateCasePaths(data.id, data.primaryPartyId);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapCaseError(error);
  }
}

export async function escalateCrmCaseAction(
  caseId: string,
  payload: EscalateCrmCasePayload
): Promise<CrmCaseActionResult<CrmCaseDetailView>> {
  try {
    const context = await requireCaseContext();
    const data = await createCrmCaseService().escalateCase(context, caseId, payload);
    revalidateCasePaths(data.id, data.primaryPartyId);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapCaseError(error);
  }
}

export async function resolveCrmCaseAction(
  caseId: string,
  payload: ResolveCrmCasePayload
): Promise<CrmCaseActionResult<CrmCaseDetailView>> {
  try {
    const context = await requireCaseContext();
    const data = await createCrmCaseService().resolveCase(context, caseId, payload);
    revalidateCasePaths(data.id, data.primaryPartyId);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapCaseError(error);
  }
}

export async function closeCrmCaseAction(
  caseId: string,
  payload: CloseCrmCasePayload = {}
): Promise<CrmCaseActionResult<CrmCaseDetailView>> {
  try {
    const context = await requireCaseContext();
    const data = await createCrmCaseService().closeCase(context, caseId, payload);
    revalidateCasePaths(data.id, data.primaryPartyId);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapCaseError(error);
  }
}

export async function reopenCrmCaseAction(
  caseId: string,
  payload: ReopenCrmCasePayload
): Promise<CrmCaseActionResult<CrmCaseDetailView>> {
  try {
    const context = await requireCaseContext();
    const data = await createCrmCaseService().reopenCase(context, caseId, payload);
    revalidateCasePaths(data.id, data.primaryPartyId);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapCaseError(error);
  }
}

export async function getCrmCaseCustomer360ContributionAction(
  partyId: string
): Promise<CrmCaseActionResult<CrmCaseCustomer360Contribution>> {
  try {
    const context = await requireCaseContext();
    const data = await createCrmCaseService().getCustomer360Contribution(
      context,
      partyId
    );
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapCaseError(error);
  }
}
