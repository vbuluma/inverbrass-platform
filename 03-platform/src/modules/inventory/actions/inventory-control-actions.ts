"use server";

/**
 * Purpose:
 * Server actions for inventory control evaluation and replenishment advice.
 *
 * Implementation Package:
 * BP-008 / IP-08 – Reorder & Inventory Controls
 */

import { requireInventoryChannelContext as requireInventoryContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import { revalidatePath } from "next/cache";

import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { InventoryError } from "@/modules/inventory/errors";
import { createInventoryControlService } from "@/modules/inventory/services/inventory-control-service";
import type {
  InventoryControlChangeRecord,
  InventoryControlDashboardView,
  InventoryReplenishmentAdviceRecord,
  SaveInventoryControlSettingsCommand,
} from "@/modules/inventory/types";

export type InventoryControlActionError = {
  code: string;
  message: string;
  field?: string;
};

export type InventoryControlActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: InventoryControlActionError };


function toActionError(error: unknown): InventoryControlActionResult<never> {
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
    return { success: false, error: { code: error.code, message: error.message } };
  }
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "Inventory controls could not be updated. Please try again.",
    },
  };
}

export async function getInventoryControlsAction(query?: {
  locationId?: string | null;
  status?: string | null;
  stockItemId?: string | null;
}): Promise<InventoryControlActionResult<InventoryControlDashboardView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createInventoryControlService().evaluateStockControls(context, query);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveInventoryControlSettingsAction(
  command: SaveInventoryControlSettingsCommand
) {
  try {
    const context = await requireInventoryContext();
    const data = await createInventoryControlService().saveControlSettings(context, command);
    revalidatePath("/inventory/controls");
    revalidatePath(`/inventory/items/${command.stockItemId}`);
    return { success: true as const, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function syncReplenishmentAdviceAction(idempotencyKey?: string | null) {
  try {
    const context = await requireInventoryContext();
    const data = await createInventoryControlService().syncReplenishmentAdvice(
      context,
      idempotencyKey
    );
    revalidatePath("/inventory/controls");
    return { success: true as const, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function acknowledgeAdviceAction(adviceId: string) {
  try {
    const context = await requireInventoryContext();
    const data = await createInventoryControlService().acknowledgeAdvice(context, adviceId);
    revalidatePath("/inventory/controls");
    return { success: true as const, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function closeAdviceAction(adviceId: string, reason?: string | null) {
  try {
    const context = await requireInventoryContext();
    const data = await createInventoryControlService().closeAdvice(context, adviceId, reason);
    revalidatePath("/inventory/controls");
    return { success: true as const, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function approveControlChangeAction(changeId: string, reason?: string | null) {
  try {
    const context = await requireInventoryContext();
    const data = await createInventoryControlService().approveControlChange(
      context,
      changeId,
      reason
    );
    revalidatePath("/inventory/controls");
    return { success: true as const, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectControlChangeAction(changeId: string, reason?: string | null) {
  try {
    const context = await requireInventoryContext();
    const data = await createInventoryControlService().rejectControlChange(
      context,
      changeId,
      reason
    );
    revalidatePath("/inventory/controls");
    return { success: true as const, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getControlChangeAction(
  changeId: string
): Promise<InventoryControlActionResult<InventoryControlChangeRecord>> {
  try {
    const context = await requireInventoryContext();
    const data = await createInventoryControlService().getControlChange(context, changeId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getAdviceAction(
  adviceId: string
): Promise<InventoryControlActionResult<InventoryReplenishmentAdviceRecord>> {
  try {
    const context = await requireInventoryContext();
    const data = await createInventoryControlService().getAdvice(context, adviceId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
