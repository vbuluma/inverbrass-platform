"use server";

/**
 * Purpose:
 * Server actions for BP-007 IP-04 billing and invoicing.
 *
 * Implementation Package:
 * BP-007 / IP-04 – Billing, Invoicing & Credit Sales
 */

import { requirePaymentChannelContext as requireInvoiceContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import { revalidatePath } from "next/cache";

import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { PaymentObligationError } from "@/modules/payments/errors";
import { createPaymentInvoiceService } from "@/modules/payments/services/payment-invoice-service";
import type {
  InvoiceDashboardView,
  InvoiceDetailView,
  InvoicePaymentTermRecord,
  InvoiceView,
} from "@/modules/payments/types";

export type InvoiceActionResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: { code: string; message: string; field?: string; entity?: string };
    };


function toActionError(error: unknown): InvoiceActionResult<never> {
  if (isNextRedirectError(error)) {
    throw error;
  }
  if (error instanceof PaymentObligationError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        field: error.field,
        entity: error.entity,
      },
    };
  }
  if (error instanceof AuthError) {
    return { success: false, error: { code: error.code, message: error.message } };
  }
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "The invoice could not be saved. Please try again.",
    },
  };
}

function revalidateInvoice(data: InvoiceDetailView) {
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${data.id}`);
  revalidatePath(`/payments/${data.obligationId}`);
  revalidatePath("/payments");
}

export async function getInvoiceDashboardAction(): Promise<
  InvoiceActionResult<InvoiceDashboardView>
> {
  try {
    const context = await requireInvoiceContext();
    const data = await createPaymentInvoiceService().getDashboard(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getInvoiceDetailAction(
  invoiceId: string
): Promise<InvoiceActionResult<InvoiceDetailView>> {
  try {
    const context = await requireInvoiceContext();
    const data = await createPaymentInvoiceService().getInvoice(context, invoiceId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getInvoicesForObligationAction(
  obligationId: string
): Promise<
  InvoiceActionResult<{ invoices: InvoiceView[]; paymentTerms: InvoicePaymentTermRecord[] }>
> {
  try {
    const context = await requireInvoiceContext();
    const data = await createPaymentInvoiceService().listForObligation(
      context,
      obligationId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createInvoiceAction(input: {
  obligationId: string;
  paymentTermCode: string;
  idempotencyKey?: string;
}): Promise<InvoiceActionResult<InvoiceDetailView>> {
  try {
    const context = await requireInvoiceContext();
    const data = await createPaymentInvoiceService().createInvoice(context, input);
    revalidateInvoice(data);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function issueInvoiceAction(input: {
  invoiceId: string;
  idempotencyKey?: string;
}): Promise<InvoiceActionResult<InvoiceDetailView>> {
  try {
    const context = await requireInvoiceContext();
    const data = await createPaymentInvoiceService().issueInvoice(context, input);
    revalidateInvoice(data);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function cancelInvoiceAction(input: {
  invoiceId: string;
  reason: string;
  idempotencyKey?: string;
}): Promise<InvoiceActionResult<InvoiceDetailView>> {
  try {
    const context = await requireInvoiceContext();
    const data = await createPaymentInvoiceService().cancelInvoice(context, input);
    revalidateInvoice(data);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
