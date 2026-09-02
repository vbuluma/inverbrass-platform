"use server";

/**
 * Purpose:
 * Server actions for BP-005 IP-11 tax compliance workspace.
 */

import { requireTaxComplianceChannelContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import {
  CommercialError,
  createTaxComplianceService,
  getProcessTaxComplianceStore,
  type TaxComplianceDashboardView,
  type TaxComplianceProfileView,
  type TaxEvidenceView,
  type TaxFilingPeriodView,
  type TaxFilingView,
  type TaxObligationView,
  type TaxRegistrationView,
  type TaxRemittanceView,
} from "@/modules/commercial";
import type { TaxComplianceActor } from "@/modules/commercial/tax-compliance/tax-compliance-types";

function toActionError(error: unknown): AuthActionResult<never> {
  if (isNextRedirectError(error)) throw error;
  if (error instanceof CommercialError) {
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
      message: "Tax compliance action failed. Please try again.",
    },
  };
}

function service() {
  return createTaxComplianceService(getProcessTaxComplianceStore());
}

function taxComplianceServiceActor(
  actor: Awaited<ReturnType<typeof requireTaxComplianceChannelContext>>["actor"]
): TaxComplianceActor {
  return { ...actor, permissions: [...actor.permissions] };
}

export async function loadTaxComplianceDashboardAction(): Promise<
  AuthActionResult<TaxComplianceDashboardView>
> {
  try {
    const { context } = await requireTaxComplianceChannelContext();
    return { success: true, data: service().getDashboard(context) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createTaxComplianceProfileAction(input: {
  countryCode: string;
}): Promise<AuthActionResult<TaxComplianceProfileView>> {
  try {
    const { context, actor } = await requireTaxComplianceChannelContext();
    const data = service().createProfile(context, taxComplianceServiceActor(actor), {
      countryCode: input.countryCode,
      seedJurisdictionTemplates: true,
    });
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addTaxRegistrationAction(input: {
  registrationType: string;
  registrationNumber: string;
  taxAuthorityCode: string;
  taxTypeCode?: string | null;
}): Promise<AuthActionResult<TaxRegistrationView>> {
  try {
    const { context, actor } = await requireTaxComplianceChannelContext();
    const data = service().addRegistration(context, taxComplianceServiceActor(actor), input);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function generateTaxCalendarPeriodAction(input: {
  taxTypeCode: string;
  asOf: string;
}): Promise<AuthActionResult<TaxFilingPeriodView>> {
  try {
    const { context, actor } = await requireTaxComplianceChannelContext();
    const data = service().generateCalendarPeriod(context, taxComplianceServiceActor(actor), input);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createTaxObligationFromSnapshotAction(input: {
  snapshotId: string;
  resolutionId: string;
  commercialContractId?: string | null;
  taxComponentId: string;
  taxTypeCode: string;
  taxableAmount: string;
  taxAmount: string;
  currencyCode: string;
  obligationDate: string;
}): Promise<AuthActionResult<TaxObligationView>> {
  try {
    const { context, actor } = await requireTaxComplianceChannelContext();
    const data = service().createObligationFromSnapshot(context, taxComplianceServiceActor(actor), input);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function transitionTaxFilingAction(input: {
  obligationId: string;
  toStatus: string;
  filingReference?: string | null;
  notes?: string | null;
}): Promise<AuthActionResult<TaxFilingView>> {
  try {
    const { context, actor } = await requireTaxComplianceChannelContext();
    const data = service().transitionFiling(
      context,
      taxComplianceServiceActor(actor),
      input.obligationId,
      input.toStatus,
      {
        filingReference: input.filingReference,
        notes: input.notes,
      }
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function recordTaxRemittanceAction(input: {
  obligationId: string;
  amountRemitted: string;
  paymentReference?: string | null;
}): Promise<AuthActionResult<TaxRemittanceView>> {
  try {
    const { context, actor } = await requireTaxComplianceChannelContext();
    const data = service().recordRemittance(
      context,
      taxComplianceServiceActor(actor),
      input.obligationId,
      input.amountRemitted,
      { paymentReference: input.paymentReference }
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function uploadTaxEvidenceAction(input: {
  obligationId: string;
  evidenceType: string;
  documentRef: string;
  description?: string | null;
}): Promise<AuthActionResult<TaxEvidenceView>> {
  try {
    const { context, actor } = await requireTaxComplianceChannelContext();
    const data = service().uploadEvidence(context, taxComplianceServiceActor(actor), input);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
