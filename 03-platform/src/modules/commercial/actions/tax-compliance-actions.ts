"use server";

/**
 * Purpose:
 * Server actions for BP-005 IP-11 tax compliance workspace.
 */

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import {
  CommercialError,
  TAX_COMPLIANCE_PERMISSIONS,
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

async function requireContext() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  if (!user) {
    throw new CommercialError(
      "INVALID_INPUT",
      "Your session has expired. Please sign in again.",
      401,
      "session"
    );
  }
  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();
  if (!context) {
    throw new CommercialError(
      "BUSINESS_CONTEXT_MISMATCH",
      "Select a business before managing tax compliance.",
      403,
      "businessId"
    );
  }
  return {
    context,
    actor: {
      userId: user.platformUserId,
      permissions: Object.values(TAX_COMPLIANCE_PERMISSIONS),
    },
  };
}

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

export async function loadTaxComplianceDashboardAction(): Promise<
  AuthActionResult<TaxComplianceDashboardView>
> {
  try {
    const { context } = await requireContext();
    return { success: true, data: service().getDashboard(context) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createTaxComplianceProfileAction(input: {
  countryCode: string;
}): Promise<AuthActionResult<TaxComplianceProfileView>> {
  try {
    const { context, actor } = await requireContext();
    const data = service().createProfile(context, actor, {
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
    const { context, actor } = await requireContext();
    const data = service().addRegistration(context, actor, input);
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
    const { context, actor } = await requireContext();
    const data = service().generateCalendarPeriod(context, actor, input);
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
    const { context, actor } = await requireContext();
    const data = service().createObligationFromSnapshot(context, actor, input);
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
    const { context, actor } = await requireContext();
    const data = service().transitionFiling(
      context,
      actor,
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
    const { context, actor } = await requireContext();
    const data = service().recordRemittance(
      context,
      actor,
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
    const { context, actor } = await requireContext();
    const data = service().uploadEvidence(context, actor, input);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
