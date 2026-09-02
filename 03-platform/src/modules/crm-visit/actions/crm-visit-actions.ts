"use server";

import { requireCrmChannelContext as requireVisitContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import {
  platformError,
  platformSuccess,
} from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
import { CRM_VISIT_USER_MESSAGES, CrmVisitError } from "@/modules/crm-visit/errors";
import { createCrmVisitService } from "@/modules/crm-visit/services/crm-visit-service";
import type {
  AddCrmVisitActionItemPayload,
  AddCrmVisitAttendeePayload,
  CreateCrmVisitPayload,
  CrmVisitCustomer360Contribution,
  CrmVisitDashboardView,
  CrmVisitDetailView,
  CrmVisitListFilters,
  CrmVisitRegistrationCatalogues,
  CrmVisitSummaryView,
  ReviewCrmVisitPayload,
  SubmitCrmVisitPayload,
  UpdateCrmVisitActionItemPayload,
  UpdateCrmVisitPayload,
  UpdateCrmVisitReportPayload,
} from "@/modules/crm-visit/types";

export type CrmVisitActionResult<T> = AuthActionResult<T> & {
  platform?: PlatformActionResult<T>;
};


function mapVisitError(error: unknown): AuthActionResult<never> {
  if (error instanceof CrmVisitError) {
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

export async function getCrmVisitDashboardAction(): Promise<
  CrmVisitActionResult<CrmVisitDashboardView>
> {
  try {
    const context = await requireVisitContext();
    const data = await createCrmVisitService().getDashboard(context);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapVisitError(error);
  }
}

export async function listCrmVisitsAction(
  filters: CrmVisitListFilters = {}
): Promise<CrmVisitActionResult<CrmVisitSummaryView[]>> {
  try {
    const context = await requireVisitContext();
    const data = await createCrmVisitService().listVisits(context, filters);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapVisitError(error);
  }
}

export async function getCrmVisitAction(
  visitId: string
): Promise<CrmVisitActionResult<CrmVisitDetailView>> {
  try {
    const context = await requireVisitContext();
    const data = await createCrmVisitService().getVisit(context, visitId);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapVisitError(error);
  }
}

export async function getCrmVisitRegistrationCataloguesAction(): Promise<
  CrmVisitActionResult<CrmVisitRegistrationCatalogues>
> {
  try {
    const context = await requireVisitContext();
    const data = await createCrmVisitService().getRegistrationCatalogues(context);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapVisitError(error);
  }
}

export async function createCrmVisitAction(
  payload: CreateCrmVisitPayload
): Promise<CrmVisitActionResult<CrmVisitDetailView>> {
  try {
    const context = await requireVisitContext();
    const data = await createCrmVisitService().createVisit(context, payload);
    revalidatePath("/crm/visits");
    revalidatePath(`/crm/visits/${data.id}`);
    return {
      success: true,
      data,
      platform: platformSuccess(
        "Visit created",
        `"${data.subject}" was logged.`,
        data,
        [{ label: "Open visit", href: `/crm/visits/${data.id}` }]
      ),
    };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    const mapped = mapVisitError(error);
    if (!mapped.success) {
      return {
        ...mapped,
        platform: platformError(
          "Could not create visit",
          mapped.error.message,
          mapped.error.field
        ),
      };
    }
    return mapped;
  }
}

export async function updateCrmVisitAction(
  visitId: string,
  payload: UpdateCrmVisitPayload
): Promise<CrmVisitActionResult<CrmVisitDetailView>> {
  try {
    const context = await requireVisitContext();
    const data = await createCrmVisitService().updateVisit(context, visitId, payload);
    revalidatePath(`/crm/visits/${visitId}`);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapVisitError(error);
  }
}

export async function updateCrmVisitReportAction(
  visitId: string,
  payload: UpdateCrmVisitReportPayload
): Promise<CrmVisitActionResult<CrmVisitDetailView>> {
  try {
    const context = await requireVisitContext();
    const data = await createCrmVisitService().updateReportSections(
      context,
      visitId,
      payload
    );
    revalidatePath(`/crm/visits/${visitId}`);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapVisitError(error);
  }
}

export async function addCrmVisitAttendeeAction(
  visitId: string,
  payload: AddCrmVisitAttendeePayload
): Promise<CrmVisitActionResult<CrmVisitDetailView>> {
  try {
    const context = await requireVisitContext();
    const data = await createCrmVisitService().addAttendee(context, visitId, payload);
    revalidatePath(`/crm/visits/${visitId}`);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapVisitError(error);
  }
}

export async function addCrmVisitActionItemAction(
  visitId: string,
  payload: AddCrmVisitActionItemPayload
): Promise<CrmVisitActionResult<CrmVisitDetailView>> {
  try {
    const context = await requireVisitContext();
    const data = await createCrmVisitService().addActionItem(context, visitId, payload);
    revalidatePath(`/crm/visits/${visitId}`);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapVisitError(error);
  }
}

export async function updateCrmVisitActionItemAction(
  visitId: string,
  actionItemId: string,
  payload: UpdateCrmVisitActionItemPayload
): Promise<CrmVisitActionResult<CrmVisitDetailView>> {
  try {
    const context = await requireVisitContext();
    const data = await createCrmVisitService().updateActionItem(
      context,
      visitId,
      actionItemId,
      payload
    );
    revalidatePath(`/crm/visits/${visitId}`);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapVisitError(error);
  }
}

export async function submitCrmVisitAction(
  visitId: string,
  payload: SubmitCrmVisitPayload
): Promise<CrmVisitActionResult<CrmVisitDetailView>> {
  try {
    const context = await requireVisitContext();
    const data = await createCrmVisitService().submitForReview(
      context,
      visitId,
      payload
    );
    revalidatePath("/crm/visits");
    revalidatePath(`/crm/visits/${visitId}`);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapVisitError(error);
  }
}

export async function approveCrmVisitAction(
  visitId: string,
  payload: ReviewCrmVisitPayload
): Promise<CrmVisitActionResult<CrmVisitDetailView>> {
  try {
    const context = await requireVisitContext();
    const data = await createCrmVisitService().approveVisit(context, visitId, payload);
    revalidatePath("/crm/visits");
    revalidatePath(`/crm/visits/${visitId}`);
    revalidatePath("/crm/activities");
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapVisitError(error);
  }
}

export async function returnCrmVisitAction(
  visitId: string,
  payload: ReviewCrmVisitPayload
): Promise<CrmVisitActionResult<CrmVisitDetailView>> {
  try {
    const context = await requireVisitContext();
    const data = await createCrmVisitService().returnVisit(context, visitId, payload);
    revalidatePath(`/crm/visits/${visitId}`);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapVisitError(error);
  }
}

export async function rejectCrmVisitAction(
  visitId: string,
  payload: ReviewCrmVisitPayload
): Promise<CrmVisitActionResult<CrmVisitDetailView>> {
  try {
    const context = await requireVisitContext();
    const data = await createCrmVisitService().rejectVisit(context, visitId, payload);
    revalidatePath(`/crm/visits/${visitId}`);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapVisitError(error);
  }
}

export async function getCrmVisitCustomer360ContributionAction(
  partyId: string
): Promise<CrmVisitActionResult<CrmVisitCustomer360Contribution>> {
  try {
    const context = await requireVisitContext();
    const data = await createCrmVisitService().getCustomer360Contribution(
      context,
      partyId
    );
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapVisitError(error);
  }
}
