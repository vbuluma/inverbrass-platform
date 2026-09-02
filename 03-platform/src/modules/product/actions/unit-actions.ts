"use server";

/**
 * Purpose:
 * Expose Units of Measure server actions to the App Router UI.
 *
 * Implementation Package:
 * BP-003 / IP-003 – Units of Measure Engine
 */

import { requireProductChannelContext as requireProductContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { ProductError } from "@/modules/product/errors";
import { createUnitService } from "@/modules/product/services/unit-service";
import type {
  ConvertUnitsPayload,
  CreateUnitPayload,
  SearchUnitsPayload,
  UnitConversionResultView,
  UnitDashboardView,
  UnitRegistrationCataloguesView,
  UnitView,
  UnitWorkspaceView,
  UpdateUnitPayload,
} from "@/modules/product/types";


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

  if (error instanceof ProductError) {
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

  console.error("[unit-actions] Unexpected error", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "We could not complete that unit action. Please try again.",
    },
  };
}

function revalidateUnitPaths(unitId?: string) {
  revalidatePath("/products/units");
  revalidatePath("/products");
  if (unitId) {
    revalidatePath(`/products/units/${unitId}`);
  }
}

export async function getUnitDashboardAction(): Promise<
  AuthActionResult<UnitDashboardView>
> {
  try {
    const context = await requireProductContext();
    const service = createUnitService();
    const data = await service.getDashboard(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getUnitRegistrationCataloguesAction(): Promise<
  AuthActionResult<UnitRegistrationCataloguesView>
> {
  try {
    const context = await requireProductContext();
    const service = createUnitService();
    const data = await service.getRegistrationCatalogues(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function searchUnitsAction(
  payload: SearchUnitsPayload
): Promise<AuthActionResult<UnitView[]>> {
  try {
    const context = await requireProductContext();
    const service = createUnitService();
    const data = await service.searchUnits(context, payload);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getUnitWorkspaceAction(
  unitId: string
): Promise<AuthActionResult<UnitWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const service = createUnitService();
    const data = await service.getUnitWorkspace(context, unitId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createUnitAction(
  payload: CreateUnitPayload
): Promise<AuthActionResult<UnitWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const service = createUnitService();
    const data = await service.createUnit(context, payload);
    revalidateUnitPaths(data.unit.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateUnitAction(
  unitId: string,
  payload: UpdateUnitPayload
): Promise<AuthActionResult<UnitWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const service = createUnitService();
    const data = await service.updateUnit(context, unitId, payload);
    revalidateUnitPaths(unitId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function activateUnitAction(
  unitId: string
): Promise<AuthActionResult<UnitWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const service = createUnitService();
    const data = await service.activateUnit(context, unitId);
    revalidateUnitPaths(unitId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function suspendUnitAction(
  unitId: string
): Promise<AuthActionResult<UnitWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const service = createUnitService();
    const data = await service.suspendUnit(context, unitId);
    revalidateUnitPaths(unitId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function archiveUnitAction(
  unitId: string
): Promise<AuthActionResult<UnitWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const service = createUnitService();
    const data = await service.archiveUnit(context, unitId);
    revalidateUnitPaths(unitId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function convertUnitsAction(
  payload: ConvertUnitsPayload
): Promise<AuthActionResult<UnitConversionResultView>> {
  try {
    const context = await requireProductContext();
    const service = createUnitService();
    const data = await service.convertUnits(context, payload);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
