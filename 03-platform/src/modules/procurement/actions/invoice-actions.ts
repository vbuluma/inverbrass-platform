"use server";

/**
 * Purpose:
 * Server actions for BP-009 IP-09 supplier invoices and matching.
 */

import { revalidatePath } from "next/cache";

import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import {
  ALL_PROCUREMENT_PERMISSIONS,
  ProcurementError,
} from "@/modules/procurement";
import { createInvoiceService } from "@/modules/procurement/services/invoice-service";
import type {
  CreateSupplierInvoiceCommand,
  InvoiceDecisionCommand,
  InvoiceListView,
  InvoiceView,
  PaymentReadyListView,
  ProcurementActor,
} from "@/modules/procurement/types";

export type InvoiceActionError = {
  code: string;
  message: string;
  field?: string;
};

export type InvoiceActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: InvoiceActionError };

async function requireContext() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  if (!user) {
    throw new ProcurementError("SESSION_REQUIRED", undefined, 401);
  }
  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();
  if (!context) {
    throw new ProcurementError("BUSINESS_CONTEXT_REQUIRED", undefined, 403);
  }
  return {
    context,
    actor: { userId: user.platformUserId, permissions: ALL_PROCUREMENT_PERMISSIONS },
  };
}

function toError(error: unknown): InvoiceActionError {
  if (error instanceof ProcurementError) {
    return { code: error.code, message: error.message, field: error.field };
  }
  if (isNextRedirectError(error)) {
    throw error;
  }
  return { code: "PROVIDER_ERROR", message: "Supplier invoice could not be completed." };
}

export async function listInvoicesAction(): Promise<InvoiceActionResult<InvoiceListView[]>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createInvoiceService().list(context, actor);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function listPaymentReadyInvoicesAction(): Promise<
  InvoiceActionResult<PaymentReadyListView[]>
> {
  try {
    const { context, actor } = await requireContext();
    const data = await createInvoiceService().listPaymentReady(context, actor);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function getInvoiceAction(
  invoiceId: string
): Promise<InvoiceActionResult<InvoiceView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createInvoiceService().get(context, actor, invoiceId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function createInvoiceAction(
  input: CreateSupplierInvoiceCommand
): Promise<InvoiceActionResult<InvoiceView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createInvoiceService().create(context, actor, input);
    revalidatePath("/procurement/invoices");
    if (input.purchaseOrderId) {
      revalidatePath(`/procurement/orders/${input.purchaseOrderId}`);
    }
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function captureInvoiceAction(
  invoiceId: string
): Promise<InvoiceActionResult<InvoiceView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createInvoiceService().capture(context, actor, invoiceId);
    revalidatePath("/procurement/invoices");
    revalidatePath(`/procurement/invoices/${invoiceId}`);
    if (data.purchaseOrderId) {
      revalidatePath(`/procurement/orders/${data.purchaseOrderId}`);
    }
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function runInvoiceMatchAction(
  invoiceId: string
): Promise<InvoiceActionResult<InvoiceView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createInvoiceService().runMatch(context, actor, invoiceId);
    revalidatePath(`/procurement/invoices/${invoiceId}`);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function approveInvoiceAction(
  invoiceId: string
): Promise<InvoiceActionResult<InvoiceView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createInvoiceService().approve(context, actor, invoiceId);
    revalidatePath("/procurement/invoices");
    revalidatePath("/procurement/invoices/payment-ready");
    revalidatePath(`/procurement/invoices/${invoiceId}`);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function rejectInvoiceAction(
  invoiceId: string,
  input: InvoiceDecisionCommand
): Promise<InvoiceActionResult<InvoiceView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createInvoiceService().reject(context, actor, invoiceId, input);
    revalidatePath("/procurement/invoices");
    revalidatePath(`/procurement/invoices/${invoiceId}`);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}
