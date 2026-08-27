/**
 * Purpose:
 * IP-09 commercial validation & resilience orchestration.
 * Fail-closed — never invent silent fallback payables.
 *
 * Pipeline placement:
 *   Auth → pre-validate → IP-01…IP-06 → post-validate → OK | structured error
 *
 * Implementation Package:
 * BP-005 / IP-09 – Commercial Validation & Resilience
 */

import type { CurrentBusinessContext } from "@/core/auth/types";

import {
  assertDeterministicMatch,
  buildDeterminismFingerprint,
  resolveRequiredConfigPolicy,
  throwFromValidationReport,
  toStructuredCommercialError,
  validateCommercialConfigurationPayload,
  validateResolutionIntegrity,
  validateResolutionRequestPre,
} from "@/modules/commercial/services/commercial-validation-rules";
import type {
  CommercialPreValidationInput,
  CommercialRequiredConfigPolicy,
  CommercialResolution,
  CommercialResolutionRequest,
  CommercialValidationReport,
  CreateCommercialRuleDraftInput,
  StructuredCommercialErrorPayload,
} from "@/modules/commercial/types";
import { CommercialError } from "@/modules/commercial/errors";

export class CommercialValidationService {
  resolvePolicy(
    input?: Partial<CommercialRequiredConfigPolicy> | null
  ): CommercialRequiredConfigPolicy {
    return resolveRequiredConfigPolicy(input);
  }

  /**
   * Pre-validate resolve request + required configuration presence (BR-001/002).
   */
  preValidateResolve(
    context: CurrentBusinessContext,
    request: CommercialResolutionRequest
  ): CommercialValidationReport {
    const input: CommercialPreValidationInput = {
      businessId: request.businessId,
      offeringId: request.offeringId,
      currencyCode: request.currencyCode,
      quantity: request.quantity,
      taxRules: request.taxRules,
      adjustmentRules: request.adjustmentRules,
      requireTaxConfiguration: request.requireTaxConfiguration,
      requireAdjustmentConfiguration: request.requireAdjustmentConfiguration,
      allowNegativePayable: request.allowNegativePayable,
      policy: {
        requireTaxConfiguration: request.requireTaxConfiguration,
        requireAdjustmentConfiguration: request.requireAdjustmentConfiguration,
        allowNegativePayable: request.allowNegativePayable,
      },
    };
    return validateResolutionRequestPre(input, context.businessId);
  }

  /**
   * Assert pre-validation or throw structured CommercialError (no payable).
   */
  assertPreValidateResolve(
    context: CurrentBusinessContext,
    request: CommercialResolutionRequest
  ): void {
    const report = this.preValidateResolve(context, request);
    if (!report.ok) {
      throwFromValidationReport(report);
    }
  }

  /**
   * Post-validate resolution integrity / currency / reconcile (BR-003).
   */
  postValidateResolution(
    resolution: CommercialResolution,
    options?: { allowNegativePayable?: boolean }
  ): CommercialValidationReport {
    return validateResolutionIntegrity(resolution, options);
  }

  assertPostValidateResolution(
    resolution: CommercialResolution,
    options?: { allowNegativePayable?: boolean }
  ): CommercialValidationReport {
    const report = this.postValidateResolution(resolution, options);
    if (!report.ok) {
      throwFromValidationReport(report);
    }
    return report;
  }

  /**
   * Configuration-save validation (BRU-005 / IP-08 hook).
   */
  validateConfigurationSave(
    input: CreateCommercialRuleDraftInput
  ): CommercialValidationReport {
    return validateCommercialConfigurationPayload(input);
  }

  assertConfigurationSave(input: CreateCommercialRuleDraftInput): void {
    const report = this.validateConfigurationSave(input);
    if (!report.ok) {
      throwFromValidationReport({
        ...report,
        businessId: report.businessId || "",
      });
    }
  }

  toStructuredError(
    error: CommercialError,
    context?: {
      stage?: string;
      businessId?: string | null;
      offeringId?: string | null;
      currencyCode?: string | null;
      ruleId?: string | null;
    }
  ): StructuredCommercialErrorPayload {
    return toStructuredCommercialError(error, context);
  }

  fingerprint(resolution: CommercialResolution): string {
    return buildDeterminismFingerprint(resolution);
  }

  assertDeterministic(first: string, second: string): void {
    assertDeterministicMatch(first, second);
  }
}

export function createCommercialValidationService() {
  return new CommercialValidationService();
}
