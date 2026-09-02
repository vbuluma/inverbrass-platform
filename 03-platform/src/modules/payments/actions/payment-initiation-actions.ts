"use server";

/**
 * Purpose:
 * Server actions for BP-007 IP-02 payment initiation and processing.
 * Provider callbacks are not accepted here.
 *
 * Implementation Package:
 * BP-007 / IP-02 – Payment Initiation & Processing
 */

import { requirePaymentChannelContext as requirePaymentContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import { revalidatePath } from "next/cache";

import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { PaymentObligationError } from "@/modules/payments/errors";
import { createPaymentInitiationService } from "@/modules/payments/services/payment-initiation-service";
import type {
  PaymentInitiationResult,
  PaymentObligationDetailView,
  PaymentTransactionView,
} from "@/modules/payments/types";

export type PaymentActionError = {
  code: string;
  message: string;
  field?: string;
  entity?: string;
  nextAction?: string;
};

export type PaymentActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: PaymentActionError };


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
      message: "The payment could not be completed. Please try again.",
    },
  };
}

export async function getPaymentObligationDetailAction(
  obligationId: string
): Promise<PaymentActionResult<PaymentObligationDetailView>> {
  try {
    const context = await requirePaymentContext();
    const data = await createPaymentInitiationService().getObligationDetail(
      context,
      obligationId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getPaymentTransactionAction(
  transactionId: string
): Promise<PaymentActionResult<PaymentTransactionView>> {
  try {
    const context = await requirePaymentContext();
    const data = await createPaymentInitiationService().getTransaction(
      context,
      transactionId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function initiatePaymentAction(input: {
  obligationId: string;
  methodId: string;
  amount?: string;
  currency?: string;
  idempotencyKey?: string;
  confirmManual?: boolean;
}): Promise<PaymentActionResult<PaymentInitiationResult>> {
  try {
    const context = await requirePaymentContext();
    const data = await createPaymentInitiationService().initiatePayment(context, input);
    revalidatePath("/payments");
    revalidatePath(`/payments/${data.obligation.id}`);
    revalidatePath(`/payments/transactions/${data.transaction.id}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function refreshPaymentStatusAction(
  transactionId: string
): Promise<PaymentActionResult<PaymentInitiationResult>> {
  try {
    const context = await requirePaymentContext();
    const data = await createPaymentInitiationService().refreshPaymentStatus(
      context,
      transactionId
    );
    revalidatePath("/payments");
    revalidatePath(`/payments/${data.obligation.id}`);
    revalidatePath(`/payments/transactions/${data.transaction.id}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
