"use server";

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
  CRM_COMMUNICATION_USER_MESSAGES,
  CrmCommunicationError,
} from "@/modules/crm-communication/errors";
import { createCrmCommunicationService } from "@/modules/crm-communication/services/crm-communication-service";
import type {
  CreateCrmCommunicationAddendumPayload,
  CreateCrmCommunicationPayload,
  CrmCommunicationCustomer360Contribution,
  CrmCommunicationDashboardView,
  CrmCommunicationDetailView,
  CrmCommunicationListFilters,
  CrmCommunicationRegistrationCatalogues,
  CrmCommunicationSummaryView,
} from "@/modules/crm-communication/types";

export type CrmCommunicationActionResult<T> = AuthActionResult<T> & {
  platform?: PlatformActionResult<T>;
};

async function requireCommunicationContext() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  if (!user) {
    throw new CrmCommunicationError(
      "SESSION_REQUIRED",
      CRM_COMMUNICATION_USER_MESSAGES.SESSION_REQUIRED,
      401
    );
  }
  const context = await createBusinessContextService().getCurrentContext();
  if (!context) {
    throw new CrmCommunicationError(
      "BUSINESS_CONTEXT_REQUIRED",
      CRM_COMMUNICATION_USER_MESSAGES.BUSINESS_CONTEXT_REQUIRED,
      403
    );
  }
  return context;
}

function mapCommunicationError(error: unknown): AuthActionResult<never> {
  if (error instanceof CrmCommunicationError) {
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

export async function getCrmCommunicationDashboardAction(): Promise<
  CrmCommunicationActionResult<CrmCommunicationDashboardView>
> {
  try {
    const context = await requireCommunicationContext();
    const data = await createCrmCommunicationService().getDashboard(context);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapCommunicationError(error);
  }
}

export async function listCrmCommunicationsAction(
  filters: CrmCommunicationListFilters = {}
): Promise<CrmCommunicationActionResult<CrmCommunicationSummaryView[]>> {
  try {
    const context = await requireCommunicationContext();
    const data = await createCrmCommunicationService().listCommunications(
      context,
      filters
    );
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapCommunicationError(error);
  }
}

export async function getCrmCommunicationAction(
  communicationId: string
): Promise<CrmCommunicationActionResult<CrmCommunicationDetailView>> {
  try {
    const context = await requireCommunicationContext();
    const data = await createCrmCommunicationService().getCommunication(
      context,
      communicationId
    );
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapCommunicationError(error);
  }
}

export async function getCrmCommunicationRegistrationCataloguesAction(): Promise<
  CrmCommunicationActionResult<CrmCommunicationRegistrationCatalogues>
> {
  try {
    const context = await requireCommunicationContext();
    const data =
      await createCrmCommunicationService().getRegistrationCatalogues(context);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapCommunicationError(error);
  }
}

export async function logCrmCommunicationAction(
  payload: CreateCrmCommunicationPayload
): Promise<CrmCommunicationActionResult<CrmCommunicationDetailView>> {
  try {
    const context = await requireCommunicationContext();
    const data = await createCrmCommunicationService().logCommunication(
      context,
      payload
    );
    revalidatePath("/crm/communications");
    revalidatePath(`/crm/communications/${data.id}`);
    revalidatePath(`/parties/${data.primaryPartyId}`);
    return {
      success: true,
      data,
      platform: platformSuccess(
        "Communication logged",
        `${data.channelTypeLabel} ${data.directionLabel.toLowerCase()} recorded.`,
        data,
        [{ label: "Open entry", href: `/crm/communications/${data.id}` }]
      ),
    };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    const mapped = mapCommunicationError(error);
    if (!mapped.success) {
      return {
        ...mapped,
        platform: platformError(
          "Could not log communication",
          mapped.error.message,
          mapped.error.field
        ),
      };
    }
    return mapped;
  }
}

export async function createCrmCommunicationAddendumAction(
  communicationId: string,
  payload: CreateCrmCommunicationAddendumPayload
): Promise<CrmCommunicationActionResult<CrmCommunicationDetailView>> {
  try {
    const context = await requireCommunicationContext();
    const data = await createCrmCommunicationService().createAddendum(
      context,
      communicationId,
      payload
    );
    revalidatePath(`/crm/communications/${communicationId}`);
    revalidatePath(`/crm/communications/${data.id}`);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapCommunicationError(error);
  }
}

export async function getCrmCommunicationCustomer360ContributionAction(
  partyId: string
): Promise<CrmCommunicationActionResult<CrmCommunicationCustomer360Contribution>> {
  try {
    const context = await requireCommunicationContext();
    const data = await createCrmCommunicationService().getCustomer360Contribution(
      context,
      partyId
    );
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapCommunicationError(error);
  }
}
