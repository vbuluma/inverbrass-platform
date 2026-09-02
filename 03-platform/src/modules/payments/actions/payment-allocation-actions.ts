"use server";

/**
 * Purpose:
 * Server actions for BP-007 IP-03 payment allocation.
 *
 * Implementation Package:
 * BP-007 / IP-03 – Partial, Split Payment & Allocation
 */

import { requirePaymentChannelContext as requirePaymentContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import { revalidatePath } from "next/cache";

import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { PaymentObligationError } from "@/modules/payments/errors";
import { createPaymentAllocationService } from "@/modules/payments/services/payment-allocation-service";
import type { PaymentAllocationResult } from "@/modules/payments/types";

export type PaymentActionResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: { code: string; message: string; field?: string; entity?: string };
    };


function toActionError(error: unknown): PaymentActionResult<never> {
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
    error: { code: "PROVIDER_ERROR", message: "The payment could not be applied. Please try again." },
  };
}

export async function allocatePaymentAction(input: {
  paymentTransactionId: string;
  obligationId?: string;
  amount?: string;
  idempotencyKey?: string;
  reason?: string;
}): Promise<PaymentActionResult<PaymentAllocationResult>> {
  try {
    const context = await requirePaymentContext();
    const data = await createPaymentAllocationService().allocate(context, input);
    revalidatePath("/payments");
    revalidatePath(`/payments/${data.obligation.id}`);
    revalidatePath(`/payments/transactions/${data.transaction.id}`);
    revalidatePath("/invoices");
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function adjustAllocationAction(input: {
  allocationId: string;
  reason: string;
  idempotencyKey?: string;
}): Promise<PaymentActionResult<PaymentAllocationResult>> {
  try {
    const context = await requirePaymentContext();
    const data = await createPaymentAllocationService().adjustAllocation(context, input);
    revalidatePath("/payments");
    revalidatePath(`/payments/${data.obligation.id}`);
    revalidatePath(`/payments/transactions/${data.transaction.id}`);
    revalidatePath("/invoices");
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
