"use server";

/**
 * Purpose:
 * Server actions for BP-009 IP-06 purchase orders.
 */

import { revalidatePath } from "next/cache";

import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { ProcurementError } from "@/modules/procurement";
import { requireProcurementChannelContext } from "@/modules/procurement/helpers/procurement-channel-context";
import { createPurchaseOrderService } from "@/modules/procurement/services/purchase-order-service";
import type {
  AmendPurchaseOrderCommand,
  GeneratePoFromAwardCommand,
  GeneratePoFromPurchaseRequestCommand,
  IssuePurchaseOrderCommand,
  PoDecisionCommand,
  PoSupplierActionCommand,
  PoSupplierPortalView,
  PurchaseOrderListFilter,
  PurchaseOrderListView,
  PurchaseOrderView,
  RecordPoFulfilmentCommand,
} from "@/modules/procurement/types";

export type PurchaseOrderActionError = {
  code: string;
  message: string;
  field?: string;
};

export type PurchaseOrderActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: PurchaseOrderActionError };

function toActionError(error: unknown): PurchaseOrderActionResult<never> {
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
      message: "The purchase order could not be processed. Please try again.",
    },
  };
}

export async function listPurchaseOrdersAction(
  filter: PurchaseOrderListFilter = {}
): Promise<PurchaseOrderActionResult<PurchaseOrderListView[]>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createPurchaseOrderService().list(context, actor, filter);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getPurchaseOrderAction(
  poId: string
): Promise<PurchaseOrderActionResult<PurchaseOrderView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createPurchaseOrderService().get(context, actor, poId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function generatePoFromAwardAction(
  input: GeneratePoFromAwardCommand
): Promise<PurchaseOrderActionResult<PurchaseOrderView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createPurchaseOrderService().generateFromAward(context, actor, input);
    revalidatePath("/procurement/orders");
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function generatePoFromPurchaseRequestAction(
  input: GeneratePoFromPurchaseRequestCommand
): Promise<PurchaseOrderActionResult<PurchaseOrderView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createPurchaseOrderService().generateFromPurchaseRequest(
      context,
      actor,
      input
    );
    revalidatePath("/procurement/orders");
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function submitPurchaseOrderAction(
  poId: string
): Promise<PurchaseOrderActionResult<PurchaseOrderView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createPurchaseOrderService().submit(context, actor, poId);
    revalidatePath(`/procurement/orders/${poId}`);
    revalidatePath("/procurement/orders");
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function approvePurchaseOrderAction(
  poId: string
): Promise<PurchaseOrderActionResult<PurchaseOrderView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createPurchaseOrderService().approve(context, actor, poId);
    revalidatePath(`/procurement/orders/${poId}`);
    revalidatePath("/procurement/orders");
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectPurchaseOrderApprovalAction(
  poId: string,
  input: PoDecisionCommand
): Promise<PurchaseOrderActionResult<PurchaseOrderView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createPurchaseOrderService().rejectApproval(context, actor, poId, input);
    revalidatePath(`/procurement/orders/${poId}`);
    revalidatePath("/procurement/orders");
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function issuePurchaseOrderAction(
  poId: string,
  input: IssuePurchaseOrderCommand = {}
): Promise<PurchaseOrderActionResult<PurchaseOrderView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createPurchaseOrderService().issue(context, actor, poId, input);
    revalidatePath(`/procurement/orders/${poId}`);
    revalidatePath("/procurement/orders");
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function amendPurchaseOrderAction(
  poId: string,
  input: AmendPurchaseOrderCommand
): Promise<PurchaseOrderActionResult<PurchaseOrderView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createPurchaseOrderService().amend(context, actor, poId, input);
    revalidatePath(`/procurement/orders/${poId}`);
    revalidatePath("/procurement/orders");
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function cancelPurchaseOrderAction(
  poId: string,
  input: PoDecisionCommand
): Promise<PurchaseOrderActionResult<PurchaseOrderView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createPurchaseOrderService().cancel(context, actor, poId, input);
    revalidatePath(`/procurement/orders/${poId}`);
    revalidatePath("/procurement/orders");
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function closePurchaseOrderAction(
  poId: string,
  input: PoDecisionCommand
): Promise<PurchaseOrderActionResult<PurchaseOrderView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createPurchaseOrderService().close(context, actor, poId, input);
    revalidatePath(`/procurement/orders/${poId}`);
    revalidatePath("/procurement/orders");
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getPoSupplierPortalAction(
  token: string
): Promise<PurchaseOrderActionResult<PoSupplierPortalView>> {
  try {
    const data = await createPurchaseOrderService().getByToken(token);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function acceptPoByTokenAction(
  token: string,
  input: PoSupplierActionCommand = {}
): Promise<PurchaseOrderActionResult<PoSupplierPortalView>> {
  try {
    const data = await createPurchaseOrderService().acceptByToken(token, input);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectPoByTokenAction(
  token: string,
  input: PoSupplierActionCommand
): Promise<PurchaseOrderActionResult<PoSupplierPortalView>> {
  try {
    const data = await createPurchaseOrderService().rejectByToken(token, input);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function requestPoChangeByTokenAction(
  token: string,
  input: PoSupplierActionCommand
): Promise<PurchaseOrderActionResult<PoSupplierPortalView>> {
  try {
    const data = await createPurchaseOrderService().requestChangeByToken(token, input);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function recordPoFulfilmentAction(
  poId: string,
  input: RecordPoFulfilmentCommand
): Promise<PurchaseOrderActionResult<PurchaseOrderView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createPurchaseOrderService().recordFulfilmentEvent(
      context,
      actor,
      poId,
      input
    );
    revalidatePath(`/procurement/orders/${poId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
