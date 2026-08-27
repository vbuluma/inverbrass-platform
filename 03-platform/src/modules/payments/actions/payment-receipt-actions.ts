"use server";

/**
 * Purpose:
 * Server actions for BP-007 IP-05 receipting and payment evidence.
 *
 * Implementation Package:
 * BP-007 / IP-05 – Receipting & Payment Evidence
 */

import { revalidatePath } from "next/cache";

import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { PaymentObligationError } from "@/modules/payments/errors";
import { createPaymentReceiptService } from "@/modules/payments/services/payment-receipt-service";
import type {
  ReceiptDashboardView,
  ReceiptDetailView,
} from "@/modules/payments/types";

export type ReceiptActionResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: { code: string; message: string; field?: string; entity?: string };
    };

async function requireReceiptContext() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  if (!user) {
    throw new PaymentObligationError("SESSION_REQUIRED", undefined, 401);
  }
  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();
  if (!context) {
    throw new PaymentObligationError("BUSINESS_CONTEXT_REQUIRED", undefined, 403);
  }
  return context;
}

function toActionError(error: unknown): ReceiptActionResult<never> {
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
      message: "The receipt could not be opened. Please try again.",
    },
  };
}

function revalidateReceipt(data: ReceiptDetailView) {
  revalidatePath("/receipts");
  revalidatePath(`/receipts/${data.id}`);
  revalidatePath(`/payments/transactions/${data.paymentTransactionId}`);
  revalidatePath(`/payments/${data.obligationId}`);
}

export async function getReceiptDashboardAction(): Promise<
  ReceiptActionResult<ReceiptDashboardView>
> {
  try {
    const context = await requireReceiptContext();
    const data = await createPaymentReceiptService().getDashboard(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getReceiptDetailAction(
  receiptId: string
): Promise<ReceiptActionResult<ReceiptDetailView>> {
  try {
    const context = await requireReceiptContext();
    const data = await createPaymentReceiptService().getReceipt(context, receiptId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getReceiptForTransactionAction(
  paymentTransactionId: string
): Promise<ReceiptActionResult<ReceiptDetailView | null>> {
  try {
    const context = await requireReceiptContext();
    const data = await createPaymentReceiptService().getByTransaction(
      context,
      paymentTransactionId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function issueReceiptAction(input: {
  paymentTransactionId: string;
  idempotencyKey?: string;
}): Promise<ReceiptActionResult<ReceiptDetailView>> {
  try {
    const context = await requireReceiptContext();
    const data = await createPaymentReceiptService().issueReceipt(context, input);
    revalidateReceipt(data);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deliverReceiptAction(input: {
  receiptId: string;
  channel: string;
  recipientHint?: string;
}): Promise<ReceiptActionResult<ReceiptDetailView>> {
  try {
    const context = await requireReceiptContext();
    const data = await createPaymentReceiptService().requestDelivery(context, input);
    revalidateReceipt(data);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
