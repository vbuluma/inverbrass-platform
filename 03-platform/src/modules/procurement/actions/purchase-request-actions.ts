"use server";

/**
 * Purpose:
 * Server actions for BP-009 IP-02 purchase requests and approval.
 */

import { revalidatePath } from "next/cache";

import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import {
  ALL_PROCUREMENT_PERMISSIONS,
  ProcurementError,
} from "@/modules/procurement";
import { createPurchaseRequestService } from "@/modules/procurement/services/purchase-request-service";
import type {
  AttachPurchaseRequestDocumentCommand,
  CreatePurchaseRequestCommand,
  ProcurementActor,
  PurchaseRequestDecisionCommand,
  PurchaseRequestListFilter,
  PurchaseRequestListView,
  PurchaseRequestView,
  UpdatePurchaseRequestCommand,
} from "@/modules/procurement/types";

export type PurchaseRequestActionError = {
  code: string;
  message: string;
  field?: string;
};

export type PurchaseRequestActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: PurchaseRequestActionError };

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
  const actor: ProcurementActor = {
    userId: user.platformUserId,
    permissions: ALL_PROCUREMENT_PERMISSIONS,
  };
  return { context, actor };
}

function toActionError(error: unknown): PurchaseRequestActionResult<never> {
  if (isNextRedirectError(error)) {
    throw error;
  }
  if (error instanceof ProcurementError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        field: error.field,
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
      message: "The purchase request could not be saved. Please try again.",
    },
  };
}

function revalidateRequest(id?: string) {
  revalidatePath("/procurement");
  revalidatePath("/procurement/requests");
  if (id) {
    revalidatePath(`/procurement/requests/${id}`);
  }
}

export async function listPurchaseRequestsAction(
  filter: PurchaseRequestListFilter = {}
): Promise<PurchaseRequestActionResult<PurchaseRequestListView[]>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createPurchaseRequestService().list(context, actor, filter);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getPurchaseRequestAction(
  requestId: string
): Promise<PurchaseRequestActionResult<PurchaseRequestView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createPurchaseRequestService().get(context, actor, requestId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createPurchaseRequestAction(
  input: CreatePurchaseRequestCommand
): Promise<PurchaseRequestActionResult<PurchaseRequestView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createPurchaseRequestService().create(context, actor, input);
    revalidateRequest(data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updatePurchaseRequestAction(
  requestId: string,
  input: UpdatePurchaseRequestCommand
): Promise<PurchaseRequestActionResult<PurchaseRequestView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createPurchaseRequestService().update(
      context,
      actor,
      requestId,
      input
    );
    revalidateRequest(requestId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function attachPurchaseRequestDocumentAction(
  requestId: string,
  input: AttachPurchaseRequestDocumentCommand
): Promise<PurchaseRequestActionResult<PurchaseRequestView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createPurchaseRequestService().attachDocument(
      context,
      actor,
      requestId,
      input
    );
    revalidateRequest(requestId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function submitPurchaseRequestAction(
  requestId: string
): Promise<PurchaseRequestActionResult<PurchaseRequestView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createPurchaseRequestService().submit(context, actor, requestId);
    revalidateRequest(requestId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function approvePurchaseRequestAction(
  requestId: string
): Promise<PurchaseRequestActionResult<PurchaseRequestView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createPurchaseRequestService().approve(context, actor, requestId);
    revalidateRequest(requestId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectPurchaseRequestAction(
  requestId: string,
  input: PurchaseRequestDecisionCommand
): Promise<PurchaseRequestActionResult<PurchaseRequestView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createPurchaseRequestService().reject(
      context,
      actor,
      requestId,
      input
    );
    revalidateRequest(requestId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function returnPurchaseRequestAction(
  requestId: string,
  input: PurchaseRequestDecisionCommand
): Promise<PurchaseRequestActionResult<PurchaseRequestView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createPurchaseRequestService().returnRequest(
      context,
      actor,
      requestId,
      input
    );
    revalidateRequest(requestId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function cancelPurchaseRequestAction(
  requestId: string,
  input: PurchaseRequestDecisionCommand = {}
): Promise<PurchaseRequestActionResult<PurchaseRequestView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createPurchaseRequestService().cancel(
      context,
      actor,
      requestId,
      input
    );
    revalidateRequest(requestId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
