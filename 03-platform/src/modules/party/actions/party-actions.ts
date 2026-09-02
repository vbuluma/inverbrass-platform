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

import { requirePartyChannelContext as requirePartyContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import {
  platformError,
  platformSuccess,
} from "@/core/platform/platform-action-helpers";
import {
  individualCreatedNextActions,
  organizationCreatedNextActions,
} from "@/core/platform/party-next-actions";
import type { PlatformActionResult } from "@/core/platform/types";
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

export type PartyActionResult<T> = AuthActionResult<T> & {
  platform?: PlatformActionResult<T>;
};

function formatPartyCreatedDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
      new Date(iso)
    );
  } catch {
    return iso;
  }
}

function partyCreateSummary(party: PartyDetailView) {
  return [
    { label: "Reference Number", value: party.partyNumber },
    { label: "Status", value: party.statusName },
    { label: "Created Date", value: formatPartyCreatedDate(party.registrationDate) },
    { label: "Party Type", value: party.partyTypeName },
  ];
}

function toPlatformCreateResult<T extends PartyDetailView>(
  result: AuthActionResult<T>,
  successTitle: string,
  completionTitle: string,
  successMessage: (data: T) => string,
  nextActions: (data: T) => PlatformActionResult<T>["nextActions"]
): PartyActionResult<T> {
  if (!result.success) {
    return {
      ...result,
      platform: platformError(
        "Action failed",
        result.error.message,
        result.error.field
      ),
    };
  }
  return {
    ...result,
    platform: platformSuccess(
      successTitle,
      successMessage(result.data),
      result.data,
      nextActions(result.data),
      {
        completionTitle,
        summary: partyCreateSummary(result.data),
      }
    ),
  };
}

function isNextDynamicServerError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).includes("DYNAMIC_SERVER_USAGE")
  );
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
): Promise<PartyActionResult<PartyDetailView>> {
  try {
    const context = await requirePartyContext();
    const service = createIndividualProfileService();
    const data = await service.registerIndividual(context, payload);
    return toPlatformCreateResult(
      { success: true, data },
      "Individual created successfully.",
      "✓ Individual Created Successfully",
      (party) => `${party.displayName} is ready in the Party repository.`,
      (party) => individualCreatedNextActions(party.id)
    );
  } catch (error) {
    const failed = toActionError(error);
    if (!failed.success) {
      return {
        ...failed,
        platform: platformError(
          "Action failed",
          failed.error.message,
          failed.error.field
        ),
      };
    }
    return failed;
  }
}

export async function createOrganizationPartyAction(
  payload: RegisterOrganizationPayload
): Promise<PartyActionResult<PartyDetailView>> {
  try {
    const context = await requirePartyContext();
    const service = createOrganizationProfileService();
    const data = await service.registerOrganization(context, payload);
    return toPlatformCreateResult(
      { success: true, data },
      "Organization created successfully.",
      "✓ Organization Created Successfully",
      (party) => `${party.displayName} is ready in the Party repository.`,
      (party) => organizationCreatedNextActions(party.id)
    );
  } catch (error) {
    const failed = toActionError(error);
    if (!failed.success) {
      return {
        ...failed,
        platform: platformError(
          "Action failed",
          failed.error.message,
          failed.error.field
        ),
      };
    }
    return failed;
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
