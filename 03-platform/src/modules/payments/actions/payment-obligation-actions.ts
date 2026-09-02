"use server";

/**
 * Purpose:
 * Server actions for BP-007 IP-01 payment-obligation foundation.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

import { requirePaymentChannelContext as requirePaymentContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { PaymentObligationError } from "@/modules/payments/errors";
import { createPaymentObligationService } from "@/modules/payments/services/payment-obligation-service";
import { createPaymentAllocationService } from "@/modules/payments/services/payment-allocation-service";
import type {
  PaymentDashboardView,
  PaymentObligationDetailView,
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
      message: "The payment details could not be saved. Please try again.",
    },
  };
}

export async function getPaymentsDashboardAction(): Promise<
  AuthActionResult<PaymentDashboardView>
> {
  try {
    const context = await requirePaymentContext();
    const data = await createPaymentObligationService().getDashboard(context);
    const snapshot = await createPaymentAllocationService().operationalSnapshot(
      context.businessId
    );
    return { success: true, data: { ...data, ...snapshot } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getPaymentObligationAction(
  obligationId: string
): Promise<PaymentActionResult<PaymentObligationDetailView>> {
  try {
    const context = await requirePaymentContext();
    const data = await createPaymentObligationService().getObligation(
      context,
      obligationId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createPaymentObligationAction(input: {
  orderId: string;
  idempotencyKey?: string;
}): Promise<PaymentActionResult<PaymentObligationDetailView>> {
  try {
    const context = await requirePaymentContext();
    const data = await createPaymentObligationService().createObligation(context, {
      orderId: input.orderId,
      idempotencyKey: input.idempotencyKey,
    });
    revalidatePath("/payments");
    revalidatePath(`/payments/${data.id}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
