"use server";

/**
 * Purpose:
 * Server actions for BP-007 IP-08 payment exception operations.
 *
 * Implementation Package:
 * BP-007 / IP-08 – Payment Exceptions, Operations & Controls
 */

import { revalidatePath } from "next/cache";

import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { PaymentObligationError } from "@/modules/payments/errors";
import { createPaymentInitiationService } from "@/modules/payments/services/payment-initiation-service";
import {
  PaymentExceptionService,
  createDefaultPaymentExceptionDependencies,
} from "@/modules/payments/services/payment-exception-service";
import type {
  PaymentExceptionDashboardView,
  PaymentExceptionDetailView,
  PaymentExceptionListFilter,
  PaymentExceptionView,
  PaymentInitiationResult,
} from "@/modules/payments/types";

export type ExceptionActionResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: { code: string; message: string; field?: string; entity?: string };
    };

async function requireExceptionContext() {
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

function createExceptionOperations() {
  const payments = createPaymentInitiationService();
  const exceptions = new PaymentExceptionService({
    ...createDefaultPaymentExceptionDependencies(),
    outcomes: payments,
  });
  return { payments, exceptions };
}

function toActionError(error: unknown): ExceptionActionResult<never> {
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
      message: "This payment review could not be completed. Please try again.",
    },
  };
}

function revalidateException(paths: {
  exceptionId?: string;
  paymentTransactionId?: string;
  obligationId?: string;
}) {
  revalidatePath("/payments/exceptions");
  if (paths.exceptionId) {
    revalidatePath(`/payments/exceptions/${paths.exceptionId}`);
  }
  if (paths.paymentTransactionId) {
    revalidatePath(`/payments/transactions/${paths.paymentTransactionId}`);
  }
  if (paths.obligationId) {
    revalidatePath(`/payments/${paths.obligationId}`);
  }
}

export async function getExceptionDashboardAction(
  filter?: PaymentExceptionListFilter
): Promise<ExceptionActionResult<PaymentExceptionDashboardView>> {
  try {
    const context = await requireExceptionContext();
    const data = await createExceptionOperations().exceptions.listDashboard(context, filter);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getPaymentExceptionAction(
  exceptionId: string
): Promise<ExceptionActionResult<PaymentExceptionDetailView>> {
  try {
    const context = await requireExceptionContext();
    const data = await createExceptionOperations().exceptions.getException(context, exceptionId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listExceptionsForTransactionAction(
  paymentTransactionId: string
): Promise<ExceptionActionResult<PaymentExceptionView[]>> {
  try {
    const context = await requireExceptionContext();
    const data = await createExceptionOperations().exceptions.listForTransaction(
      context,
      paymentTransactionId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function startExceptionInvestigationAction(
  exceptionId: string
): Promise<ExceptionActionResult<PaymentExceptionDetailView>> {
  try {
    const context = await requireExceptionContext();
    const data = await createExceptionOperations().exceptions.startInvestigation(
      context,
      exceptionId
    );
    revalidateException({
      exceptionId: data.id,
      paymentTransactionId: data.paymentTransactionId,
      obligationId: data.obligationId,
    });
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function queryExceptionProviderAction(
  paymentTransactionId: string
): Promise<ExceptionActionResult<PaymentExceptionDetailView | null>> {
  try {
    const context = await requireExceptionContext();
    const data = await createExceptionOperations().exceptions.queryProvider(
      context,
      paymentTransactionId
    );
    revalidateException({
      exceptionId: data?.id,
      paymentTransactionId,
      obligationId: data?.obligationId,
    });
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function retryExceptionPaymentAction(input: {
  paymentTransactionId: string;
  idempotencyKey?: string | null;
}): Promise<ExceptionActionResult<PaymentInitiationResult>> {
  try {
    const context = await requireExceptionContext();
    const data = await createExceptionOperations().exceptions.retryPayment(
      context,
      input.paymentTransactionId,
      input.idempotencyKey
    );
    revalidateException({
      paymentTransactionId: input.paymentTransactionId,
      obligationId: data.obligation.id,
    });
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function resolvePaymentExceptionAction(input: {
  exceptionId: string;
  resolutionCode: string;
  notes?: string | null;
  evidence?: string | null;
}): Promise<ExceptionActionResult<PaymentExceptionDetailView>> {
  try {
    const context = await requireExceptionContext();
    const data = await createExceptionOperations().exceptions.resolve(context, input);
    revalidateException({
      exceptionId: data.id,
      paymentTransactionId: data.paymentTransactionId,
      obligationId: data.obligationId,
    });
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function approvePaymentExceptionAction(input: {
  exceptionId: string;
  decision: "APPROVE" | "REJECT";
  notes?: string | null;
}): Promise<ExceptionActionResult<PaymentExceptionDetailView>> {
  try {
    const context = await requireExceptionContext();
    const data = await createExceptionOperations().exceptions.approve(context, input);
    revalidateException({
      exceptionId: data.id,
      paymentTransactionId: data.paymentTransactionId,
      obligationId: data.obligationId,
    });
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function closePaymentExceptionAction(
  exceptionId: string
): Promise<ExceptionActionResult<PaymentExceptionDetailView>> {
  try {
    const context = await requireExceptionContext();
    const data = await createExceptionOperations().exceptions.closeException(
      context,
      exceptionId
    );
    revalidateException({
      exceptionId: data.id,
      paymentTransactionId: data.paymentTransactionId,
      obligationId: data.obligationId,
    });
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
