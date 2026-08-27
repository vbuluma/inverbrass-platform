/**
 * Purpose:
 * BP-005 commercial resolution constants (IP-01).
 *
 * Implementation Package:
 * BP-005 / IP-01 – Base Price Consumption & Applicable Selection
 */

export const COMMERCIAL_BUILD_PACK = "BP-005" as const;

export const COMMERCIAL_IP = {
  IP_01_BASE_PRICE: "IP-01",
  IP_02_COMPONENTS: "IP-02",
  IP_03_TAX: "IP-03",
  IP_04_ADJUSTMENTS: "IP-04",
  /** Precedence/conflict owner — authoritative in IP-05. */
  IP_05_PRECEDENCE: "IP-05",
  IP_06_SNAPSHOT: "IP-06",
  /** Expected commercial amount projection from IP-06 snapshot. */
  IP_07_EXPECTED_AMOUNT: "IP-07",
  /** Commercial governance / control layer. */
  IP_08_GOVERNANCE: "IP-08",
  /** Commercial validation & resilience (fail-closed). */
  IP_09_VALIDATION: "IP-09",
  /** Downstream commercial contract & integration boundary. */
  IP_10_DOWNSTREAM_CONTRACT: "IP-10",
  /** Tax compliance, filing, remittance calendar & evidence. */
  IP_11_TAX_COMPLIANCE: "IP-11",
} as const;

/** Stable downstream contract version (BRU-002 — breaking changes need v2). */
export const COMMERCIAL_CONTRACT_VERSION = "v1" as const;

export type CommercialContractVersion = typeof COMMERCIAL_CONTRACT_VERSION;

export const COMMERCIAL_CONTRACT_STATUSES = {
  VALIDATED: "VALIDATED",
  INVALID: "INVALID",
} as const;

export type CommercialContractStatus =
  (typeof COMMERCIAL_CONTRACT_STATUSES)[keyof typeof COMMERCIAL_CONTRACT_STATUSES];

/** Documented consumer packs for the IP-10 allow-list (informational). */
export const COMMERCIAL_CONTRACT_CONSUMER_PACKS = {
  BP_006_SALES_ORDERS: "BP-006",
  BP_007_PAYMENTS: "BP-007",
  FUTURE_REVENUE_ASSURANCE: "RA",
  FUTURE_FINANCE: "FINANCE",
  BP_004_QUOTATIONS: "BP-004",
} as const;

/* -------------------------------------------------------------------------- */
/* BP-005 IP-09 — Commercial validation & resilience                          */
/* -------------------------------------------------------------------------- */

/** Stable error families for IP-10 / BP-006 / BP-007 consumers. */
export const COMMERCIAL_ERROR_FAMILIES = {
  CFG_MISSING: "CFG_MISSING",
  CFG_INVALID: "CFG_INVALID",
  CONFLICT: "CONFLICT",
  CURRENCY: "CURRENCY",
  INTEGRITY: "INTEGRITY",
  AUTH: "AUTH",
  VALIDATION: "VALIDATION",
} as const;

export type CommercialErrorFamily =
  (typeof COMMERCIAL_ERROR_FAMILIES)[keyof typeof COMMERCIAL_ERROR_FAMILIES];

export const COMMERCIAL_VALIDATION_STAGES = {
  PRE_REQUEST: "PRE_REQUEST",
  PRE_CONFIGURATION: "PRE_CONFIGURATION",
  POST_COMPOSITION: "POST_COMPOSITION",
  POST_SNAPSHOT: "POST_SNAPSHOT",
  CONFIGURATION_SAVE: "CONFIGURATION_SAVE",
  DETERMINISM: "DETERMINISM",
} as const;

export type CommercialValidationStage =
  (typeof COMMERCIAL_VALIDATION_STAGES)[keyof typeof COMMERCIAL_VALIDATION_STAGES];

/**
 * Default required-configuration matrix (configuration-driven; not industry hard-coded).
 * Callers may override per request / business policy.
 */
export const DEFAULT_COMMERCIAL_REQUIRED_CONFIG = {
  requireBasePrice: true,
  /** When true, missing tax rules fail closed (no silent zero-tax). */
  requireTaxConfiguration: false,
  requireAdjustmentConfiguration: false,
  /** v1: mixed currencies always fail — no FX silent convert. */
  allowMixedCurrency: false,
  allowNegativePayable: false,
  allowSilentZeroFallback: false,
} as const;

/* -------------------------------------------------------------------------- */
/* BP-005 IP-08 — Commercial governance                                       */
/* -------------------------------------------------------------------------- */

export const COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES = {
  DRAFT: "DRAFT",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  EXPIRED: "EXPIRED",
  RETIRED: "RETIRED",
} as const;

export type CommercialGovernanceLifecycleCode =
  (typeof COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES)[keyof typeof COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES];

export const COMMERCIAL_RULE_TYPE_CODES = {
  TAX_RULE: "TAX_RULE",
  ADJUSTMENT_RULE: "ADJUSTMENT_RULE",
  COMMERCIAL_POLICY: "COMMERCIAL_POLICY",
  PRICING_POLICY_REF: "PRICING_POLICY_REF",
} as const;

export type CommercialRuleTypeCode =
  (typeof COMMERCIAL_RULE_TYPE_CODES)[keyof typeof COMMERCIAL_RULE_TYPE_CODES];

export const COMMERCIAL_GOVERNANCE_DECISION_CODES = {
  ALLOWED: "ALLOWED",
  APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
  REJECTED: "REJECTED",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
} as const;

export type CommercialGovernanceDecisionCode =
  (typeof COMMERCIAL_GOVERNANCE_DECISION_CODES)[keyof typeof COMMERCIAL_GOVERNANCE_DECISION_CODES];

export const COMMERCIAL_OVERRIDE_STATUS_CODES = {
  REQUESTED: "REQUESTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  APPLIED: "APPLIED",
} as const;

export type CommercialOverrideStatusCode =
  (typeof COMMERCIAL_OVERRIDE_STATUS_CODES)[keyof typeof COMMERCIAL_OVERRIDE_STATUS_CODES];

export const COMMERCIAL_GOVERNANCE_EVENT_TYPES = {
  RULE_CREATED: "PRICE_CONFIGURATION_CREATED",
  RULE_SUBMITTED: "PRICE_CONFIGURATION_SUBMITTED",
  RULE_APPROVED: "PRICE_CONFIGURATION_APPROVED",
  RULE_REJECTED: "PRICE_CONFIGURATION_REJECTED",
  RULE_ACTIVATED: "COMMERCIAL_RULE_ACTIVATED",
  RULE_SUSPENDED: "COMMERCIAL_RULE_SUSPENDED",
  RULE_RETIRED: "COMMERCIAL_RULE_RETIRED",
  RULE_AMENDED: "COMMERCIAL_RULE_AMENDED",
  OVERRIDE_REQUESTED: "COMMERCIAL_OVERRIDE_REQUESTED",
  OVERRIDE_APPROVED: "COMMERCIAL_OVERRIDE_APPROVED",
  OVERRIDE_REJECTED: "COMMERCIAL_OVERRIDE_REJECTED",
  NON_MATERIAL_UPDATED: "COMMERCIAL_NON_MATERIAL_UPDATED",
} as const;

/** Permission codes — platform Module.Resource.Action style. */
export const COMMERCIAL_GOVERNANCE_PERMISSIONS = {
  CREATE: "CommercialManagement.Config.Create",
  EDIT: "CommercialManagement.Config.Update",
  SUBMIT: "CommercialManagement.Config.Execute",
  APPROVE: "CommercialManagement.Config.Approve",
  REJECT: "CommercialManagement.Config.Reject",
  ACTIVATE: "CommercialManagement.Config.Activate",
  SUSPEND: "CommercialManagement.Config.Deactivate",
  OVERRIDE_REQUEST: "CommercialManagement.Override.Create",
  OVERRIDE_APPROVE: "CommercialManagement.Override.Approve",
  READ: "CommercialManagement.Config.Read",
} as const;

/** Default material commercial field paths (configuration-driven override allowed). */
export const DEFAULT_MATERIAL_FIELD_PATHS = [
  "payload.unitPrice",
  "payload.ratePercent",
  "payload.fixedAmount",
  "payload.percentage",
  "payload.currencyCode",
  "payload.treatment",
  "payload.direction",
  "payload.method",
  "payload.basis",
  "payload.customerSegment",
  "payload.salesChannel",
  "payload.region",
  "payload.offeringId",
  "effectiveFrom",
  "effectiveTo",
  "currencyCode",
] as const;

/** Non-material fields that do not trigger approval when changed alone. */
export const DEFAULT_NON_MATERIAL_FIELD_PATHS = [
  "label",
  "description",
  "metadata",
  "payload.displayLabel",
  "payload.notes",
] as const;

/**
 * Explicit lifecycle transitions (fail closed on anything else).
 * DRAFT → ACTIVE is forbidden when approval is required (enforced in rules).
 */
export const COMMERCIAL_GOVERNANCE_TRANSITIONS: Record<
  CommercialGovernanceLifecycleCode,
  readonly CommercialGovernanceLifecycleCode[]
> = {
  DRAFT: ["PENDING_APPROVAL", "RETIRED"],
  PENDING_APPROVAL: ["APPROVED", "REJECTED"],
  APPROVED: ["ACTIVE", "RETIRED"],
  REJECTED: ["DRAFT", "PENDING_APPROVAL"],
  ACTIVE: ["SUSPENDED", "EXPIRED", "RETIRED"],
  SUSPENDED: ["ACTIVE", "RETIRED"],
  EXPIRED: ["RETIRED"],
  RETIRED: [],
};

/**
 * IP-07 sign convention for expected-amount aggregates.
 * Snapshot component lines remain signed (ADD positive / SUBTRACT negative).
 * Header totals below are non-negative magnitudes unless noted.
 */
export const EXPECTED_AMOUNT_SIGN_CONVENTION = {
  /**
   * expectedAmount = principal + positiveCharges + tax − discounts
   * (equivalent to sum of signed snapshot component amounts = snapshot.payable)
   */
  formula:
    "expectedAmount = principal + positiveCharges + tax - discounts (= snapshot.payable)",
  principal: "Non-negative magnitude of PRINCIPAL components (ADD).",
  positiveCharges:
    "Non-negative magnitude of COMMISSION / FEE / SURCHARGE / OTHER ADD charges (excludes principal and tax).",
  discounts:
    "Non-negative magnitude of DISCOUNT / reduction components (SUBTRACT in snapshot).",
  tax: "Non-negative magnitude of TAX / LEVY components (ADD).",
  commission:
    "Non-negative magnitude of COMMISSION-typed charges (includes IP-04 SURCHARGE lines whose provenance notes identify commission).",
  payableEqualsExpected:
    "payableAmount and expectedAmount both equal the authoritative IP-06 snapshot.payable.",
  actualCollected:
    "Always null — actual collection belongs to BP-007+; variance is not computed in IP-07.",
} as const;

/**
 * Explicit IP-05 base-price specificity weights (deterministic; higher = more specific).
 * Extensible: add new dimension keys without rewriting the engine.
 *
 * Unsupported BP-003 dimensions (quantity, partyId) are never scored here —
 * they are noted on provenance only.
 */
export const BASE_PRICE_PRECEDENCE_WEIGHTS = {
  /** Request named a catalogue and candidate belongs to it. */
  CATALOGUE_EXACT: 50,
  /** Candidate dimension exactly matches a requested dimension. */
  DIMENSION_EXACT: 20,
  /** Candidate dimension is wildcard (null) while request specifies a value. */
  DIMENSION_WILDCARD_WHEN_REQUESTED: 8,
  /** Request did not specify dimension; candidate also broad (null). */
  DIMENSION_BOTH_BROAD: 5,
  /** Request did not specify dimension; candidate is narrowed (unused specificity). */
  DIMENSION_NARROW_UNUSED: 2,
  /** Currency exact match (eligible candidates already share request currency). */
  CURRENCY_EXACT: 10,
} as const;

export const BASE_PRICE_PRECEDENCE_STAGES = {
  NO_CANDIDATES: "NO_CANDIDATES",
  SINGLE_CANDIDATE: "SINGLE_CANDIDATE",
  SPECIFICITY_COMPARISON: "SPECIFICITY_COMPARISON",
  SPECIFICITY_TIE: "SPECIFICITY_TIE",
} as const;

export type BasePricePrecedenceStage =
  (typeof BASE_PRICE_PRECEDENCE_STAGES)[keyof typeof BASE_PRICE_PRECEDENCE_STAGES];

/** Logical resolution codes (service outcomes map to these for callers/UI). */
export const BASE_PRICE_RESOLUTION_CODES = {
  PRICE_RESOLVED: "PRICE_RESOLVED",
  PRICE_CONFLICT: "PRICE_CONFLICT",
  NO_ELIGIBLE_PRICE: "NO_ELIGIBLE_PRICE",
} as const;

/**
 * Stable component type catalogue (NFR-010 / BRU-006).
 * Extensible without schema fork — register additional codes via composition config.
 */
export const COMMERCIAL_COMPONENT_TYPE_CODES = {
  PRINCIPAL: "PRINCIPAL",
  COMMISSION: "COMMISSION",
  FEE: "FEE",
  SURCHARGE: "SURCHARGE",
  DISCOUNT: "DISCOUNT",
  TAX: "TAX",
  LEVY: "LEVY",
} as const;

export type CommercialComponentTypeCode =
  (typeof COMMERCIAL_COMPONENT_TYPE_CODES)[keyof typeof COMMERCIAL_COMPONENT_TYPE_CODES];

export type CommercialComponentSign = "ADD" | "SUBTRACT";

export type CommercialComponentTypeDefinition = {
  code: string;
  label: string;
  sign: CommercialComponentSign;
  category: "BASE" | "CHARGE" | "TAX" | "ADJUSTMENT" | "OTHER";
  /** Default calculation order rank (lower = earlier). */
  defaultOrder: number;
};

/** Default type catalogue — businesses may extend via composition request. */
export const DEFAULT_COMMERCIAL_COMPONENT_TYPES: CommercialComponentTypeDefinition[] =
  [
    {
      code: COMMERCIAL_COMPONENT_TYPE_CODES.PRINCIPAL,
      label: "Principal / Base",
      sign: "ADD",
      category: "BASE",
      defaultOrder: 10,
    },
    {
      code: COMMERCIAL_COMPONENT_TYPE_CODES.COMMISSION,
      label: "Commission",
      sign: "ADD",
      category: "CHARGE",
      defaultOrder: 20,
    },
    {
      code: COMMERCIAL_COMPONENT_TYPE_CODES.FEE,
      label: "Fee",
      sign: "ADD",
      category: "CHARGE",
      defaultOrder: 30,
    },
    {
      code: COMMERCIAL_COMPONENT_TYPE_CODES.SURCHARGE,
      label: "Surcharge",
      sign: "ADD",
      category: "CHARGE",
      defaultOrder: 40,
    },
    {
      code: COMMERCIAL_COMPONENT_TYPE_CODES.DISCOUNT,
      label: "Discount",
      sign: "SUBTRACT",
      category: "ADJUSTMENT",
      defaultOrder: 50,
    },
    {
      code: COMMERCIAL_COMPONENT_TYPE_CODES.TAX,
      label: "Tax",
      sign: "ADD",
      category: "TAX",
      defaultOrder: 60,
    },
    {
      code: COMMERCIAL_COMPONENT_TYPE_CODES.LEVY,
      label: "Levy",
      sign: "ADD",
      category: "TAX",
      defaultOrder: 70,
    },
  ];

/** Default dependency-safe calculation order (documented template). */
export const DEFAULT_COMMERCIAL_COMPONENT_ORDER: string[] = [
  COMMERCIAL_COMPONENT_TYPE_CODES.PRINCIPAL,
  COMMERCIAL_COMPONENT_TYPE_CODES.COMMISSION,
  COMMERCIAL_COMPONENT_TYPE_CODES.FEE,
  COMMERCIAL_COMPONENT_TYPE_CODES.SURCHARGE,
  COMMERCIAL_COMPONENT_TYPE_CODES.DISCOUNT,
  COMMERCIAL_COMPONENT_TYPE_CODES.TAX,
  COMMERCIAL_COMPONENT_TYPE_CODES.LEVY,
];

/* -------------------------------------------------------------------------- */
/* BP-005 IP-03 — Tax treatments (extensible codes; not a closed industry set) */
/* -------------------------------------------------------------------------- */

export const TAX_TREATMENT_CODES = {
  EXCLUSIVE: "EXCLUSIVE",
  INCLUSIVE: "INCLUSIVE",
  ZERO_RATED: "ZERO_RATED",
  EXEMPT: "EXEMPT",
} as const;

export type TaxTreatmentCode =
  (typeof TAX_TREATMENT_CODES)[keyof typeof TAX_TREATMENT_CODES];

export const TAX_RULE_STATUS_CODES = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  ARCHIVED: "ARCHIVED",
} as const;

export type TaxRuleStatusCode =
  (typeof TAX_RULE_STATUS_CODES)[keyof typeof TAX_RULE_STATUS_CODES];

/**
 * Example tax type codes — not exhaustive. Businesses may supply any stable code.
 * Persistence of tax rule masters is not yet in-repo (documented gap).
 */
export const EXAMPLE_TAX_TYPE_CODES = {
  VAT: "VAT",
  ZERO_RATED: "ZERO_RATED",
  EXEMPT: "EXEMPT",
  LEVY: "LEVY",
  OTHER: "OTHER_CONFIGURED_TAX",
} as const;

/* -------------------------------------------------------------------------- */
/* BP-005 IP-04 — Commercial adjustments                                      */
/* -------------------------------------------------------------------------- */

export const ADJUSTMENT_METHOD_CODES = {
  PERCENTAGE: "PERCENTAGE",
  FIXED_AMOUNT: "FIXED_AMOUNT",
} as const;

export type AdjustmentMethodCode =
  (typeof ADJUSTMENT_METHOD_CODES)[keyof typeof ADJUSTMENT_METHOD_CODES];

export const ADJUSTMENT_DIRECTION_CODES = {
  DISCOUNT: "DISCOUNT",
  SURCHARGE: "SURCHARGE",
} as const;

export type AdjustmentDirectionCode =
  (typeof ADJUSTMENT_DIRECTION_CODES)[keyof typeof ADJUSTMENT_DIRECTION_CODES];

export const ADJUSTMENT_BASIS_CODES = {
  PRINCIPAL: "PRINCIPAL",
  COMMERCIAL_SUBTOTAL: "COMMERCIAL_SUBTOTAL",
} as const;

export type AdjustmentBasisCode =
  (typeof ADJUSTMENT_BASIS_CODES)[keyof typeof ADJUSTMENT_BASIS_CODES];

export const ADJUSTMENT_RULE_STATUS_CODES = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  ARCHIVED: "ARCHIVED",
} as const;

export type AdjustmentRuleStatusCode =
  (typeof ADJUSTMENT_RULE_STATUS_CODES)[keyof typeof ADJUSTMENT_RULE_STATUS_CODES];

export const ADJUSTMENT_STACKING_CODES = {
  ADDITIVE: "ADDITIVE",
  EXCLUSIVE: "EXCLUSIVE",
} as const;

export type AdjustmentStackingCode =
  (typeof ADJUSTMENT_STACKING_CODES)[keyof typeof ADJUSTMENT_STACKING_CODES];

/**
 * Dimensions supported by BP-003 IP-011 pricing_item today.
 * quantity is accepted on the IP-01 request for provenance / forward compatibility
 * but is NOT used for candidate filtering (no tier columns on pricing_item).
 */
export const BP003_SUPPORTED_PRICE_DIMENSIONS = [
  "offeringId",
  "pricingCatalogueId",
  "currencyCode",
  "customerSegment",
  "salesChannel",
  "region",
  "effectiveFrom",
  "effectiveTo",
  "status",
] as const;

export const BP003_UNSUPPORTED_PRICE_DIMENSIONS = [
  "quantity",
  "partyId",
] as const;
