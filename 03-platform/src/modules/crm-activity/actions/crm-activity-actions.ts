"use server";

/**
 * Purpose:
 * Server actions for BP-004 / IP-05 Activity & Task Management.
 */

import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import {
  platformError,
  platformSuccess,
} from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
import {
  CRM_ACTIVITY_USER_MESSAGES,
  CrmActivityError,
} from "@/modules/crm-activity/errors";
import { createCrmActivityService } from "@/modules/crm-activity/services/crm-activity-service";
import type {
  CancelCrmActivityPayload,
  CompleteCrmActivityPayload,
  CreateCrmActivityPayload,
  CrmActivityCustomer360Contribution,
  CrmActivityDashboardView,
  CrmActivityDetailView,
  CrmActivityListFilters,
  CrmActivityRegistrationCatalogues,
  CrmActivitySummaryView,
  DeferCrmActivityPayload,
  ReassignCrmActivityPayload,
  UpdateCrmActivityPayload,
} from "@/modules/crm-activity/types";

export type CrmActivityActionResult<T> = AuthActionResult<T> & {
  platform?: PlatformActionResult<T>;
};

async function requireActivityContext() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();

  if (!user) {
    throw new CrmActivityError(
      "SESSION_REQUIRED",
      CRM_ACTIVITY_USER_MESSAGES.SESSION_REQUIRED,
      401
    );
  }

  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();

  if (!context) {
    throw new CrmActivityError(
      "BUSINESS_CONTEXT_REQUIRED",
      CRM_ACTIVITY_USER_MESSAGES.BUSINESS_CONTEXT_REQUIRED,
      403
    );
  }

  return context;
}

function mapActivityError(error: unknown): AuthActionResult<never> {
  if (error instanceof CrmActivityError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        field: error.field,
      },
    };
  }

  if (error instanceof AuthError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    };
  }

  throw error;
}

export async function getCrmActivityDashboardAction(): Promise<
  CrmActivityActionResult<CrmActivityDashboardView>
> {
  try {
    const context = await requireActivityContext();
    const service = createCrmActivityService();
    const data = await service.getDashboard(context);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapActivityError(error);
  }
}

export async function listCrmActivitiesAction(
  filters: CrmActivityListFilters = {}
): Promise<CrmActivityActionResult<CrmActivitySummaryView[]>> {
  try {
    const context = await requireActivityContext();
    const service = createCrmActivityService();
    const data = await service.listActivities(context, filters);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapActivityError(error);
  }
}

export async function getCrmActivityAction(
  activityId: string
): Promise<CrmActivityActionResult<CrmActivityDetailView>> {
  try {
    const context = await requireActivityContext();
    const service = createCrmActivityService();
    const data = await service.getActivity(context, activityId);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapActivityError(error);
  }
}

export async function getCrmActivityRegistrationCataloguesAction(): Promise<
  CrmActivityActionResult<CrmActivityRegistrationCatalogues>
> {
  try {
    const context = await requireActivityContext();
    const service = createCrmActivityService();
    const data = await service.getRegistrationCatalogues(context);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapActivityError(error);
  }
}

export async function createCrmActivityAction(
  payload: CreateCrmActivityPayload
): Promise<CrmActivityActionResult<CrmActivityDetailView>> {
  try {
    const context = await requireActivityContext();
    const service = createCrmActivityService();
    const data = await service.createActivity(context, payload);
    revalidatePath("/crm/activities");
    revalidatePath(`/crm/activities/${data.id}`);
    revalidatePath(`/parties/${data.primaryPartyId}`);
    return {
      success: true,
      data,
      platform: platformSuccess(
        "Activity created",
        `${data.activityTypeLabel} "${data.subject}" was logged.`,
        data,
        [{ label: "Open activity", href: `/crm/activities/${data.id}` }]
      ),
    };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    const mapped = mapActivityError(error);
    if (!mapped.success) {
      return {
        ...mapped,
        platform: platformError(
          "Could not create activity",
          mapped.error.message,
          mapped.error.field
        ),
      };
    }
    return mapped;
  }
}

export async function updateCrmActivityAction(
  activityId: string,
  payload: UpdateCrmActivityPayload
): Promise<CrmActivityActionResult<CrmActivityDetailView>> {
  try {
    const context = await requireActivityContext();
    const service = createCrmActivityService();
    const data = await service.updateActivity(context, activityId, payload);
    revalidatePath("/crm/activities");
    revalidatePath(`/crm/activities/${activityId}`);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapActivityError(error);
  }
}

export async function completeCrmActivityAction(
  activityId: string,
  payload: CompleteCrmActivityPayload
): Promise<CrmActivityActionResult<CrmActivityDetailView>> {
  try {
    const context = await requireActivityContext();
    const service = createCrmActivityService();
    const data = await service.completeActivity(context, activityId, payload);
    revalidatePath("/crm/activities");
    revalidatePath(`/crm/activities/${activityId}`);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapActivityError(error);
  }
}

export async function cancelCrmActivityAction(
  activityId: string,
  payload: CancelCrmActivityPayload
): Promise<CrmActivityActionResult<CrmActivityDetailView>> {
  try {
    const context = await requireActivityContext();
    const service = createCrmActivityService();
    const data = await service.cancelActivity(context, activityId, payload);
    revalidatePath("/crm/activities");
    revalidatePath(`/crm/activities/${activityId}`);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapActivityError(error);
  }
}

export async function deferCrmActivityAction(
  activityId: string,
  payload: DeferCrmActivityPayload
): Promise<CrmActivityActionResult<CrmActivityDetailView>> {
  try {
    const context = await requireActivityContext();
    const service = createCrmActivityService();
    const data = await service.deferActivity(context, activityId, payload);
    revalidatePath("/crm/activities");
    revalidatePath(`/crm/activities/${activityId}`);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapActivityError(error);
  }
}

export async function reassignCrmActivityAction(
  activityId: string,
  payload: ReassignCrmActivityPayload
): Promise<CrmActivityActionResult<CrmActivityDetailView>> {
  try {
    const context = await requireActivityContext();
    const service = createCrmActivityService();
    const data = await service.reassignActivity(context, activityId, payload);
    revalidatePath("/crm/activities");
    revalidatePath(`/crm/activities/${activityId}`);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapActivityError(error);
  }
}

export async function getCrmActivityCustomer360ContributionAction(
  partyId: string
): Promise<CrmActivityActionResult<CrmActivityCustomer360Contribution>> {
  try {
    const context = await requireActivityContext();
    const service = createCrmActivityService();
    const data = await service.getCustomer360Contribution(context, partyId);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapActivityError(error);
  }
}
