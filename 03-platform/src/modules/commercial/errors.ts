/**
 * Purpose:
 * Typed errors for BP-005 commercial resolution (IP-01 … IP-07).
 *
 * Implementation Package:
 * BP-005 / IP-01 – Base Price Consumption & Applicable Selection
 * BP-005 / IP-07 – Expected Commercial Amount
 */

export const COMMERCIAL_ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_BASE_PRICE: "MISSING_BASE_PRICE",
  BASE_PRICE_CONFLICT: "BASE_PRICE_CONFLICT",
  CATALOGUE_NOT_APPLICABLE: "CATALOGUE_NOT_APPLICABLE",
  /** IP-02 */
  MISSING_RESOLVED_BASE_PRICE: "MISSING_RESOLVED_BASE_PRICE",
  UNKNOWN_COMPONENT_TYPE: "UNKNOWN_COMPONENT_TYPE",
  DUPLICATE_COMPONENT_IDENTITY: "DUPLICATE_COMPONENT_IDENTITY",
  CIRCULAR_COMPONENT_DEPENDENCY: "CIRCULAR_COMPONENT_DEPENDENCY",
  CURRENCY_MISMATCH: "CURRENCY_MISMATCH",
  COMPOSITION_RECONCILIATION_FAILED: "COMPOSITION_RECONCILIATION_FAILED",
  INVALID_COMPONENT_AMOUNT: "INVALID_COMPONENT_AMOUNT",
  BUSINESS_CONTEXT_MISMATCH: "BUSINESS_CONTEXT_MISMATCH",
  /** IP-03 */
  TAX_CONFIGURATION_MISSING: "TAX_CONFIGURATION_MISSING",
  TAX_CONFIGURATION_CONFLICT: "TAX_CONFIGURATION_CONFLICT",
  INVALID_TAX_RATE: "INVALID_TAX_RATE",
  INVALID_TAX_TREATMENT: "INVALID_TAX_TREATMENT",
  /** IP-04 */
  ADJUSTMENT_CONFIGURATION_MISSING: "ADJUSTMENT_CONFIGURATION_MISSING",
  ADJUSTMENT_CONFIGURATION_CONFLICT: "ADJUSTMENT_CONFIGURATION_CONFLICT",
  INVALID_ADJUSTMENT_METHOD: "INVALID_ADJUSTMENT_METHOD",
  INVALID_ADJUSTMENT_PERCENTAGE: "INVALID_ADJUSTMENT_PERCENTAGE",
  INVALID_ADJUSTMENT_AMOUNT: "INVALID_ADJUSTMENT_AMOUNT",
  UNSUPPORTED_ADJUSTMENT_BASIS: "UNSUPPORTED_ADJUSTMENT_BASIS",
  ADJUSTMENT_APPROVAL_REQUIRED: "ADJUSTMENT_APPROVAL_REQUIRED",
  PAYABLE_WOULD_BE_NEGATIVE: "PAYABLE_WOULD_BE_NEGATIVE",
  /** IP-06 */
  NO_COMMERCIAL_RESOLUTION: "NO_COMMERCIAL_RESOLUTION",
  BASE_PRICE_UNAVAILABLE: "BASE_PRICE_UNAVAILABLE",
  INVALID_COMMERCIAL_COMPONENT: "INVALID_COMMERCIAL_COMPONENT",
  COMMERCIAL_COMPOSITION_CONFLICT: "COMMERCIAL_COMPOSITION_CONFLICT",
  COMMERCIAL_AMOUNT_MISMATCH: "COMMERCIAL_AMOUNT_MISMATCH",
  INVALID_CURRENCY: "INVALID_CURRENCY",
  INVALID_CONTEXT: "INVALID_CONTEXT",
  SNAPSHOT_INVALID: "SNAPSHOT_INVALID",
  SNAPSHOT_NOT_FOUND: "SNAPSHOT_NOT_FOUND",
  /** IP-07 — supplied snapshot cannot be used to derive expected amount */
  INVALID_COMMERCIAL_SNAPSHOT: "INVALID_COMMERCIAL_SNAPSHOT",
  /** IP-07 — integrity hash / immutability failure */
  SNAPSHOT_INTEGRITY_FAILURE: "SNAPSHOT_INTEGRITY_FAILURE",
  /** IP-07 — expected formula does not reconcile to snapshot payable */
  COMMERCIAL_AMOUNT_RECONCILIATION_ERROR: "COMMERCIAL_AMOUNT_RECONCILIATION_ERROR",
  /** IP-07 — derived expected amount is structurally invalid */
  INVALID_EXPECTED_AMOUNT: "INVALID_EXPECTED_AMOUNT",
  /** IP-08 */
  GOVERNANCE_UNAUTHORIZED: "GOVERNANCE_UNAUTHORIZED",
  GOVERNANCE_SOD_VIOLATION: "GOVERNANCE_SOD_VIOLATION",
  INVALID_LIFECYCLE_TRANSITION: "INVALID_LIFECYCLE_TRANSITION",
  APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
  APPROVAL_REJECTED: "APPROVAL_REJECTED",
  JUSTIFICATION_REQUIRED: "JUSTIFICATION_REQUIRED",
  MATERIAL_CHANGE_REQUIRES_APPROVAL: "MATERIAL_CHANGE_REQUIRES_APPROVAL",
  OVERRIDE_NOT_PERMITTED: "OVERRIDE_NOT_PERMITTED",
  OVERRIDE_UNAUTHORIZED: "OVERRIDE_UNAUTHORIZED",
  GOVERNANCE_RULE_NOT_FOUND: "GOVERNANCE_RULE_NOT_FOUND",
  GOVERNANCE_POLICY_MISSING: "GOVERNANCE_POLICY_MISSING",
  GOVERNANCE_CONFIGURATION_CONFLICT: "GOVERNANCE_CONFIGURATION_CONFLICT",
  HARD_DELETE_FORBIDDEN: "HARD_DELETE_FORBIDDEN",
  EFFECTIVE_DATE_NOT_REACHED: "EFFECTIVE_DATE_NOT_REACHED",
  /** IP-09 */
  COMMERCIAL_VALIDATION_FAILED: "COMMERCIAL_VALIDATION_FAILED",
  REQUIRED_CONFIGURATION_MISSING: "REQUIRED_CONFIGURATION_MISSING",
  SILENT_FALLBACK_FORBIDDEN: "SILENT_FALLBACK_FORBIDDEN",
  DETERMINISM_CHECK_FAILED: "DETERMINISM_CHECK_FAILED",
  ROUNDING_INTEGRITY_FAILURE: "ROUNDING_INTEGRITY_FAILURE",
  /** IP-10 */
  COMMERCIAL_CONTRACT_INVALID: "COMMERCIAL_CONTRACT_INVALID",
  COMMERCIAL_CONTRACT_TAMPERED: "COMMERCIAL_CONTRACT_TAMPERED",
  COMMERCIAL_CONTRACT_CURRENCY_MISMATCH: "COMMERCIAL_CONTRACT_CURRENCY_MISMATCH",
  COMMERCIAL_CONTRACT_STALE: "COMMERCIAL_CONTRACT_STALE",
  /** IP-11 */
  TAX_COMPLIANCE_CONFIG_MISSING: "TAX_COMPLIANCE_CONFIG_MISSING",
  TAX_RULE_INVALID: "TAX_RULE_INVALID",
  TAX_REGISTRATION_MISSING: "TAX_REGISTRATION_MISSING",
  FILING_CALENDAR_MISSING: "FILING_CALENDAR_MISSING",
  DUE_DATE_RULE_MISSING: "DUE_DATE_RULE_MISSING",
  EVIDENCE_REQUIREMENT_MISSING: "EVIDENCE_REQUIREMENT_MISSING",
  TAX_COMPLIANCE_UNAUTHORIZED: "TAX_COMPLIANCE_UNAUTHORIZED",
} as const;

export type CommercialErrorCode =
  (typeof COMMERCIAL_ERROR_CODES)[keyof typeof COMMERCIAL_ERROR_CODES];

export const COMMERCIAL_USER_MESSAGES: Record<CommercialErrorCode, string> = {
  INVALID_INPUT: "Commercial resolution input is invalid.",
  MISSING_BASE_PRICE:
    "No applicable base price is configured for this commercial context.",
  BASE_PRICE_CONFLICT:
    "Multiple applicable base prices conflict (PRICE_CONFLICT). IP-05 could not determine a unique winner; no silent selection was made.",
  CATALOGUE_NOT_APPLICABLE:
    "The requested pricing catalogue is not applicable for resolution.",
  MISSING_RESOLVED_BASE_PRICE:
    "Commercial composition requires a ResolvedBasePrice from IP-01.",
  UNKNOWN_COMPONENT_TYPE: "Unknown commercial component type.",
  DUPLICATE_COMPONENT_IDENTITY:
    "Duplicate commercial component identity in composition.",
  CIRCULAR_COMPONENT_DEPENDENCY:
    "Commercial component dependency graph contains a cycle.",
  CURRENCY_MISMATCH:
    "Commercial components must share a single currency; mixed currencies cannot be combined.",
  COMPOSITION_RECONCILIATION_FAILED:
    "Commercial components do not reconcile to the payable candidate.",
  INVALID_COMPONENT_AMOUNT: "Commercial component amount is invalid.",
  BUSINESS_CONTEXT_MISMATCH:
    "Commercial composition businessId must match the authenticated business context.",
  TAX_CONFIGURATION_MISSING:
    "Required tax configuration is missing for this commercial context.",
  TAX_CONFIGURATION_CONFLICT:
    "Multiple equally applicable tax configurations conflict; no silent selection was made.",
  INVALID_TAX_RATE: "Tax rate is invalid.",
  INVALID_TAX_TREATMENT: "Tax treatment is invalid.",
  ADJUSTMENT_CONFIGURATION_MISSING:
    "Required commercial adjustment configuration is missing for this context.",
  ADJUSTMENT_CONFIGURATION_CONFLICT:
    "Multiple equally applicable commercial adjustments conflict; no silent selection was made.",
  INVALID_ADJUSTMENT_METHOD: "Commercial adjustment method is invalid.",
  INVALID_ADJUSTMENT_PERCENTAGE:
    "Commercial adjustment percentage must be a valid non-negative value.",
  INVALID_ADJUSTMENT_AMOUNT:
    "Commercial adjustment fixed amount must be a valid non-negative value.",
  UNSUPPORTED_ADJUSTMENT_BASIS:
    "Unsupported commercial adjustment basis — fail closed (no silent substitution).",
  ADJUSTMENT_APPROVAL_REQUIRED:
    "Adjustment exceeds configured approval threshold and cannot be applied without approval.",
  PAYABLE_WOULD_BE_NEGATIVE:
    "Commercial payable candidate would become negative; credits/refunds are not enabled for this contract.",
  NO_COMMERCIAL_RESOLUTION:
    "Commercial resolution cannot be completed for this context.",
  BASE_PRICE_UNAVAILABLE:
    "No applicable base price was found. Next action: Configure an active price in Product → Pricing.",
  INVALID_COMMERCIAL_COMPONENT:
    "A commercial component in the resolution is invalid.",
  COMMERCIAL_COMPOSITION_CONFLICT:
    "Commercial composition conflict — components cannot be reconciled to a payable.",
  COMMERCIAL_AMOUNT_MISMATCH:
    "Commercial amounts do not reconcile exactly. The snapshot was rejected.",
  INVALID_CURRENCY:
    "Currency is missing or inconsistent across commercial components.",
  INVALID_CONTEXT:
    "Commercial resolution context is invalid (business, offering, or currency).",
  SNAPSHOT_INVALID:
    "Commercial snapshot failed validation and cannot be consumed.",
  SNAPSHOT_NOT_FOUND:
    "Commercial snapshot was not found. IP-06 value-object snapshots are not a persisted store — the transactional owner (BP-006+) retains committed copies.",
  INVALID_COMMERCIAL_SNAPSHOT:
    "The commercial snapshot is invalid and cannot be used to calculate the expected amount. Re-resolve the commercial transaction.",
  SNAPSHOT_INTEGRITY_FAILURE:
    "Commercial snapshot integrity check failed (hash or immutability). Re-resolve and freeze a new snapshot before calculating expected amount.",
  COMMERCIAL_AMOUNT_RECONCILIATION_ERROR:
    "Expected commercial amount does not reconcile to the snapshot payable. The snapshot was rejected — re-resolve the commercial transaction.",
  INVALID_EXPECTED_AMOUNT:
    "The derived expected commercial amount is invalid. Re-resolve the commercial snapshot and try again.",
  GOVERNANCE_UNAUTHORIZED:
    "You are not authorized to perform this commercial governance action.",
  GOVERNANCE_SOD_VIOLATION:
    "Segregation of duties applies — the maker cannot approve their own commercial change. Ask a checker to approve.",
  INVALID_LIFECYCLE_TRANSITION:
    "This lifecycle transition is not allowed. Follow the configured commercial governance path.",
  APPROVAL_REQUIRED:
    "Approval is required before this commercial configuration can proceed.",
  APPROVAL_REJECTED:
    "The commercial configuration was rejected. Amend and resubmit with the required changes.",
  JUSTIFICATION_REQUIRED:
    "A justification / reason is required for this commercial governance action.",
  MATERIAL_CHANGE_REQUIRES_APPROVAL:
    "A material commercial change was detected. Submit for approval before activation.",
  OVERRIDE_NOT_PERMITTED:
    "Commercial overrides are not permitted under the current governance policy.",
  OVERRIDE_UNAUTHORIZED:
    "You are not authorized to request or approve this commercial override.",
  GOVERNANCE_RULE_NOT_FOUND:
    "The commercial governance rule version was not found for this business.",
  GOVERNANCE_POLICY_MISSING:
    "Commercial governance policy is missing. Configure governance before continuing.",
  GOVERNANCE_CONFIGURATION_CONFLICT:
    "Conflicting commercial governance configuration — fail closed. Resolve the conflict before continuing.",
  HARD_DELETE_FORBIDDEN:
    "Active or historically referenced commercial configurations cannot be hard-deleted. Retire or supersede instead.",
  EFFECTIVE_DATE_NOT_REACHED:
    "This commercial configuration is approved but its effective date has not been reached. It cannot become commercially effective yet.",
  COMMERCIAL_VALIDATION_FAILED:
    "Commercial validation failed. Correct the reported fields and re-resolve — no payable was produced.",
  REQUIRED_CONFIGURATION_MISSING:
    "Required commercial configuration is missing for this context. Configure the missing price, tax, or adjustment rule — silent defaults are not applied.",
  SILENT_FALLBACK_FORBIDDEN:
    "Silent commercial fallbacks are forbidden. Missing configuration must fail closed with an explicit error.",
  DETERMINISM_CHECK_FAILED:
    "Commercial resolution was not deterministic for identical inputs and rule versions. Re-check configuration versions and calculation order.",
  ROUNDING_INTEGRITY_FAILURE:
    "Commercial amounts do not reconcile after rounding policy. The result was rejected — no payable was produced.",
  COMMERCIAL_CONTRACT_INVALID:
    "The commercial transaction contract is invalid and cannot be consumed downstream.",
  COMMERCIAL_CONTRACT_TAMPERED:
    "Commercial contract integrity failed — the snapshot or expected amount appears tampered. Re-resolve and freeze a new snapshot.",
  COMMERCIAL_CONTRACT_CURRENCY_MISMATCH:
    "Requested currency does not match the authoritative commercial contract currency. FX is not performed in IP-10.",
  COMMERCIAL_CONTRACT_STALE:
    "This commercial result cannot be used for the requested downstream context. Request an explicit new commercial resolution.",
  TAX_COMPLIANCE_CONFIG_MISSING:
    "Required tax compliance configuration is missing. Fail closed — no obligation invented.",
  TAX_RULE_INVALID:
    "The tax compliance rule is invalid or not usable for this context.",
  TAX_REGISTRATION_MISSING:
    "A required tax registration is missing for this business and tax type.",
  FILING_CALENDAR_MISSING:
    "Filing calendar configuration is missing. Fail closed — no period invented.",
  DUE_DATE_RULE_MISSING:
    "Tax due-date rule is missing. Fail closed — no due date invented.",
  EVIDENCE_REQUIREMENT_MISSING:
    "Required tax evidence configuration is missing for this obligation.",
  TAX_COMPLIANCE_UNAUTHORIZED:
    "You are not authorized to perform this tax compliance action.",
};

export class CommercialError extends Error {
  readonly code: CommercialErrorCode;
  readonly statusCode: number;
  readonly field?: string;
  readonly details?: Record<string, unknown>;

  constructor(
    code: CommercialErrorCode,
    message: string = COMMERCIAL_USER_MESSAGES[code],
    statusCode = 400,
    field?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "CommercialError";
    this.code = code;
    this.statusCode = statusCode;
    this.field = field;
    this.details = details;
  }
}

/** Map commercial error codes to IP-09 structured families for consumers. */
export const COMMERCIAL_ERROR_CODE_FAMILY: Record<
  CommercialErrorCode,
  | "CFG_MISSING"
  | "CFG_INVALID"
  | "CONFLICT"
  | "CURRENCY"
  | "INTEGRITY"
  | "AUTH"
  | "VALIDATION"
> = {
  INVALID_INPUT: "CFG_INVALID",
  MISSING_BASE_PRICE: "CFG_MISSING",
  BASE_PRICE_CONFLICT: "CONFLICT",
  CATALOGUE_NOT_APPLICABLE: "CFG_INVALID",
  MISSING_RESOLVED_BASE_PRICE: "CFG_MISSING",
  UNKNOWN_COMPONENT_TYPE: "CFG_INVALID",
  DUPLICATE_COMPONENT_IDENTITY: "CFG_INVALID",
  CIRCULAR_COMPONENT_DEPENDENCY: "CFG_INVALID",
  CURRENCY_MISMATCH: "CURRENCY",
  COMPOSITION_RECONCILIATION_FAILED: "INTEGRITY",
  INVALID_COMPONENT_AMOUNT: "CFG_INVALID",
  BUSINESS_CONTEXT_MISMATCH: "AUTH",
  TAX_CONFIGURATION_MISSING: "CFG_MISSING",
  TAX_CONFIGURATION_CONFLICT: "CONFLICT",
  INVALID_TAX_RATE: "CFG_INVALID",
  INVALID_TAX_TREATMENT: "CFG_INVALID",
  ADJUSTMENT_CONFIGURATION_MISSING: "CFG_MISSING",
  ADJUSTMENT_CONFIGURATION_CONFLICT: "CONFLICT",
  INVALID_ADJUSTMENT_METHOD: "CFG_INVALID",
  INVALID_ADJUSTMENT_PERCENTAGE: "CFG_INVALID",
  INVALID_ADJUSTMENT_AMOUNT: "CFG_INVALID",
  UNSUPPORTED_ADJUSTMENT_BASIS: "CFG_INVALID",
  ADJUSTMENT_APPROVAL_REQUIRED: "AUTH",
  PAYABLE_WOULD_BE_NEGATIVE: "INTEGRITY",
  NO_COMMERCIAL_RESOLUTION: "INTEGRITY",
  BASE_PRICE_UNAVAILABLE: "CFG_MISSING",
  INVALID_COMMERCIAL_COMPONENT: "CFG_INVALID",
  COMMERCIAL_COMPOSITION_CONFLICT: "CONFLICT",
  COMMERCIAL_AMOUNT_MISMATCH: "INTEGRITY",
  INVALID_CURRENCY: "CURRENCY",
  INVALID_CONTEXT: "AUTH",
  SNAPSHOT_INVALID: "INTEGRITY",
  SNAPSHOT_NOT_FOUND: "CFG_MISSING",
  INVALID_COMMERCIAL_SNAPSHOT: "INTEGRITY",
  SNAPSHOT_INTEGRITY_FAILURE: "INTEGRITY",
  COMMERCIAL_AMOUNT_RECONCILIATION_ERROR: "INTEGRITY",
  INVALID_EXPECTED_AMOUNT: "INTEGRITY",
  GOVERNANCE_UNAUTHORIZED: "AUTH",
  GOVERNANCE_SOD_VIOLATION: "AUTH",
  INVALID_LIFECYCLE_TRANSITION: "CFG_INVALID",
  APPROVAL_REQUIRED: "AUTH",
  APPROVAL_REJECTED: "AUTH",
  JUSTIFICATION_REQUIRED: "CFG_INVALID",
  MATERIAL_CHANGE_REQUIRES_APPROVAL: "AUTH",
  OVERRIDE_NOT_PERMITTED: "AUTH",
  OVERRIDE_UNAUTHORIZED: "AUTH",
  GOVERNANCE_RULE_NOT_FOUND: "CFG_MISSING",
  GOVERNANCE_POLICY_MISSING: "CFG_MISSING",
  GOVERNANCE_CONFIGURATION_CONFLICT: "CONFLICT",
  HARD_DELETE_FORBIDDEN: "AUTH",
  EFFECTIVE_DATE_NOT_REACHED: "CFG_INVALID",
  COMMERCIAL_VALIDATION_FAILED: "VALIDATION",
  REQUIRED_CONFIGURATION_MISSING: "CFG_MISSING",
  SILENT_FALLBACK_FORBIDDEN: "VALIDATION",
  DETERMINISM_CHECK_FAILED: "INTEGRITY",
  ROUNDING_INTEGRITY_FAILURE: "INTEGRITY",
  COMMERCIAL_CONTRACT_INVALID: "VALIDATION",
  COMMERCIAL_CONTRACT_TAMPERED: "INTEGRITY",
  COMMERCIAL_CONTRACT_CURRENCY_MISMATCH: "CURRENCY",
  COMMERCIAL_CONTRACT_STALE: "VALIDATION",
  TAX_COMPLIANCE_CONFIG_MISSING: "CFG_MISSING",
  TAX_RULE_INVALID: "CFG_INVALID",
  TAX_REGISTRATION_MISSING: "CFG_MISSING",
  FILING_CALENDAR_MISSING: "CFG_MISSING",
  DUE_DATE_RULE_MISSING: "CFG_MISSING",
  EVIDENCE_REQUIREMENT_MISSING: "CFG_MISSING",
  TAX_COMPLIANCE_UNAUTHORIZED: "AUTH",
};

export const COMMERCIAL_ERROR_ACTIONABLE_HINTS: Partial<
  Record<CommercialErrorCode, string>
> = {
  MISSING_BASE_PRICE:
    "Configure an active price in Product → Pricing for this offering and currency.",
  BASE_PRICE_UNAVAILABLE:
    "Configure an active price in Product → Pricing for this offering and currency.",
  BASE_PRICE_CONFLICT:
    "Resolve overlapping pricing catalogue/item configuration — do not pick a price arbitrarily.",
  TAX_CONFIGURATION_MISSING:
    "Supply or activate a tax rule for this commercial context, or clear requireTaxConfiguration.",
  ADJUSTMENT_CONFIGURATION_MISSING:
    "Supply or activate an adjustment rule, or clear requireAdjustmentConfiguration.",
  CURRENCY_MISMATCH:
    "Use a single currency for all components in this resolution (FX is not enabled).",
  CIRCULAR_COMPONENT_DEPENDENCY:
    "Remove the circular dependency between commercial components.",
  COMMERCIAL_AMOUNT_MISMATCH:
    "Re-resolve the commercial transaction; do not invent a payable.",
  REQUIRED_CONFIGURATION_MISSING:
    "Add the missing commercial configuration before resolving again.",
  COMMERCIAL_CONTRACT_TAMPERED:
    "Re-resolve the commercial transaction and freeze a new IP-06 snapshot before consuming downstream.",
  COMMERCIAL_CONTRACT_CURRENCY_MISMATCH:
    "Use the contract currency, or request a new resolution in the required currency (no FX in IP-10).",
};
