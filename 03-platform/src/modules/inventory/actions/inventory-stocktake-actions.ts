"use server";

/**
 * Purpose:
 * Server actions for physical stocktake and reconciliation.
 *
 * Implementation Package:
 * BP-008 / IP-06 – Stocktake & Inventory Reconciliation
 */

import { requireInventoryChannelContext as requireInventoryContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import { revalidatePath } from "next/cache";

import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { InventoryError } from "@/modules/inventory/errors";
import { createStocktakeService } from "@/modules/inventory/services/stocktake-service";
import type {
  CreateStocktakeCommand,
  InventoryStocktakeView,
  RecordStocktakeCountCommand,
} from "@/modules/inventory/types";

export type InventoryStocktakeActionError = {
  code: string;
  message: string;
  field?: string;
};

export type InventoryStocktakeActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: InventoryStocktakeActionError };


function toActionError(error: unknown): InventoryStocktakeActionResult<never> {
  if (isNextRedirectError(error)) {
    throw error;
  }
  if (error instanceof InventoryError) {
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
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "The inventory details could not be saved. Please try again.",
    },
  };
}

function revalidateStocktakePaths(stocktakeId?: string) {
  revalidatePath("/inventory");
  revalidatePath("/inventory/availability");
  revalidatePath("/inventory/stocktakes");
  if (stocktakeId) {
    revalidatePath(`/inventory/stocktakes/${stocktakeId}`);
  }
}

export async function listStocktakesAction(): Promise<
  InventoryStocktakeActionResult<InventoryStocktakeView[]>
> {
  try {
    const context = await requireInventoryContext();
    const data = await createStocktakeService().listStocktakes(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getStocktakeAction(
  stocktakeId: string
): Promise<InventoryStocktakeActionResult<InventoryStocktakeView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStocktakeService().getStocktake(context, stocktakeId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createStocktakeAction(
  command: CreateStocktakeCommand
): Promise<InventoryStocktakeActionResult<InventoryStocktakeView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStocktakeService().createStocktake(context, command);
    revalidateStocktakePaths(data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function startStocktakeAction(
  stocktakeId: string
): Promise<InventoryStocktakeActionResult<InventoryStocktakeView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStocktakeService().startStocktake(context, stocktakeId);
    revalidateStocktakePaths(stocktakeId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function recordStocktakeCountAction(
  stocktakeId: string,
  lineId: string,
  command: RecordStocktakeCountCommand
): Promise<InventoryStocktakeActionResult<InventoryStocktakeView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStocktakeService().recordCount(context, stocktakeId, lineId, command);
    revalidateStocktakePaths(stocktakeId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function recountStocktakeLineAction(
  stocktakeId: string,
  lineId: string,
  command: RecordStocktakeCountCommand
): Promise<InventoryStocktakeActionResult<InventoryStocktakeView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStocktakeService().recountLine(context, stocktakeId, lineId, command);
    revalidateStocktakePaths(stocktakeId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function submitStocktakeAction(
  stocktakeId: string
): Promise<InventoryStocktakeActionResult<InventoryStocktakeView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStocktakeService().submitStocktake(context, stocktakeId);
    revalidateStocktakePaths(stocktakeId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function approveStocktakeAction(
  stocktakeId: string
): Promise<InventoryStocktakeActionResult<InventoryStocktakeView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStocktakeService().approveStocktake(context, stocktakeId);
    revalidateStocktakePaths(stocktakeId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectStocktakeAction(
  stocktakeId: string,
  reason: string
): Promise<InventoryStocktakeActionResult<InventoryStocktakeView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStocktakeService().rejectStocktake(context, stocktakeId, reason);
    revalidateStocktakePaths(stocktakeId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function cancelStocktakeAction(
  stocktakeId: string
): Promise<InventoryStocktakeActionResult<InventoryStocktakeView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStocktakeService().cancelStocktake(context, stocktakeId);
    revalidateStocktakePaths(stocktakeId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function postStocktakeAction(
  stocktakeId: string
): Promise<InventoryStocktakeActionResult<InventoryStocktakeView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStocktakeService().postStocktake(context, stocktakeId);
    revalidateStocktakePaths(stocktakeId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function completeStocktakeAction(
  stocktakeId: string
): Promise<InventoryStocktakeActionResult<InventoryStocktakeView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStocktakeService().completeStocktake(context, stocktakeId);
    revalidateStocktakePaths(stocktakeId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
