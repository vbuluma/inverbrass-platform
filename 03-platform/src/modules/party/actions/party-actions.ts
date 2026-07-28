"use server";

/**
 * Purpose:
 * Expose Party Foundation server actions to the App Router UI.
 *
 * Architecture:
 * UI → Server Actions → Services → Repositories → Drizzle → PostgreSQL
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { PartyError } from "@/modules/party/errors";
import { createIndividualProfileService } from "@/modules/party/services/individual-profile-service";
import { createOrganizationProfileService } from "@/modules/party/services/organization-profile-service";
import { createPartyService } from "@/modules/party/services/party-service";
import type {
  PartyDashboardView,
  PartyDetailView,
  PartyRegistrationCatalogues,
  PartySummaryView,
  RegisterIndividualPayload,
  RegisterOrganizationPayload,
  UpdatePartyOverviewPayload,
} from "@/modules/party/types";

function isNextDynamicServerError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).includes("DYNAMIC_SERVER_USAGE")
  );
}

async function requirePartyContext() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();

  if (!user) {
    throw new PartyError(
      "SESSION_REQUIRED",
      "Your session has expired. Please sign in again.",
      401
    );
  }

  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();

  if (!context) {
    throw new PartyError(
      "BUSINESS_CONTEXT_REQUIRED",
      "Select a business before managing parties.",
      403
    );
  }

  return context;
}

function toActionError(error: unknown): AuthActionResult<never> {
  if (isNextRedirectError(error) || isNextDynamicServerError(error)) {
    throw error;
  }

  if (error instanceof PartyError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.field ? { field: error.field } : {}),
      },
    };
  }

  if (error instanceof AuthError) {
    return {
      success: false,
      error: { code: error.code, message: error.message },
    };
  }

  console.error("[party-actions] Unexpected error", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "We could not complete that Party action. Please try again.",
    },
  };
}

export async function getPartyDashboardAction(): Promise<
  AuthActionResult<PartyDashboardView>
> {
  try {
    const context = await requirePartyContext();
    const service = createPartyService();
    const data = await service.getDashboard(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listPartiesAction(): Promise<
  AuthActionResult<PartySummaryView[]>
> {
  try {
    const context = await requirePartyContext();
    const service = createPartyService();
    const data = await service.listParties(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getPartyAction(
  partyId: string
): Promise<AuthActionResult<PartyDetailView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyService();
    const data = await service.getParty(context, partyId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getPartyRegistrationCataloguesAction(): Promise<
  AuthActionResult<PartyRegistrationCatalogues>
> {
  try {
    await requirePartyContext();
    const service = createPartyService();
    const data = await service.getRegistrationCatalogues();
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createIndividualPartyAction(
  payload: RegisterIndividualPayload
): Promise<AuthActionResult<PartyDetailView>> {
  try {
    const context = await requirePartyContext();
    const service = createIndividualProfileService();
    const data = await service.registerIndividual(context, payload);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createOrganizationPartyAction(
  payload: RegisterOrganizationPayload
): Promise<AuthActionResult<PartyDetailView>> {
  try {
    const context = await requirePartyContext();
    const service = createOrganizationProfileService();
    const data = await service.registerOrganization(context, payload);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updatePartyAction(
  partyId: string,
  payload: UpdatePartyOverviewPayload
): Promise<AuthActionResult<PartyDetailView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyService();
    const data = await service.updateOverview(context, partyId, payload);
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function activatePartyAction(
  partyId: string
): Promise<AuthActionResult<PartyDetailView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyService();
    const data = await service.activateParty(context, partyId);
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function suspendPartyAction(
  partyId: string
): Promise<AuthActionResult<PartyDetailView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyService();
    const data = await service.suspendParty(context, partyId);
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function archivePartyAction(
  partyId: string
): Promise<AuthActionResult<PartyDetailView>> {
  try {
    const context = await requirePartyContext();
    const service = createPartyService();
    const data = await service.archiveParty(context, partyId);
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
