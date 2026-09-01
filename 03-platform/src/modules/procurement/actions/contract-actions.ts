"use server";

/**
 * Purpose:
 * Server actions for BP-009 IP-07 contracts.
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
import { createContractService } from "@/modules/procurement/services/contract-service";
import { createPurchaseOrderService } from "@/modules/procurement/services/purchase-order-service";
import type {
  ActivateContractCommand,
  AmendContractCommand,
  ContractDecisionCommand,
  ContractListFilter,
  ContractListView,
  ContractView,
  CreateContractCallOffCommand,
  CreateContractCommand,
  GenerateContractFromAwardCommand,
  GenerateContractFromPurchaseRequestCommand,
  ProcurementActor,
  PurchaseOrderView,
  RenewContractCommand,
} from "@/modules/procurement/types";

export type ContractActionError = {
  code: string;
  message: string;
  field?: string;
};

export type ContractActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ContractActionError };

function createServices() {
  return { contracts: createContractService() };
}

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

function toActionError(error: unknown): ContractActionResult<never> {
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
      message: "The contract could not be processed. Please try again.",
    },
  };
}

export async function listContractsAction(
  filter: ContractListFilter = {}
): Promise<ContractActionResult<ContractListView[]>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createServices().contracts.list(context, actor, filter);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getContractAction(
  contractId: string
): Promise<ContractActionResult<ContractView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createServices().contracts.get(context, actor, contractId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createContractAction(
  input: CreateContractCommand
): Promise<ContractActionResult<ContractView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createServices().contracts.create(context, actor, input);
    revalidatePath("/procurement/contracts");
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function generateContractFromAwardAction(
  input: GenerateContractFromAwardCommand
): Promise<ContractActionResult<ContractView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createServices().contracts.generateFromAward(context, actor, input);
    revalidatePath("/procurement/contracts");
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function submitContractAction(
  contractId: string
): Promise<ContractActionResult<ContractView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createServices().contracts.submit(context, actor, contractId);
    revalidatePath(`/procurement/contracts/${contractId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function approveContractAction(
  contractId: string
): Promise<ContractActionResult<ContractView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createServices().contracts.approve(context, actor, contractId);
    revalidatePath(`/procurement/contracts/${contractId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectContractAction(
  contractId: string,
  input: ContractDecisionCommand
): Promise<ContractActionResult<ContractView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createServices().contracts.reject(context, actor, contractId, input);
    revalidatePath(`/procurement/contracts/${contractId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function activateContractAction(
  contractId: string,
  input: ActivateContractCommand = {}
): Promise<ContractActionResult<ContractView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createServices().contracts.activate(context, actor, contractId, input);
    revalidatePath(`/procurement/contracts/${contractId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function amendContractAction(
  contractId: string,
  input: AmendContractCommand
): Promise<ContractActionResult<ContractView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createServices().contracts.amend(context, actor, contractId, input);
    revalidatePath(`/procurement/contracts/${contractId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createContractCallOffAction(
  contractId: string,
  input: CreateContractCallOffCommand
): Promise<ContractActionResult<PurchaseOrderView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createServices().contracts.createCallOff(context, actor, contractId, input);
    revalidatePath(`/procurement/contracts/${contractId}`);
    revalidatePath("/procurement/orders");
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function suspendContractAction(
  contractId: string,
  input: ContractDecisionCommand
): Promise<ContractActionResult<ContractView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createServices().contracts.suspend(context, actor, contractId, input);
    revalidatePath(`/procurement/contracts/${contractId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function terminateContractAction(
  contractId: string,
  input: ContractDecisionCommand
): Promise<ContractActionResult<ContractView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createServices().contracts.terminate(context, actor, contractId, input);
    revalidatePath(`/procurement/contracts/${contractId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function closeContractAction(
  contractId: string,
  input: ContractDecisionCommand = {}
): Promise<ContractActionResult<ContractView>> {
  try {
    const { context, actor } = await requireContext();
    const data = await createServices().contracts.close(context, actor, contractId, input);
    revalidatePath(`/procurement/contracts/${contractId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
