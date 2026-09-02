"use server";

/**
 * Purpose:
 * Server actions for BP-009 IP-10 procurement exceptions and controls.
 */

import { revalidatePath } from "next/cache";

import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { ProcurementError } from "@/modules/procurement";
import { requireProcurementChannelContext } from "@/modules/procurement/helpers/procurement-channel-context";
import { createExceptionService } from "@/modules/procurement/services/exception-service";
import type {
  AssignExceptionCommand,
  CreateExceptionCommand,
  ExceptionDecisionCommand,
  ExceptionListFilter,
  ExceptionListView,
  ExceptionTypeRecord,
  ExceptionView,
  ResolveExceptionCommand,
} from "@/modules/procurement/types";

export type ExceptionActionError = {
  code: string;
  message: string;
  field?: string;
};

export type ExceptionActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ExceptionActionError };

function toError(error: unknown): ExceptionActionError {
  if (error instanceof ProcurementError) {
    return { code: error.code, message: error.message, field: error.field };
  }
  if (isNextRedirectError(error)) {
    throw error;
  }
  return { code: "PROVIDER_ERROR", message: "This exception could not be completed." };
}

function revalidateExceptionPaths(exceptionId?: string) {
  revalidatePath("/procurement/exceptions");
  revalidatePath("/procurement");
  if (exceptionId) {
    revalidatePath(`/procurement/exceptions/${exceptionId}`);
  }
}

export async function listExceptionsAction(
  filter: ExceptionListFilter = {}
): Promise<ExceptionActionResult<ExceptionListView[]>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createExceptionService().list(context, actor, filter);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function listExceptionTypesAction(): Promise<
  ExceptionActionResult<ExceptionTypeRecord[]>
> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createExceptionService().listTypes(context, actor);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function getExceptionAction(
  exceptionId: string
): Promise<ExceptionActionResult<ExceptionView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createExceptionService().get(context, actor, exceptionId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function createExceptionAction(
  input: CreateExceptionCommand
): Promise<ExceptionActionResult<ExceptionView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createExceptionService().create(context, actor, input);
    revalidateExceptionPaths(data.id);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function assignExceptionAction(
  exceptionId: string,
  input: AssignExceptionCommand
): Promise<ExceptionActionResult<ExceptionView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createExceptionService().assign(context, actor, exceptionId, input);
    revalidateExceptionPaths(exceptionId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function startExceptionAction(
  exceptionId: string
): Promise<ExceptionActionResult<ExceptionView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createExceptionService().startProgress(context, actor, exceptionId);
    revalidateExceptionPaths(exceptionId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function resolveExceptionAction(
  exceptionId: string,
  input: ResolveExceptionCommand
): Promise<ExceptionActionResult<ExceptionView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createExceptionService().resolve(context, actor, exceptionId, input);
    revalidateExceptionPaths(exceptionId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function approveExceptionAction(
  exceptionId: string
): Promise<ExceptionActionResult<ExceptionView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createExceptionService().approveClose(context, actor, exceptionId);
    revalidateExceptionPaths(exceptionId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}

export async function cancelExceptionAction(
  exceptionId: string,
  input: ExceptionDecisionCommand
): Promise<ExceptionActionResult<ExceptionView>> {
  try {
    const { context, actor } = await requireProcurementChannelContext();
    const data = await createExceptionService().cancel(context, actor, exceptionId, input);
    revalidateExceptionPaths(exceptionId);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toError(error) };
  }
}
