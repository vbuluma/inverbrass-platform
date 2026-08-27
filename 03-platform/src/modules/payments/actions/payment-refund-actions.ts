"use server";

/**
 * Purpose:
 * Server actions for BP-007 IP-06 refunds and reversals.
 *
 * Implementation Package:
 * BP-007 / IP-06 – Refunds, Reversals & Adjustments
 */

import { revalidatePath } from "next/cache";

import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { PaymentObligationError } from "@/modules/payments/errors";
import { createPaymentRefundService } from "@/modules/payments/services/payment-refund-service";
import type {
  RefundDetailView,
  RefundEligibilityView,
} from "@/modules/payments/types";

export type RefundActionResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: { code: string; message: string; field?: string; entity?: string };
    };

async function requireRefundContext() {
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

function toActionError(error: unknown): RefundActionResult<never> {
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
    return {
      success: false,
      error: { code: error.code, message: error.message },
    };
  }
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "The refund could not be processed. Please try again.",
    },
  };
}

export async function getRefundEligibilityAction(
  paymentTransactionId: string
): Promise<RefundActionResult<RefundEligibilityView>> {
  try {
    const context = await requireRefundContext();
    const data = await createPaymentRefundService().getEligibility(
      context,
      paymentTransactionId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function requestRefundAction(input: {
  paymentTransactionId: string;
  amount?: string | null;
  refundType?: string | null;
  reason: string;
  confirmManual?: boolean;
}): Promise<RefundActionResult<RefundDetailView>> {
  try {
    const context = await requireRefundContext();
    const data = await createPaymentRefundService().requestRefund(context, input);
    revalidatePath(`/payments/transactions/${input.paymentTransactionId}`);
    revalidatePath(`/payments/${data.obligationId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function approveRefundAction(input: {
  refundId: string;
  decision: "APPROVE" | "REJECT";
  reason?: string | null;
}): Promise<RefundActionResult<RefundDetailView>> {
  try {
    const context = await requireRefundContext();
    const data = await createPaymentRefundService().approveRefund(context, input);
    revalidatePath(`/payments/transactions/${data.originalPaymentTransactionId}`);
    revalidatePath(`/payments/${data.obligationId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
