"use server";

/**
 * Purpose:
 * Server actions for BP-007 IP-07 settlement tracking and handoff.
 *
 * Implementation Package:
 * BP-007 / IP-07 – Settlement & Reconciliation Handoff
 */

import { requirePaymentChannelContext as requireSettlementContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import { revalidatePath } from "next/cache";

import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { PaymentObligationError } from "@/modules/payments/errors";
import { createPaymentSettlementService } from "@/modules/payments/services/payment-settlement-service";
import type {
  ReconciliationHandoffPayload,
  SettlementView,
} from "@/modules/payments/types";

export type SettlementActionResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: { code: string; message: string; field?: string; entity?: string };
    };


function toActionError(error: unknown): SettlementActionResult<never> {
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
      message: "Settlement details could not be loaded. Please try again.",
    },
  };
}

export async function getSettlementForTransactionAction(
  paymentTransactionId: string
): Promise<SettlementActionResult<SettlementView | null>> {
  try {
    const context = await requireSettlementContext();
    const data = await createPaymentSettlementService().getByTransaction(
      context,
      paymentTransactionId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function refreshSettlementAction(
  paymentTransactionId: string
): Promise<SettlementActionResult<SettlementView>> {
  try {
    const context = await requireSettlementContext();
    const data = await createPaymentSettlementService().refreshFromEngine(
      context,
      paymentTransactionId
    );
    revalidatePath(`/payments/transactions/${paymentTransactionId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getReconciliationHandoffAction(
  paymentTransactionId: string
): Promise<SettlementActionResult<ReconciliationHandoffPayload>> {
  try {
    const context = await requireSettlementContext();
    const data = await createPaymentSettlementService().getReconciliationHandoff(
      context,
      paymentTransactionId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
