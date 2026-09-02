"use server";

/**
 * Server actions for BP-004 / IP-06 Calendar & Appointment Management.
 */

import { requireCrmChannelContext as requireAppointmentContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import {
  platformError,
  platformSuccess,
} from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
import {
  CRM_APPOINTMENT_USER_MESSAGES,
  CrmAppointmentError,
} from "@/modules/crm-appointment/errors";
import { createCrmAppointmentService } from "@/modules/crm-appointment/services/crm-appointment-service";
import type {
  CancelCrmAppointmentPayload,
  CompleteCrmAppointmentPayload,
  CreateCrmAppointmentPayload,
  CrmAppointmentCustomer360Contribution,
  CrmAppointmentDashboardView,
  CrmAppointmentDetailView,
  CrmAppointmentListFilters,
  CrmAppointmentRegistrationCatalogues,
  CrmAppointmentSummaryView,
  NoShowCrmAppointmentPayload,
  UpdateCrmAppointmentMinutesPayload,
  UpdateCrmAppointmentPayload,
} from "@/modules/crm-appointment/types";

export type CrmAppointmentActionResult<T> = AuthActionResult<T> & {
  platform?: PlatformActionResult<T>;
};


function mapAppointmentError(error: unknown): AuthActionResult<never> {
  if (error instanceof CrmAppointmentError) {
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

export async function getCrmAppointmentDashboardAction(): Promise<
  CrmAppointmentActionResult<CrmAppointmentDashboardView>
> {
  try {
    const context = await requireAppointmentContext();
    const service = createCrmAppointmentService();
    const data = await service.getDashboard(context);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapAppointmentError(error);
  }
}

export async function listCrmAppointmentsAction(
  filters: CrmAppointmentListFilters = {}
): Promise<CrmAppointmentActionResult<CrmAppointmentSummaryView[]>> {
  try {
    const context = await requireAppointmentContext();
    const service = createCrmAppointmentService();
    const data = await service.listAppointments(context, filters);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapAppointmentError(error);
  }
}

export async function getCrmAppointmentAction(
  appointmentId: string
): Promise<CrmAppointmentActionResult<CrmAppointmentDetailView>> {
  try {
    const context = await requireAppointmentContext();
    const service = createCrmAppointmentService();
    const data = await service.getAppointment(context, appointmentId);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapAppointmentError(error);
  }
}

export async function getCrmAppointmentRegistrationCataloguesAction(): Promise<
  CrmAppointmentActionResult<CrmAppointmentRegistrationCatalogues>
> {
  try {
    const context = await requireAppointmentContext();
    const service = createCrmAppointmentService();
    const data = await service.getRegistrationCatalogues(context);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapAppointmentError(error);
  }
}

export async function createCrmAppointmentAction(
  payload: CreateCrmAppointmentPayload
): Promise<CrmAppointmentActionResult<CrmAppointmentDetailView>> {
  try {
    const context = await requireAppointmentContext();
    const service = createCrmAppointmentService();
    const data = await service.createAppointment(context, payload);
    revalidatePath("/crm/appointments");
    revalidatePath(`/crm/appointments/${data.id}`);
    revalidatePath(`/parties/${data.primaryPartyId}`);
    return {
      success: true,
      data,
      platform: platformSuccess(
        "Appointment scheduled",
        `${data.appointmentTypeLabel} "${data.subject}" was scheduled.`,
        data,
        [{ label: "Open appointment", href: `/crm/appointments/${data.id}` }]
      ),
    };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    const mapped = mapAppointmentError(error);
    if (!mapped.success) {
      return {
        ...mapped,
        platform: platformError(
          "Could not schedule appointment",
          mapped.error.message,
          mapped.error.field
        ),
      };
    }
    return mapped;
  }
}

export async function updateCrmAppointmentAction(
  appointmentId: string,
  payload: UpdateCrmAppointmentPayload
): Promise<CrmAppointmentActionResult<CrmAppointmentDetailView>> {
  try {
    const context = await requireAppointmentContext();
    const service = createCrmAppointmentService();
    const data = await service.updateAppointment(context, appointmentId, payload);
    revalidatePath("/crm/appointments");
    revalidatePath(`/crm/appointments/${appointmentId}`);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapAppointmentError(error);
  }
}

export async function updateCrmAppointmentMinutesAction(
  appointmentId: string,
  payload: UpdateCrmAppointmentMinutesPayload
): Promise<CrmAppointmentActionResult<CrmAppointmentDetailView>> {
  try {
    const context = await requireAppointmentContext();
    const service = createCrmAppointmentService();
    const data = await service.updateMinutes(context, appointmentId, payload);
    revalidatePath("/crm/appointments");
    revalidatePath(`/crm/appointments/${appointmentId}`);
    revalidatePath(`/parties/${data.primaryPartyId}`);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapAppointmentError(error);
  }
}

export async function cancelCrmAppointmentAction(
  appointmentId: string,
  payload: CancelCrmAppointmentPayload
): Promise<CrmAppointmentActionResult<CrmAppointmentDetailView>> {
  try {
    const context = await requireAppointmentContext();
    const service = createCrmAppointmentService();
    const data = await service.cancelAppointment(context, appointmentId, payload);
    revalidatePath("/crm/appointments");
    revalidatePath(`/crm/appointments/${appointmentId}`);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapAppointmentError(error);
  }
}

export async function completeCrmAppointmentAction(
  appointmentId: string,
  payload: CompleteCrmAppointmentPayload
): Promise<CrmAppointmentActionResult<CrmAppointmentDetailView>> {
  try {
    const context = await requireAppointmentContext();
    const service = createCrmAppointmentService();
    const data = await service.completeAppointment(context, appointmentId, payload);
    revalidatePath("/crm/appointments");
    revalidatePath(`/crm/appointments/${appointmentId}`);
    revalidatePath("/crm/activities");
    if (data.linkedActivityId) {
      revalidatePath(`/crm/activities/${data.linkedActivityId}`);
    }
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapAppointmentError(error);
  }
}

export async function markNoShowCrmAppointmentAction(
  appointmentId: string,
  payload: NoShowCrmAppointmentPayload
): Promise<CrmAppointmentActionResult<CrmAppointmentDetailView>> {
  try {
    const context = await requireAppointmentContext();
    const service = createCrmAppointmentService();
    const data = await service.markNoShow(context, appointmentId, payload);
    revalidatePath("/crm/appointments");
    revalidatePath(`/crm/appointments/${appointmentId}`);
    revalidatePath("/crm/activities");
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapAppointmentError(error);
  }
}

export async function getCrmAppointmentCustomer360ContributionAction(
  partyId: string
): Promise<CrmAppointmentActionResult<CrmAppointmentCustomer360Contribution>> {
  try {
    const context = await requireAppointmentContext();
    const service = createCrmAppointmentService();
    const data = await service.getCustomer360Contribution(context, partyId);
    return { success: true, data };
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    return mapAppointmentError(error);
  }
}
