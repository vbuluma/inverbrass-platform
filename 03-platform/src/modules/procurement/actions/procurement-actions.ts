"use server";

/**
 * Purpose:
 * Server actions for BP-009 IP-01 procurement foundation.
 */

import { revalidatePath } from "next/cache";

import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { ProcurementError } from "@/modules/procurement";
import { requireProcurementChannelContext } from "@/modules/procurement/helpers/procurement-channel-context";
import { createProcurementFoundationService } from "@/modules/procurement/services/procurement-foundation-service";
import { createPurchaseRequestService } from "@/modules/procurement/services/purchase-request-service";
import { createExceptionService } from "@/modules/procurement/services/exception-service";
import type {
  ChangeProcurementStatusCommand,
  CreateProcurementProfileCommand,
  EligibilityView,
  ProcurementCataloguesView,
  ProcurementDashboardView,
  ProcurementPartyRef,
  RecordQualificationCommand,
  SetPreferredCommand,
  SupplierListFilter,
  SupplierListView,
  SupplierProfileView,
  UpdateProcurementProfileCommand,
} from "@/modules/procurement/types";

export type ProcurementActionError = {
  code: string;
  message: string;
  field?: string;
};

export type ProcurementActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ProcurementActionError };

function toActionError(error: unknown): ProcurementActionResult<never> {
  if (isNextRedirectError(error)) {
    throw error;
  }
  if (error instanceof ProcurementError) {
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
      error: { code: error.code, message: error.message },
    };
  }
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "The supplier details could not be saved. Please try again.",
    },
  };
}

export async function getProcurementDashboardAction(): Promise<
  ProcurementActionResult<ProcurementDashboardView>
> {
  try {
    const { context, actor } = await requireProcurementChannelContext(
      "PROCUREMENT_DASHBOARD"
    );
    const foundation = createProcurementFoundationService();
    const requests = createPurchaseRequestService();
    const exceptions = createExceptionService();
    const [supplierData, requestData, openExceptionCount] = await Promise.all([
      foundation.getDashboard(context, actor),
      requests.getDashboard(context, actor),
      exceptions.countOpen(context, actor),
    ]);
    return {
      success: true,
      data: {
        ...supplierData,
        ...requestData,
        openExceptionCount,
      },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getProcurementCataloguesAction(): Promise<
  ProcurementActionResult<ProcurementCataloguesView>
> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createProcurementFoundationService().getCatalogues(context, actor);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function searchProcurementPartiesAction(
  query: string
): Promise<ProcurementActionResult<ProcurementPartyRef[]>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createProcurementFoundationService().searchParties(
      context,
      actor,
      query
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listProcurementSuppliersAction(
  filter: SupplierListFilter = {}
): Promise<ProcurementActionResult<SupplierListView[]>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createProcurementFoundationService().listSuppliers(
      context,
      actor,
      filter
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getProcurementSupplierAction(
  profileId: string
): Promise<ProcurementActionResult<SupplierProfileView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createProcurementFoundationService().getSupplier(
      context,
      actor,
      profileId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getProcurementSupplierByPartyAction(
  partyId: string
): Promise<ProcurementActionResult<SupplierProfileView | null>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createProcurementFoundationService().getSupplierByParty(
      context,
      actor,
      partyId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createProcurementProfileAction(
  input: CreateProcurementProfileCommand
): Promise<ProcurementActionResult<SupplierProfileView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createProcurementFoundationService().createProfile(
      context,
      actor,
      input
    );
    revalidatePath("/procurement");
    revalidatePath("/procurement/suppliers");
    revalidatePath(`/procurement/suppliers/${data.id}`);
    revalidatePath(`/parties/${data.partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateProcurementProfileAction(
  profileId: string,
  input: UpdateProcurementProfileCommand
): Promise<ProcurementActionResult<SupplierProfileView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createProcurementFoundationService().updateProfile(
      context,
      actor,
      profileId,
      input
    );
    revalidatePath(`/procurement/suppliers/${profileId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function changeProcurementStatusAction(
  profileId: string,
  input: ChangeProcurementStatusCommand
): Promise<ProcurementActionResult<SupplierProfileView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createProcurementFoundationService().changeStatus(
      context,
      actor,
      profileId,
      input
    );
    revalidatePath("/procurement");
    revalidatePath("/procurement/suppliers");
    revalidatePath(`/procurement/suppliers/${profileId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setProcurementPreferredAction(
  profileId: string,
  input: SetPreferredCommand
): Promise<ProcurementActionResult<SupplierProfileView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createProcurementFoundationService().setPreferred(
      context,
      actor,
      profileId,
      input
    );
    revalidatePath("/procurement");
    revalidatePath("/procurement/suppliers");
    revalidatePath(`/procurement/suppliers/${profileId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function recordProcurementQualificationAction(
  profileId: string,
  input: RecordQualificationCommand
): Promise<ProcurementActionResult<SupplierProfileView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createProcurementFoundationService().recordQualification(
      context,
      actor,
      profileId,
      input
    );
    revalidatePath(`/procurement/suppliers/${profileId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function checkSupplierEligibilityAction(
  supplierPartyId: string
): Promise<ProcurementActionResult<EligibilityView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createProcurementFoundationService().checkEligibility(
      context,
      actor,
      supplierPartyId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
