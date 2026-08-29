"use server";

/**
 * Purpose:
 * Server actions for BP-008 IP-01 inventory foundation.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import { revalidatePath } from "next/cache";

import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { InventoryError } from "@/modules/inventory/errors";
import { createInventoryFoundationService } from "@/modules/inventory/services/inventory-foundation-service";
import type {
  ConfigureStockItemLocationCommand,
  CreateLocationCommand,
  CreateStockItemCommand,
  InventoryDashboardView,
  InventoryLocationView,
  RecordOpeningStockCommand,
  StockItemDetailView,
  StockItemListView,
  UpdateLocationCommand,
  UpdateStockItemCommand,
} from "@/modules/inventory/types";

export type InventoryActionError = {
  code: string;
  message: string;
  field?: string;
};

export type InventoryActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: InventoryActionError };

async function requireInventoryContext() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  if (!user) {
    throw new InventoryError("SESSION_REQUIRED", undefined, 401);
  }
  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();
  if (!context) {
    throw new InventoryError("BUSINESS_CONTEXT_REQUIRED", undefined, 403);
  }
  return context;
}

function toActionError(error: unknown): InventoryActionResult<never> {
  if (isNextRedirectError(error)) {
    throw error;
  }
  if (error instanceof InventoryError) {
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
      message: "The inventory details could not be saved. Please try again.",
    },
  };
}

export async function getInventoryDashboardAction(): Promise<
  InventoryActionResult<InventoryDashboardView>
> {
  try {
    const context = await requireInventoryContext();
    const data = await createInventoryFoundationService().getDashboard(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listStockItemsAction(): Promise<
  InventoryActionResult<StockItemListView[]>
> {
  try {
    const context = await requireInventoryContext();
    const data = await createInventoryFoundationService().listStockItems(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getStockItemAction(
  stockItemId: string
): Promise<InventoryActionResult<StockItemDetailView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createInventoryFoundationService().getStockItem(context, stockItemId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createStockItemAction(
  input: CreateStockItemCommand
): Promise<InventoryActionResult<StockItemDetailView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createInventoryFoundationService().createStockItem(context, input);
    revalidatePath("/inventory");
    revalidatePath(`/inventory/items/${data.id}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateStockItemAction(
  stockItemId: string,
  input: UpdateStockItemCommand
): Promise<InventoryActionResult<StockItemDetailView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createInventoryFoundationService().updateStockItem(
      context,
      stockItemId,
      input
    );
    revalidatePath("/inventory");
    revalidatePath(`/inventory/items/${data.id}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setStockItemActiveAction(
  stockItemId: string,
  isActive: boolean
): Promise<InventoryActionResult<StockItemDetailView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createInventoryFoundationService().setStockItemActive(
      context,
      stockItemId,
      isActive
    );
    revalidatePath("/inventory");
    revalidatePath(`/inventory/items/${data.id}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listLocationsAction(): Promise<
  InventoryActionResult<InventoryLocationView[]>
> {
  try {
    const context = await requireInventoryContext();
    const data = await createInventoryFoundationService().listLocations(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createLocationAction(
  input: CreateLocationCommand
): Promise<InventoryActionResult<InventoryLocationView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createInventoryFoundationService().createLocation(context, input);
    revalidatePath("/inventory");
    revalidatePath("/inventory/locations");
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateLocationAction(
  locationId: string,
  input: UpdateLocationCommand
): Promise<InventoryActionResult<InventoryLocationView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createInventoryFoundationService().updateLocation(
      context,
      locationId,
      input
    );
    revalidatePath("/inventory");
    revalidatePath("/inventory/locations");
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setLocationActiveAction(
  locationId: string,
  isActive: boolean
): Promise<InventoryActionResult<InventoryLocationView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createInventoryFoundationService().setLocationActive(
      context,
      locationId,
      isActive
    );
    revalidatePath("/inventory");
    revalidatePath("/inventory/locations");
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function configureStockItemLocationAction(
  input: ConfigureStockItemLocationCommand
): Promise<InventoryActionResult<StockItemDetailView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createInventoryFoundationService().configureStockItemLocation(
      context,
      input
    );
    revalidatePath(`/inventory/items/${data.id}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function recordOpeningStockAction(
  input: RecordOpeningStockCommand
): Promise<InventoryActionResult<StockItemDetailView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createInventoryFoundationService().recordOpeningStock(context, input);
    revalidatePath("/inventory");
    revalidatePath(`/inventory/items/${data.id}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
