"use server";

/**
 * Purpose:
 * Server actions for BP-006 sales/order creation, confirmation, and lifecycle.
 *
 * Implementation Package:
 * BP-006 / IP-01 – Sales & Order Creation
 * BP-006 / IP-02 – Order Lifecycle & Fulfilment
 * BP-006 / IP-03 – Delivery, Inspection & Service Completion
 * BP-006 / IP-04 – Amendments, Cancellation & Returns
 * BP-006 / IP-05 – Downstream Handoff & Sales Workspace
 */

import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import type {
  CommercialSnapshot,
  ExpectedCommercialAmount,
} from "@/modules/commercial";
import { SalesOrderError } from "@/modules/sales/errors";
import { createDefaultSalesDeliveryService } from "@/modules/sales/services/sales-delivery-service";
import { createDefaultSalesExceptionService } from "@/modules/sales/services/sales-exception-service";
import { createSalesOrderService } from "@/modules/sales/services/sales-order-service";
import type {
  ConsumedCommercialResult,
  InventoryFulfilmentHandoffContract,
  PaymentReadyOrderContract,
  SalesDashboardView,
  SalesDownstreamHandoffContract,
  SalesOrderDetailView,
} from "@/modules/sales/types";

export type SalesActionError = {
  code: string;
  message: string;
  field?: string;
  entity?: string;
  nextAction?: string;
};

export type SalesActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: SalesActionError };

async function requireSalesContext() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  if (!user) {
    throw new SalesOrderError("SESSION_REQUIRED", undefined, 401);
  }
  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();
  if (!context) {
    throw new SalesOrderError("BUSINESS_CONTEXT_REQUIRED", undefined, 403);
  }
  return context;
}

function toActionError(error: unknown): SalesActionResult<never> {
  if (isNextRedirectError(error)) {
    throw error;
  }
  if (error instanceof SalesOrderError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        field: error.field,
        entity: error.entity,
        nextAction: error.nextAction,
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
      message: "The sale could not be completed. Please try again.",
    },
  };
}

function revalidateSale(orderId?: string) {
  revalidatePath("/sales");
  if (orderId) {
    revalidatePath(`/sales/${orderId}`);
  }
}

export async function getSalesDashboardAction(): Promise<
  AuthActionResult<SalesDashboardView>
> {
  try {
    const context = await requireSalesContext();
    const data = await createSalesOrderService().getDashboard(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getSalesOrderAction(
  orderId: string
): Promise<SalesActionResult<SalesOrderDetailView>> {
  try {
    const context = await requireSalesContext();
    const data = await createSalesOrderService().applyFulfilmentOutcomes(
      context,
      orderId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function prepareSaleCommercialAction(input: {
  customerPartyId: string;
  offeringId: string;
  quantity: number;
  currencyCode: string;
}): Promise<SalesActionResult<ConsumedCommercialResult>> {
  try {
    const context = await requireSalesContext();
    const data = await createSalesOrderService().prepareCommercial(context, input);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createDirectSaleAction(input: {
  customerPartyId: string;
  crmRecordId?: string | null;
  currencyCode: string;
  quantity: number;
  offeringId: string;
  description?: string | null;
  snapshot: CommercialSnapshot;
  expected?: ExpectedCommercialAmount | null;
}): Promise<SalesActionResult<SalesOrderDetailView>> {
  try {
    const context = await requireSalesContext();
    const data = await createSalesOrderService().createDirectSale(context, {
      customerPartyId: input.customerPartyId,
      crmRecordId: input.crmRecordId,
      currencyCode: input.currencyCode,
      lines: [
        {
          offeringId: input.offeringId,
          quantity: input.quantity,
          snapshot: input.snapshot,
          expected: input.expected,
          description: input.description,
        },
      ],
    });
    revalidateSale(data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function convertQuotationToSaleAction(
  quotationId: string
): Promise<SalesActionResult<SalesOrderDetailView>> {
  try {
    const context = await requireSalesContext();
    const data = await createSalesOrderService().convertFromQuotation(context, {
      quotationId,
    });
    revalidateSale(data.id);
    revalidatePath(`/quotations/${quotationId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function submitSaleConfirmationAction(
  orderId: string
): Promise<SalesActionResult<SalesOrderDetailView>> {
  try {
    const context = await requireSalesContext();
    const data = await createSalesOrderService().submitConfirmation(context, orderId);
    revalidateSale(orderId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function approveSaleConfirmationAction(
  orderId: string
): Promise<SalesActionResult<SalesOrderDetailView>> {
  try {
    const context = await requireSalesContext();
    const data = await createSalesOrderService().approveConfirmation(context, orderId);
    revalidateSale(orderId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectSaleConfirmationAction(
  orderId: string,
  reason?: string
): Promise<SalesActionResult<SalesOrderDetailView>> {
  try {
    const context = await requireSalesContext();
    const data = await createSalesOrderService().rejectConfirmation(context, orderId, {
      reason,
    });
    revalidateSale(orderId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function requestSaleCompletionAction(
  orderId: string
): Promise<SalesActionResult<SalesOrderDetailView>> {
  try {
    const context = await requireSalesContext();
    const data = await createSalesOrderService().requestOrderCompletion(
      context,
      orderId
    );
    revalidateSale(orderId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function approveSaleCompletionAction(
  orderId: string
): Promise<SalesActionResult<SalesOrderDetailView>> {
  try {
    const context = await requireSalesContext();
    const data = await createSalesOrderService().approveOrderCompletion(
      context,
      orderId
    );
    revalidateSale(orderId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectSaleCompletionAction(
  orderId: string,
  reason?: string
): Promise<SalesActionResult<SalesOrderDetailView>> {
  try {
    const context = await requireSalesContext();
    const data = await createSalesOrderService().rejectOrderCompletion(
      context,
      orderId,
      { reason }
    );
    revalidateSale(orderId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getSalePaymentReadyContractAction(
  orderId: string
): Promise<SalesActionResult<PaymentReadyOrderContract>> {
  try {
    const context = await requireSalesContext();
    const data = await createSalesOrderService().getPaymentReadyContract(
      context,
      orderId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getSaleFulfilmentHandoffAction(
  orderId: string
): Promise<SalesActionResult<InventoryFulfilmentHandoffContract>> {
  try {
    const context = await requireSalesContext();
    const data = await createSalesOrderService().getFulfilmentHandoffContract(
      context,
      orderId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getSaleDownstreamHandoffAction(
  orderId: string
): Promise<SalesActionResult<SalesDownstreamHandoffContract>> {
  try {
    const context = await requireSalesContext();
    const data = await createSalesOrderService().getDownstreamHandoff(context, orderId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addSaleNoteAction(input: {
  orderId: string;
  body: string;
  orderLineId?: string | null;
}): Promise<SalesActionResult<SalesOrderDetailView>> {
  try {
    const context = await requireSalesContext();
    const data = await createSalesOrderService().addOperationalNote(context, input);
    revalidateSale(input.orderId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function recordPhysicalDeliveryAction(input: {
  orderId: string;
  orderLineId: string;
  claimedQuantity: number;
  notes?: string | null;
  evidenceNote?: string | null;
}): Promise<SalesActionResult<SalesOrderDetailView>> {
  try {
    const context = await requireSalesContext();
    const data = await createDefaultSalesDeliveryService().recordPhysicalDelivery(
      context,
      input
    );
    revalidateSale(input.orderId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function inspectDeliveryAction(input: {
  orderId: string;
  deliveryEventId: string;
  acceptedQuantity: number;
  rejectedQuantity: number;
  comments?: string | null;
  rejectionReasonCode?: string | null;
  qualityFindingCode?: string | null;
  evidenceNote?: string | null;
}): Promise<SalesActionResult<SalesOrderDetailView>> {
  try {
    const context = await requireSalesContext();
    const data = await createDefaultSalesDeliveryService().inspectDelivery(
      context,
      input
    );
    revalidateSale(input.orderId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function startServiceDeliveryAction(input: {
  orderId: string;
  orderLineId: string;
  notes?: string | null;
}): Promise<SalesActionResult<SalesOrderDetailView>> {
  try {
    const context = await requireSalesContext();
    const data = await createDefaultSalesDeliveryService().startServiceDelivery(
      context,
      input
    );
    revalidateSale(input.orderId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function completeServiceDeliveryAction(input: {
  orderId: string;
  deliveryEventId?: string | null;
  orderLineId?: string | null;
  evidenceNote?: string | null;
  comments?: string | null;
}): Promise<SalesActionResult<SalesOrderDetailView>> {
  try {
    const context = await requireSalesContext();
    const data = await createDefaultSalesDeliveryService().completeServiceDelivery(
      context,
      input
    );
    revalidateSale(input.orderId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function requestSaleCancellationAction(input: {
  orderId: string;
  reasonCode: string;
  comments?: string | null;
}): Promise<SalesActionResult<SalesOrderDetailView>> {
  try {
    const context = await requireSalesContext();
    const data = await createDefaultSalesExceptionService().requestCancellation(
      context,
      input
    );
    revalidateSale(input.orderId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function approveSaleCancellationAction(
  orderId: string
): Promise<SalesActionResult<SalesOrderDetailView>> {
  try {
    const context = await requireSalesContext();
    const data = await createDefaultSalesExceptionService().approveCancellation(
      context,
      orderId
    );
    revalidateSale(orderId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function initiateSaleDispositionAction(input: {
  orderId: string;
  orderLineId: string;
  instructionType: string;
  quantity?: number;
  reasonCode: string;
  comments?: string | null;
}): Promise<SalesActionResult<SalesOrderDetailView>> {
  try {
    const context = await requireSalesContext();
    const data = await createDefaultSalesExceptionService().initiateLineDisposition(
      context,
      input
    );
    revalidateSale(input.orderId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function approveSaleDispositionAction(input: {
  orderId: string;
  instructionId: string;
}): Promise<SalesActionResult<SalesOrderDetailView>> {
  try {
    const context = await requireSalesContext();
    const data = await createDefaultSalesExceptionService().approveDisposition(
      context,
      input.orderId,
      input.instructionId
    );
    revalidateSale(input.orderId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function proposeSaleAmendmentAction(input: {
  orderId: string;
  orderLineId: string;
  quantity: number;
  reason: string;
}): Promise<SalesActionResult<SalesOrderDetailView>> {
  try {
    const context = await requireSalesContext();
    const sales = createSalesOrderService();
    const order = await sales.getOrder(context, input.orderId);
    const line = order.lines.find((item) => item.id === input.orderLineId);
    if (!line) {
      throw new SalesOrderError("ORDER_NOT_FOUND", undefined, 404);
    }
    const commercial = await sales.prepareCommercial(context, {
      customerPartyId: order.customerId,
      offeringId: line.offeringId,
      quantity: input.quantity,
      currencyCode: order.currencyCode,
    });
    const data = await createDefaultSalesExceptionService().proposeAmendment(context, {
      orderId: input.orderId,
      orderLineId: input.orderLineId,
      quantity: input.quantity,
      reason: input.reason,
      snapshot: commercial.snapshot,
      expected: commercial.expected,
    });
    revalidateSale(input.orderId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function approveSaleAmendmentAction(input: {
  orderId: string;
  amendmentId: string;
}): Promise<SalesActionResult<SalesOrderDetailView>> {
  try {
    const context = await requireSalesContext();
    const data = await createDefaultSalesExceptionService().approveAmendment(
      context,
      input.orderId,
      input.amendmentId
    );
    revalidateSale(input.orderId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
