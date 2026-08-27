"use server";

/**
 * Purpose:
 * Server actions for BP-007 IP-07 settlement tracking and handoff.
 *
 * Implementation Package:
 * BP-007 / IP-07 – Settlement & Reconciliation Handoff
 */

import { revalidatePath } from "next/cache";

import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
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

async function requireSettlementContext() {
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
