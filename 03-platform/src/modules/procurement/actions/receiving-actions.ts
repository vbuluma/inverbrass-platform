"use server";

/**
 * Purpose:
 * Server actions for BP-009 IP-08 procurement receiving.
 */

import { revalidatePath } from "next/cache";

import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { ProcurementError } from "@/modules/procurement";
import { requireProcurementChannelContext } from "@/modules/procurement/helpers/procurement-channel-context";
import { createReceivingService } from "@/modules/procurement/services/receiving-service";
import { createPurchaseOrderService } from "@/modules/procurement/services/purchase-order-service";
import type {
  CreateReceiptCommand,
  PoFulfilmentSummaryView,
  ReceiptDecisionCommand,
  ReceiptListView,
  ReceiptView,
  RecordDiscrepancyCommand,
  RecordInspectionCommand,
} from "@/modules/procurement/types";

export type ReceivingActionError = {
  code: string;
  message: string;
  field?: string;
};

export type ReceivingActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ReceivingActionError };

function createServices() {
  const purchaseOrders = createPurchaseOrderService();
  return {
    receiving: createReceivingService({ purchaseOrders }),
  };
}

function toError(error: unknown): ReceivingActionError {
  if (error instanceof ProcurementError) {
    return { code: error.code, message: error.message, field: error.field };
  }
  if (isNextRedirectError(error)) {
    throw error;
  }
  return { code: "PROVIDER_ERROR", message: "Receiving could not be completed." };
}

export async function listReceiptsAction(): Promise<ReceivingActionResult<ReceiptListView[]>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createServices().receiving.list(context, actor);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function getReceiptAction(
  receiptId: string
): Promise<ReceivingActionResult<ReceiptView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createServices().receiving.get(context, actor, receiptId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function getPoFulfilmentAction(
  purchaseOrderId: string
): Promise<ReceivingActionResult<PoFulfilmentSummaryView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createServices().receiving.getPOFulfilmentSummary(
      context,
      actor,
      purchaseOrderId
    );
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function createReceiptAction(
  input: CreateReceiptCommand
): Promise<ReceivingActionResult<ReceiptView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createServices().receiving.createReceipt(context, actor, input);
    revalidatePath("/procurement/receiving");
    revalidatePath(`/procurement/orders/${input.purchaseOrderId}`);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function confirmReceiptAction(
  receiptId: string
): Promise<ReceivingActionResult<ReceiptView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createServices().receiving.confirmReceipt(context, actor, receiptId);
    revalidatePath("/procurement/receiving");
    revalidatePath(`/procurement/receiving/${receiptId}`);
    revalidatePath(`/procurement/orders/${data.purchaseOrderId}`);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function rejectReceiptAction(
  receiptId: string,
  input: ReceiptDecisionCommand
): Promise<ReceivingActionResult<ReceiptView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createServices().receiving.rejectReceipt(context, actor, receiptId, input);
    revalidatePath("/procurement/receiving");
    revalidatePath(`/procurement/receiving/${receiptId}`);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function recordInspectionAction(
  receiptId: string,
  input: RecordInspectionCommand
): Promise<ReceivingActionResult<ReceiptView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createServices().receiving.recordInspection(
      context,
      actor,
      receiptId,
      input
    );
    revalidatePath(`/procurement/receiving/${receiptId}`);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function recordDiscrepancyAction(
  receiptId: string,
  input: RecordDiscrepancyCommand
): Promise<ReceivingActionResult<ReceiptView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createServices().receiving.recordDiscrepancy(
      context,
      actor,
      receiptId,
      input
    );
    revalidatePath(`/procurement/receiving/${receiptId}`);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}
