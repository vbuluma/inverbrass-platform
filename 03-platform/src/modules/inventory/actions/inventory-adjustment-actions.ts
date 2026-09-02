"use server";

/**
 * Purpose:
 * Server actions for stock adjustments, damage, loss, and returns.
 *
 * Implementation Package:
 * BP-008 / IP-05 – Stock Adjustments, Damage, Loss & Returns
 */

import { requireInventoryChannelContext as requireInventoryContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import { revalidatePath } from "next/cache";

import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { InventoryError } from "@/modules/inventory/errors";
import { createStockAdjustmentService } from "@/modules/inventory/services/stock-adjustment-service";
import type {
  AddAdjustmentLineCommand,
  CreateAdjustmentCommand,
  InventoryAdjustmentView,
} from "@/modules/inventory/types";

export type InventoryAdjustmentActionError = {
  code: string;
  message: string;
  field?: string;
};

export type InventoryAdjustmentActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: InventoryAdjustmentActionError };


function toActionError(error: unknown): InventoryAdjustmentActionResult<never> {
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

function revalidateAdjustmentPaths(adjustmentId?: string) {
  revalidatePath("/inventory");
  revalidatePath("/inventory/availability");
  revalidatePath("/inventory/adjustments");
  if (adjustmentId) {
    revalidatePath(`/inventory/adjustments/${adjustmentId}`);
  }
}

export async function listAdjustmentsAction(): Promise<
  InventoryAdjustmentActionResult<InventoryAdjustmentView[]>
> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockAdjustmentService().listAdjustments(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getAdjustmentAction(
  adjustmentId: string
): Promise<InventoryAdjustmentActionResult<InventoryAdjustmentView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockAdjustmentService().getAdjustment(context, adjustmentId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createAdjustmentAction(
  command: CreateAdjustmentCommand
): Promise<InventoryAdjustmentActionResult<InventoryAdjustmentView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockAdjustmentService().createAdjustment(context, command);
    revalidateAdjustmentPaths(data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addAdjustmentLineAction(
  adjustmentId: string,
  command: AddAdjustmentLineCommand
): Promise<InventoryAdjustmentActionResult<InventoryAdjustmentView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockAdjustmentService().addAdjustmentLine(
      context,
      adjustmentId,
      command
    );
    revalidateAdjustmentPaths(adjustmentId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function submitAdjustmentAction(
  adjustmentId: string
): Promise<InventoryAdjustmentActionResult<InventoryAdjustmentView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockAdjustmentService().submitAdjustment(context, adjustmentId);
    revalidateAdjustmentPaths(adjustmentId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function approveAdjustmentAction(
  adjustmentId: string
): Promise<InventoryAdjustmentActionResult<InventoryAdjustmentView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockAdjustmentService().approveAdjustment(context, adjustmentId);
    revalidateAdjustmentPaths(adjustmentId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectAdjustmentAction(
  adjustmentId: string,
  reason: string
): Promise<InventoryAdjustmentActionResult<InventoryAdjustmentView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockAdjustmentService().rejectAdjustment(
      context,
      adjustmentId,
      reason
    );
    revalidateAdjustmentPaths(adjustmentId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function cancelAdjustmentAction(
  adjustmentId: string
): Promise<InventoryAdjustmentActionResult<InventoryAdjustmentView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockAdjustmentService().cancelAdjustment(context, adjustmentId);
    revalidateAdjustmentPaths(adjustmentId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function postAdjustmentAction(
  adjustmentId: string
): Promise<InventoryAdjustmentActionResult<InventoryAdjustmentView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockAdjustmentService().postAdjustment(context, adjustmentId);
    revalidateAdjustmentPaths(adjustmentId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
