"use server";

/**
 * Purpose:
 * Server actions for stock reservations, availability, and sales deduction.
 *
 * Implementation Package:
 * BP-008 / IP-03 – Stock Reservation & Sales Deduction
 */

import { requireInventoryChannelContext as requireInventoryContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import { revalidatePath } from "next/cache";

import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { InventoryError } from "@/modules/inventory/errors";
import { createStockReservationService } from "@/modules/inventory/services/stock-reservation-service";
import type {
  CreateReservationCommand,
  FulfilReservationCommand,
  InventoryAvailabilityView,
  InventoryReservationView,
} from "@/modules/inventory/types";

export type InventoryReservationActionError = {
  code: string;
  message: string;
  field?: string;
};

export type InventoryReservationActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: InventoryReservationActionError };


function toActionError(error: unknown): InventoryReservationActionResult<never> {
  if (isNextRedirectError(error)) {
    throw error;
  }
  if (error instanceof InventoryError) {
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
      message: "The inventory details could not be saved. Please try again.",
    },
  };
}

function revalidateReservationPaths(reservationId?: string) {
  revalidatePath("/inventory");
  revalidatePath("/inventory/availability");
  revalidatePath("/inventory/reservations");
  if (reservationId) {
    revalidatePath(`/inventory/reservations/${reservationId}`);
  }
}

export async function listAvailabilityAction(): Promise<
  InventoryReservationActionResult<InventoryAvailabilityView[]>
> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReservationService().listAvailability(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listReservationsAction(): Promise<
  InventoryReservationActionResult<InventoryReservationView[]>
> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReservationService().listReservations(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getReservationAction(
  reservationId: string
): Promise<InventoryReservationActionResult<InventoryReservationView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReservationService().getReservation(context, reservationId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createReservationAction(
  command: CreateReservationCommand
): Promise<InventoryReservationActionResult<InventoryReservationView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReservationService().createReservation(context, command);
    revalidateReservationPaths(data.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function approveReservationAction(
  reservationId: string
): Promise<InventoryReservationActionResult<InventoryReservationView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReservationService().approveReservation(context, reservationId);
    revalidateReservationPaths(reservationId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectReservationAction(
  reservationId: string,
  reason: string
): Promise<InventoryReservationActionResult<InventoryReservationView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReservationService().rejectReservation(
      context,
      reservationId,
      reason
    );
    revalidateReservationPaths(reservationId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function releaseReservationAction(
  reservationId: string
): Promise<InventoryReservationActionResult<InventoryReservationView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReservationService().releaseReservation(context, reservationId);
    revalidateReservationPaths(reservationId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function fulfilReservationAction(
  reservationId: string,
  command: FulfilReservationCommand
): Promise<InventoryReservationActionResult<InventoryReservationView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createStockReservationService().fulfilReservation(
      context,
      reservationId,
      command
    );
    revalidateReservationPaths(reservationId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
