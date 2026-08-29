"use server";

/**
 * Purpose:
 * Server actions for stock transfers between locations.
 *
 * Implementation Package:
 * BP-008 / IP-04 – Stock Transfers & Multi-Location
 */

import { revalidatePath } from "next/cache";

import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { InventoryError } from "@/modules/inventory/errors";
import { createStockReservationService } from "@/modules/inventory/services/stock-reservation-service";
import { createStockTransferService } from "@/modules/inventory/services/stock-transfer-service";
import type {
  CreateTransferCommand,
  InventoryAvailabilityView,
  InventoryTransferSummary,
  InventoryTransferView,
  ReceiveTransferCommand,
} from "@/modules/inventory/types";

export type InventoryTransferActionError = {
  code: string;
  message: string;
  field?: string;
};

export type InventoryTransferActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: InventoryTransferActionError };

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

function toActionError(error: unknown): InventoryTransferActionResult<never> {
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

function revalidateTransferPaths(transferId?: string) {
  revalidatePath("/inventory");
  revalidatePath("/inventory/transfers");
  revalidatePath("/inventory/availability");
  if (transferId) {
    revalidatePath(`/inventory/transfers/${transferId}`);
  }
}

export async function listTransfersAction(): Promise<
  InventoryTransferActionResult<InventoryTransferView[]>
> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockTransferService().listTransfers(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getTransferAction(
  transferId: string
): Promise<InventoryTransferActionResult<InventoryTransferView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockTransferService().getTransfer(context, transferId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function summarizeTransfersAction(): Promise<
  InventoryTransferActionResult<InventoryTransferSummary>
> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockTransferService().summarizeTransfers(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listAvailabilityWithTransitAction(): Promise<
  InventoryTransferActionResult<InventoryAvailabilityView[]>
> {
  try {
    const context = await requireInventoryContext();
    const rows = await createStockReservationService().listAvailability(context);
    const data = await createStockTransferService().enrichAvailability(context, rows);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createTransferAction(
  command: CreateTransferCommand
): Promise<InventoryTransferActionResult<InventoryTransferView>> {
  try {
    const context = await requireInventoryContext();
    const service = createStockTransferService();
    const created = await service.createTransfer(context, command);
    const data = await service.requestTransfer(context, created.id);
    revalidateTransferPaths(data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function approveTransferAction(
  transferId: string
): Promise<InventoryTransferActionResult<InventoryTransferView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockTransferService().approveTransfer(context, transferId);
    revalidateTransferPaths(transferId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectTransferAction(
  transferId: string,
  reason: string
): Promise<InventoryTransferActionResult<InventoryTransferView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockTransferService().rejectTransfer(context, transferId, reason);
    revalidateTransferPaths(transferId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function dispatchTransferAction(
  transferId: string
): Promise<InventoryTransferActionResult<InventoryTransferView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockTransferService().dispatchTransfer(context, transferId);
    revalidateTransferPaths(transferId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function receiveTransferAction(
  command: ReceiveTransferCommand
): Promise<InventoryTransferActionResult<InventoryTransferView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockTransferService().receiveTransfer(context, command);
    revalidateTransferPaths(command.transferId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function cancelTransferAction(
  transferId: string,
  reason?: string | null
): Promise<InventoryTransferActionResult<InventoryTransferView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockTransferService().cancelTransfer(context, transferId, reason);
    revalidateTransferPaths(transferId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
