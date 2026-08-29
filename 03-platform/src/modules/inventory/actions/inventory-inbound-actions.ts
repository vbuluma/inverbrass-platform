"use server";

/**
 * Purpose:
 * Server actions for stock receiving and opening balances.
 *
 * Implementation Package:
 * BP-008 / IP-02 – Stock Receiving & Opening Balances
 */

import { revalidatePath } from "next/cache";

import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { InventoryError } from "@/modules/inventory/errors";
import { createStockReceivingService } from "@/modules/inventory/services/stock-receiving-service";
import type {
  AddOpeningBalanceLineCommand,
  AddReceiptLineCommand,
  CreateOpeningBalanceCommand,
  CreateReceiptCommand,
  InventoryOpeningBalanceView,
  InventoryReceiptView,
  InventorySupplierRef,
} from "@/modules/inventory/types";

export type InventoryInboundActionError = {
  code: string;
  message: string;
  field?: string;
};

export type InventoryInboundActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: InventoryInboundActionError };

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

function toActionError(error: unknown): InventoryInboundActionResult<never> {
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

export async function listReceiptsAction(): Promise<
  InventoryInboundActionResult<InventoryReceiptView[]>
> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReceivingService().listReceipts(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getReceiptAction(
  receiptId: string
): Promise<InventoryInboundActionResult<InventoryReceiptView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReceivingService().getReceipt(context, receiptId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createReceiptAction(
  command: CreateReceiptCommand
): Promise<InventoryInboundActionResult<InventoryReceiptView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReceivingService().createReceipt(context, command);
    revalidatePath("/inventory/receive");
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addReceiptLineAction(
  receiptId: string,
  command: AddReceiptLineCommand
): Promise<InventoryInboundActionResult<InventoryReceiptView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReceivingService().addReceiptLine(context, receiptId, command);
    revalidatePath(`/inventory/receive/${receiptId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function submitReceiptAction(
  receiptId: string
): Promise<InventoryInboundActionResult<InventoryReceiptView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReceivingService().submitReceipt(context, receiptId);
    revalidatePath(`/inventory/receive/${receiptId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function approveReceiptAction(
  receiptId: string
): Promise<InventoryInboundActionResult<InventoryReceiptView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReceivingService().approveReceipt(context, receiptId);
    revalidatePath(`/inventory/receive/${receiptId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectReceiptAction(
  receiptId: string,
  reason: string
): Promise<InventoryInboundActionResult<InventoryReceiptView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReceivingService().rejectReceipt(context, receiptId, reason);
    revalidatePath(`/inventory/receive/${receiptId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function postReceiptAction(
  receiptId: string
): Promise<InventoryInboundActionResult<InventoryReceiptView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReceivingService().postReceipt(context, receiptId);
    revalidatePath("/inventory");
    revalidatePath(`/inventory/receive/${receiptId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function cancelReceiptAction(
  receiptId: string
): Promise<InventoryInboundActionResult<InventoryReceiptView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReceivingService().cancelReceipt(context, receiptId);
    revalidatePath(`/inventory/receive/${receiptId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listOpeningBalancesAction(): Promise<
  InventoryInboundActionResult<InventoryOpeningBalanceView[]>
> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReceivingService().listOpeningBalances(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getOpeningBalanceAction(
  openingId: string
): Promise<InventoryInboundActionResult<InventoryOpeningBalanceView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReceivingService().getOpeningBalance(context, openingId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createOpeningBalanceAction(
  command: CreateOpeningBalanceCommand
): Promise<InventoryInboundActionResult<InventoryOpeningBalanceView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReceivingService().createOpeningBalance(context, command);
    revalidatePath("/inventory/opening-balances");
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addOpeningBalanceLineAction(
  openingId: string,
  command: AddOpeningBalanceLineCommand
): Promise<InventoryInboundActionResult<InventoryOpeningBalanceView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReceivingService().addOpeningBalanceLine(
      context,
      openingId,
      command
    );
    revalidatePath(`/inventory/opening-balances/${openingId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function submitOpeningBalanceAction(
  openingId: string
): Promise<InventoryInboundActionResult<InventoryOpeningBalanceView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReceivingService().submitOpeningBalance(context, openingId);
    revalidatePath(`/inventory/opening-balances/${openingId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function approveOpeningBalanceAction(
  openingId: string
): Promise<InventoryInboundActionResult<InventoryOpeningBalanceView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReceivingService().approveOpeningBalance(context, openingId);
    revalidatePath(`/inventory/opening-balances/${openingId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectOpeningBalanceAction(
  openingId: string,
  reason: string
): Promise<InventoryInboundActionResult<InventoryOpeningBalanceView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReceivingService().rejectOpeningBalance(
      context,
      openingId,
      reason
    );
    revalidatePath(`/inventory/opening-balances/${openingId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function postOpeningBalanceAction(
  openingId: string
): Promise<InventoryInboundActionResult<InventoryOpeningBalanceView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReceivingService().postOpeningBalance(context, openingId);
    revalidatePath("/inventory");
    revalidatePath(`/inventory/opening-balances/${openingId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function cancelOpeningBalanceAction(
  openingId: string
): Promise<InventoryInboundActionResult<InventoryOpeningBalanceView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReceivingService().cancelOpeningBalance(context, openingId);
    revalidatePath(`/inventory/opening-balances/${openingId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listInventorySuppliersAction(): Promise<
  InventoryInboundActionResult<InventorySupplierRef[]>
> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReceivingService().listSuppliers(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
