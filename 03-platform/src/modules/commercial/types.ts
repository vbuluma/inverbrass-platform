/**
 * Purpose:
 * BP-005 commercial resolution contracts (IP-01 ? IP-09).
 *
 * Implementation Package:
 * BP-005 / IP-01 ? Base Price Consumption & Applicable Selection
 * BP-005 / IP-02 ? Price Components & Charge Composition
 * BP-005 / IP-03 ? Tax Rules & Calculation
 * BP-005 / IP-04 ? Discounts & Commercial Adjustments
 * BP-005 / IP-05 ? Pricing Precedence, Eligibility & Conflict Resolution
 * BP-005 / IP-06 ? Commercial Resolution Snapshot & Transaction Contract
 * BP-005 / IP-07 ? Expected Commercial Amount
 * BP-005 / IP-08 ? Commercial Governance
 * BP-005 / IP-09 ? Commercial Validation & Resilience
 */

import type {
  AdjustmentBasisCode,
  AdjustmentDirectionCode,
  AdjustmentMethodCode,
  AdjustmentRuleStatusCode,
  AdjustmentStackingCode,
  CommercialComponentSign,
  CommercialComponentTypeDefinition,
  CommercialContractStatus,
  CommercialContractVersion,
  CommercialErrorFamily,
  CommercialGovernanceDecisionCode,
  CommercialGovernanceLifecycleCode,
  CommercialOverrideStatusCode,
  CommercialRuleTypeCode,
  CommercialValidationStage,
  TaxRuleStatusCode,
  TaxTreatmentCode,
} from "@/modules/commercial/constants";
import type { CommercialErrorCode } from "@/modules/commercial/errors";
import type { CommercialRoundingMode } from "@/modules/commercial/money/commercial-money";

/** Request context for base/unit price consumption from BP-003. */
export type BasePriceResolutionRequest = {
  businessId: string;
  offeringId: string;
  /** ISO currency code ? required for deterministic commercial resolution. */
  currencyCode: string;
  pricingCatalogueId?: string | null;
  /** Optional party reference retained for provenance only (no BP-003 party filter). */
  partyId?: string | null;
  customerSegment?: string | null;
  salesChannel?: string | null;
  region?: string | null;
  /**
   * Accepted for forward compatibility / provenance.
   * Not used for filtering ? BP-003 pricing_item has no quantity-tier columns.
   */
  quantity?: number | null;
  /** Explicit as-at / effective date. Defaults to now when omitted. */
  effectiveAt?: Date | string | null;
};

/** One BP-003 price item that matches lifecycle + dimensions for the as-at date. */
export type BasePriceCandidate = {
  pricingItemId: string;
  offeringId: string;
  offeringCode: string;
  offeringName: string;
  pricingCatalogueId: string;
  catalogueCode: string;
  catalogueName: string;
  catalogueStatus: string;
  currencyCode: string;
  unitPrice: number;
  minimumPrice: number | null;
  maximumPrice: number | null;
  pricingMethod: string;
  pricingMethodLabel: string;
  customerSegment: string | null;
  salesChannel: string | null;
  region: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: string;
};

export type BasePriceResolutionProvenance = {
  businessId: string;
  offeringId: string;
  effectiveAt: string;
  pricingCatalogueId: string;
  catalogueCode: string;
  catalogueName: string;
  pricingItemId: string;
  pricingMethod: string;
  pricingMethodLabel: string;
  dimensions: {
    currencyCode: string;
    customerSegment: string | null;
    salesChannel: string | null;
    region: string | null;
    pricingCatalogueId: string | null;
    partyId: string | null;
    quantity: number | null;
  };
  /** Candidate count after IP-01 filters, before IP-05 winner selection. */
  candidateCount: number;
  /** Owner of final winner selection. */
  precedenceOwner: "IP-05";
  /** How IP-05 selected (or failed). */
  selectionMode: "SINGLE_CANDIDATE" | "SPECIFICITY" | "CONFLICT";
  /** Structured IP-05 explanation (why this price won). */
  precedenceDecision?: BasePricePrecedenceExplanation;
  unsupportedDimensionsNoted: string[];
};

export type BasePriceScoredCandidate = {
  candidate: BasePriceCandidate;
  score: number;
  dimensionBreakdown: {
    catalogue: number;
    customerSegment: number;
    salesChannel: number;
    region: number;
    currency: number;
  };
};

/** Deterministic structured explanation ? not narrative/LLM text. */
export type BasePricePrecedenceExplanation = {
  resolutionCode: "PRICE_RESOLVED" | "PRICE_CONFLICT" | "NO_ELIGIBLE_PRICE";
  candidateCount: number;
  eligibleCandidateCount: number;
  winningPricingItemId: string | null;
  winningScore: number;
  selectionMode:
    | "SINGLE_CANDIDATE"
    | "SPECIFICITY"
    | "CONFLICT"
    | "MISSING";
  precedenceStage:
    | "NO_CANDIDATES"
    | "SINGLE_CANDIDATE"
    | "SPECIFICITY_COMPARISON"
    | "SPECIFICITY_TIE";
  ranked: Array<{
    pricingItemId: string;
    pricingCatalogueId: string;
    catalogueCode: string;
    unitPrice: number;
    score: number;
    dimensionBreakdown: BasePriceScoredCandidate["dimensionBreakdown"];
  }>;
  suppressed: Array<{
    pricingItemId: string;
    pricingCatalogueId: string;
    unitPrice: number;
    score: number;
    reason: string;
  }>;
  tiedPricingItemIds: string[];
  conflictReason: string | null;
  requestDimensions: {
    currencyCode: string;
    pricingCatalogueId: string | null;
    customerSegment: string | null;
    salesChannel: string | null;
    region: string | null;
  };
  effectiveAt: string;
};

/** Successful resolved base/unit price ? input to future IP-02 / IP-06. */
export type ResolvedBasePrice = {
  unitPrice: number;
  currencyCode: string;
  pricingMethod: string;
  pricingMethodLabel: string;
  pricingCatalogueId: string;
  catalogueCode: string;
  catalogueName: string;
  pricingItemId: string;
  offeringId: string;
  offeringCode: string;
  offeringName: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  effectiveAt: string;
  minimumPrice: number | null;
  maximumPrice: number | null;
  customerSegment: string | null;
  salesChannel: string | null;
  region: string | null;
  provenance: BasePriceResolutionProvenance;
  resolvedAt: string;
};

/** Payload passed to IP-05 when candidates are identified. */
export type BasePricePrecedenceInput = {
  request: BasePriceResolutionRequest;
  effectiveAt: Date;
  candidates: BasePriceCandidate[];
};

export type BasePricePrecedenceResult =
  | {
      outcome: "WINNER";
      resolutionCode: "PRICE_RESOLVED";
      winner: BasePriceCandidate;
      selectionMode: "SINGLE_CANDIDATE" | "SPECIFICITY";
      suppressed: BasePriceCandidate[];
      explanation: BasePricePrecedenceExplanation;
    }
  | {
      outcome: "CONFLICT";
      resolutionCode: "PRICE_CONFLICT";
      candidates: BasePriceCandidate[];
      tied: BasePriceCandidate[];
      explanation: BasePricePrecedenceExplanation;
    }
  | {
      outcome: "MISSING";
      resolutionCode: "NO_ELIGIBLE_PRICE";
      explanation: BasePricePrecedenceExplanation;
    };

export type IdentifyBasePriceCandidatesResult = {
  effectiveAt: Date;
  candidates: BasePriceCandidate[];
  unsupportedDimensionsNoted: string[];
};

/* -------------------------------------------------------------------------- */
/* BP-005 IP-02 ? Commercial component model & composition                    */
/* -------------------------------------------------------------------------- */

export type CommercialComponentProvenance = {
  source:
    | "IP-01_RESOLVED_BASE_PRICE"
    | "IP-03_TAX_RESOLUTION"
    | "IP-04_ADJUSTMENT_RESOLUTION"
    | "SUPPLIED_COMPONENT"
    | "COMPONENT_TYPE_CATALOGUE";
  pricingItemId?: string | null;
  pricingCatalogueId?: string | null;
  pricingMethod?: string | null;
  ruleId?: string | null;
  ruleVersion?: string | null;
  notes?: string | null;
};

/** Input contribution for a non-principal component (from future IP-03/04 or tests). */
export type CommercialComponentContribution = {
  /** Stable identity for this component instance within the composition. */
  componentId: string;
  componentTypeCode: string;
  /** Magnitude before sign application (always non-negative). */
  amount: string | number;
  currencyCode: string;
  calculationBasis?: string | null;
  dependsOn?: string[];
  provenance?: Omit<CommercialComponentProvenance, "source"> & {
    source?: CommercialComponentProvenance["source"];
  };
};

export type ResolvedCommercialComponent = {
  componentId: string;
  componentTypeCode: string;
  componentTypeLabel: string;
  sign: CommercialComponentSign;
  category: CommercialComponentTypeDefinition["category"];
  /** Signed amount as decimal string at internal scale. */
  amount: string;
  /** Signed amount as number for downstream numeric APIs (scale-safe via scaled math). */
  amountNumber: number;
  currencyCode: string;
  calculationBasis: string;
  calculationOrder: number;
  provenance: CommercialComponentProvenance;
};

export type CommercialCompositionRequest = {
  businessId: string;
  /** Required ? must be produced by BP-005 IP-01 (do not invent). */
  resolvedBasePrice: ResolvedBasePrice;
  /** Quantity applied to unit base price for principal (default 1). */
  quantity?: number | null;
  /**
   * When tax-inclusive extraction adjusts net principal (IP-03), override
   * the principal magnitude while retaining IP-01 provenance on the base price.
   */
  principalAmountOverride?: string | number | null;
  principalOverrideBasis?: string | null;
  /**
   * Additional components calculated by later IPs or supplied for composition.
   * IP-02 does not invent tax/discount/commission amounts.
   */
  additionalComponents?: CommercialComponentContribution[];
  /** Override default type catalogue (extensibility). */
  componentTypes?: CommercialComponentTypeDefinition[];
  /** Explicit calculation order by component type code. */
  componentOrder?: string[];
  /** Dependency edges: from componentId ? depends on componentId. */
  dependencyEdges?: Array<{ fromComponentId: string; toComponentId: string }>;
  presentationScale?: number;
  roundingMode?: CommercialRoundingMode;
};

export type ResolvedCommercialComposition = {
  businessId: string;
  currencyCode: string;
  effectiveAt: string;
  offeringId: string;
  quantity: number;
  components: ResolvedCommercialComponent[];
  /** Signed sum of components after ordering/rounding policy (payable candidate). */
  payableCandidate: string;
  payableCandidateNumber: number;
  presentationScale: number;
  roundingMode: CommercialRoundingMode;
  reconciled: true;
  basePriceProvenance: ResolvedBasePrice["provenance"];
  composedAt: string;
};

/* -------------------------------------------------------------------------- */
/* BP-005 IP-03 ? Tax resolution contracts                                    */
/* -------------------------------------------------------------------------- */

/**
 * In-memory / supplied tax rule configuration.
 * No tax_rule persistence exists in-repo yet ? documented architectural gap.
 */
export type TaxRuleConfiguration = {
  taxRuleId: string;
  businessId: string;
  taxTypeCode: string;
  taxTypeLabel: string;
  /** Percent rate, e.g. 16 for 16%. Must be 0 for ZERO_RATED / EXEMPT. */
  ratePercent: number;
  treatment: TaxTreatmentCode;
  status: TaxRuleStatusCode;
  effectiveFrom: string;
  effectiveTo?: string | null;
  currencyCode?: string | null;
  offeringId?: string | null;
  customerSegment?: string | null;
  salesChannel?: string | null;
  region?: string | null;
  /** Reserved for ENG-003b jurisdiction context when available. */
  jurisdictionCode?: string | null;
  ruleVersion?: string | null;
};

export type TaxResolutionRequest = {
  businessId: string;
  currencyCode: string;
  /** Taxable / gross base amount before or including tax (depending on treatment). */
  baseAmount: string | number;
  effectiveAt?: Date | string | null;
  taxRules: TaxRuleConfiguration[];
  offeringId?: string | null;
  customerSegment?: string | null;
  salesChannel?: string | null;
  region?: string | null;
  jurisdictionCode?: string | null;
  /**
   * When true (default), missing applicable rules ? TAX_CONFIGURATION_MISSING.
   * When false, empty result is allowed (no tax components).
   */
  requireTaxConfiguration?: boolean;
  presentationScale?: number;
  roundingMode?: CommercialRoundingMode;
};

export type ResolvedTaxComponent = {
  componentId: string;
  componentTypeCode: "TAX" | "LEVY";
  taxTypeCode: string;
  taxTypeLabel: string;
  treatment: TaxTreatmentCode;
  ratePercent: number;
  /** Non-negative tax amount as decimal string. */
  taxAmount: string;
  taxAmountNumber: number;
  /** Basis amount used in the calculation (net or gross depending on treatment). */
  calculationBasisAmount: string;
  calculationBasis: string;
  currencyCode: string;
  effectiveAt: string;
  taxRuleId: string;
  ruleVersion: string | null;
  resolvedAt: string;
};

export type TaxResolutionResult = {
  businessId: string;
  currencyCode: string;
  effectiveAt: string;
  treatment: TaxTreatmentCode | "MULTI";
  taxComponents: ResolvedTaxComponent[];
  /**
   * For INCLUSIVE resolution: net principal after extracting tax from gross base.
   * Null for exclusive / zero / exempt (principal remains IP-01 base).
   */
  netPrincipalAmount: string | null;
  grossAmount: string;
  totalTaxAmount: string;
  totalTaxAmountNumber: number;
  /** Contributions ready for IP-02 additionalComponents. */
  compositionContributions: CommercialComponentContribution[];
};

/* -------------------------------------------------------------------------- */
/* BP-005 IP-04 ? Discount / commercial adjustment contracts                  */
/* -------------------------------------------------------------------------- */

/**
 * In-memory / supplied adjustment rule configuration.
 * No discount_rule persistence exists in-repo ? documented gap.
 */
export type CommercialAdjustmentRuleConfiguration = {
  adjustmentRuleId: string;
  businessId: string;
  adjustmentCode: string;
  adjustmentLabel: string;
  method: AdjustmentMethodCode;
  direction: AdjustmentDirectionCode;
  basis: AdjustmentBasisCode;
  /** Required when method = PERCENTAGE */
  percentage?: number | null;
  /** Required when method = FIXED_AMOUNT */
  fixedAmount?: string | number | null;
  status: AdjustmentRuleStatusCode;
  effectiveFrom: string;
  effectiveTo?: string | null;
  currencyCode?: string | null;
  offeringId?: string | null;
  customerSegment?: string | null;
  salesChannel?: string | null;
  region?: string | null;
  /** Optional min quantity gate (contract only; quantity not on BP-003 price tiers). */
  minQuantity?: number | null;
  maxQuantity?: number | null;
  /** Cap as absolute amount after calculation. */
  maxAmount?: string | number | null;
  /** Cap as max percentage of basis (for FIXED conversions / safety). */
  maxPercent?: number | null;
  /** When calculated amount exceeds this, approval is required (ENG-005 later). */
  approvalThresholdAmount?: string | number | null;
  stacking: AdjustmentStackingCode;
  ruleVersion?: string | null;
};

export type CommercialAdjustmentResolutionRequest = {
  businessId: string;
  currencyCode: string;
  /** Principal amount (post inclusive-tax net when applicable). */
  principalAmount: string | number;
  /**
   * Commercial subtotal before adjustments = principal + additive components
   * already resolved (e.g. tax, fees). Used when basis = COMMERCIAL_SUBTOTAL.
   */
  commercialSubtotalAmount?: string | number | null;
  quantity?: number | null;
  effectiveAt?: Date | string | null;
  adjustmentRules: CommercialAdjustmentRuleConfiguration[];
  offeringId?: string | null;
  customerSegment?: string | null;
  salesChannel?: string | null;
  region?: string | null;
  /**
   * When true, missing candidates ? ADJUSTMENT_CONFIGURATION_MISSING.
   * Default false ? adjustments are optional unless required by caller.
   */
  requireAdjustmentConfiguration?: boolean;
  /** When true, threshold breach fails closed (no ENG-005 yet). Default true. */
  enforceApprovalThreshold?: boolean;
  /** When false (default), payable < 0 fails. */
  allowNegativePayable?: boolean;
  presentationScale?: number;
  roundingMode?: CommercialRoundingMode;
};

export type ResolvedCommercialAdjustment = {
  componentId: string;
  componentTypeCode: "DISCOUNT" | "SURCHARGE";
  adjustmentCode: string;
  adjustmentLabel: string;
  method: AdjustmentMethodCode;
  direction: AdjustmentDirectionCode;
  basis: AdjustmentBasisCode;
  percentage: number | null;
  configuredFixedAmount: string | null;
  /** Non-negative magnitude before sign. */
  adjustmentAmount: string;
  adjustmentAmountNumber: number;
  calculationBasisAmount: string;
  calculationBasis: string;
  currencyCode: string;
  effectiveAt: string;
  adjustmentRuleId: string;
  ruleVersion: string | null;
  capped: boolean;
  requiresApproval: boolean;
  resolvedAt: string;
};

export type CommercialAdjustmentResolutionResult = {
  businessId: string;
  currencyCode: string;
  effectiveAt: string;
  adjustments: ResolvedCommercialAdjustment[];
  totalDiscountAmount: string;
  totalDiscountAmountNumber: number;
  totalSurchargeAmount: string;
  totalSurchargeAmountNumber: number;
  compositionContributions: CommercialComponentContribution[];
};

/* -------------------------------------------------------------------------- */
/* BP-005 IP-06 ? Commercial resolution snapshot & transaction contract       */
/* -------------------------------------------------------------------------- */

/**
 * Canonical resolve request for the full commercial pipeline.
 * Tax/adjustment rules remain supplied (in-memory) until masters exist.
 */
export type CommercialResolutionRequest = {
  businessId: string;
  offeringId: string;
  currencyCode: string;
  quantity?: number | null;
  partyId?: string | null;
  customerSegment?: string | null;
  salesChannel?: string | null;
  region?: string | null;
  pricingCatalogueId?: string | null;
  effectiveAt?: Date | string | null;
  taxRules?: TaxRuleConfiguration[];
  adjustmentRules?: CommercialAdjustmentRuleConfiguration[];
  requireTaxConfiguration?: boolean;
  requireAdjustmentConfiguration?: boolean;
  allowNegativePayable?: boolean;
  presentationScale?: number;
  roundingMode?: CommercialRoundingMode;
};

export type CommercialResolutionComponentView = {
  componentId: string;
  componentType: string;
  componentCode: string;
  description: string;
  amount: string;
  amountNumber: number;
  currencyCode: string;
  rate: number | null;
  calculationBasis: string;
  source: CommercialComponentProvenance["source"] | string;
  provenance: CommercialComponentProvenance;
};

/**
 * Authoritative commercial resolution result for downstream consumers.
 * Downstream must not re-query pricing_item / tax / discount masters.
 */
export type CommercialResolution = {
  resolutionId: string;
  businessId: string;
  partyId: string | null;
  offeringId: string;
  offeringCode: string;
  offeringName: string;
  channel: string | null;
  catalogueId: string;
  catalogueCode: string;
  currencyCode: string;
  quantity: number;
  effectiveAt: string;
  resolvedAt: string;
  status: "RESOLVED";
  basePrice: {
    unitPrice: number;
    pricingItemId: string;
    pricingCatalogueId: string;
    pricingMethod: string;
    pricingMethodLabel: string;
  };
  components: CommercialResolutionComponentView[];
  /** Authoritative payable ? not payment collected. */
  payable: string;
  payableNumber: number;
  /**
   * Explicit separation: IP-06 never owns actual collection.
   * Always null ? payment belongs to BP-007+.
   */
  paymentCollected: null;
  paymentNote: string;
  provenance: {
    basePrice: ResolvedBasePrice["provenance"];
    taxRuleIds: string[];
    adjustmentRuleIds: string[];
    compositionReconciled: true;
    pipeline: string;
  };
  /** Upstream artefacts retained for audit ? consumers may ignore internals. */
  resolvedBasePrice: ResolvedBasePrice;
  composition: ResolvedCommercialComposition;
  tax: TaxResolutionResult | null;
  adjustments: CommercialAdjustmentResolutionResult | null;
};

/**
 * Immutable freeze of a CommercialResolution for downstream transaction use.
 * Persistence decision: application-level value object (not a second transactional master).
 * BP-006+ owns durable commit storage when a transaction is created.
 */
export type CommercialSnapshot = {
  snapshotId: string;
  businessId: string;
  frozenAt: string;
  integrityHash: string;
  immutable: true;
  /** Deep-copied monetary/commercial payload ? independent of later config changes. */
  resolution: CommercialResolution;
};

/* -------------------------------------------------------------------------- */
/* BP-005 IP-07 ? Expected commercial amount (projection from IP-06)          */
/* -------------------------------------------------------------------------- */

/**
 * Role of a line in the expected-amount breakdown.
 * Positive charges increase expected; reductions decrease expected.
 */
export type ExpectedAmountLineRole =
  | "PRINCIPAL"
  | "CHARGE"
  | "COMMISSION"
  | "TAX"
  | "REDUCTION"
  | "OTHER";

/**
 * Component-level expected amount preserved from the IP-06 snapshot.
 * Amounts keep the snapshot signed convention (ADD positive / SUBTRACT negative).
 */
export type ExpectedCommercialComponent = {
  componentId: string;
  componentType: string;
  componentCode: string;
  description: string;
  /** Signed amount from snapshot (ADD +, SUBTRACT ?). */
  amount: string;
  amountNumber: number;
  /** Non-negative magnitude used in role aggregates. */
  magnitude: string;
  magnitudeNumber: number;
  currencyCode: string;
  role: ExpectedAmountLineRole;
  sign: "ADD" | "SUBTRACT";
  calculationBasis: string;
  provenance: CommercialComponentProvenance;
};

/**
 * Immutable expected-value contract derived solely from an IP-06 CommercialSnapshot.
 *
 * Expected Commercial Amount ? Actual Amount Collected.
 * IP-07 never records payments, allocations, or variance engines.
 */
export type ExpectedCommercialAmount = {
  businessId: string;
  snapshotId: string;
  resolutionId: string;
  /**
   * Deterministic for a given snapshot ? equals snapshot.frozenAt.
   * Must not affect financial amounts.
   */
  generatedAt: string;
  effectiveAt: string;

  /** Principal / base commercial amount (IP-01 origin via snapshot). */
  principalAmount: string;
  principalAmountNumber: number;
  /**
   * Sum of positive charge magnitudes excluding principal and tax
   * (commission, fee, surcharge, other ADD charges).
   */
  totalComponentAmount: string;
  totalComponentAmountNumber: number;
  /** Non-negative magnitude of discounts / reductions. */
  totalDiscountAmount: string;
  totalDiscountAmountNumber: number;
  /** Non-negative magnitude of tax / levy. */
  totalTaxAmount: string;
  totalTaxAmountNumber: number;
  /** Non-negative magnitude of commission charges. */
  totalCommissionAmount: string;
  totalCommissionAmountNumber: number;
  /** Authoritative payable from IP-06 snapshot. */
  payableAmount: string;
  payableAmountNumber: number;
  /**
   * Amount the business expects to charge/collect ? equals payableAmount
   * and reconciles to principal + charges + tax ? discounts.
   */
  expectedAmount: string;
  expectedAmountNumber: number;
  currency: string;

  components: ExpectedCommercialComponent[];

  /**
   * Explicit actual-vs-expected boundary ? always unavailable in IP-07.
   */
  actualAmountCollected: null;
  actualAmountNote: string;
  variance: null;
  varianceNote: string;

  /**
   * Payment split is out of scope ? expected amount only.
   */
  paymentAllocation: null;
  paymentAllocationNote: string;

  signConvention: string;
  provenance: {
    snapshotId: string;
    businessId: string;
    currency: string;
    integrityHash: string;
    pipeline: string;
    commercialPipeline: CommercialResolution["provenance"]["pipeline"];
    basePrice: ResolvedBasePrice["provenance"];
    taxRuleIds: string[];
    adjustmentRuleIds: string[];
    compositionReconciled: true;
    ip: "IP-07";
  };
};

export type CalculateExpectedAmountRequest = {
  /** Optional explicit business scope check (must match snapshot.businessId). */
  businessId?: string;
};

/* -------------------------------------------------------------------------- */
/* BP-005 IP-08 ? Commercial governance                                       */
/* -------------------------------------------------------------------------- */

/** Actor for governance actions ? integrates with existing auth identity. */
export type CommercialGovernanceActor = {
  userId: string;
  /** Platform permission codes (Module.Resource.Action). Empty = unauthorized. */
  permissions: string[];
  roleCode?: string | null;
  displayName?: string | null;
};

export type CommercialGovernancePolicyView = {
  policyId: string;
  businessId: string;
  approvalRequired: boolean;
  requiresSegregationOfDuties: boolean;
  requiredApproverCount: number;
  approvalThresholdAmount: string | null;
  approvalThresholdCurrency: string | null;
  allowOverride: boolean;
  overrideRequiresApproval: boolean;
  mandatoryJustification: boolean;
  materialFieldPaths: string[];
  isActive: boolean;
};

export type CommercialRuleVersionView = {
  ruleVersionId: string;
  businessId: string;
  ruleKey: string;
  ruleType: CommercialRuleTypeCode | string;
  versionNumber: number;
  lifecycleStatus: CommercialGovernanceLifecycleCode;
  label: string;
  description: string | null;
  payload: Record<string, unknown>;
  currencyCode: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  previousVersionId: string | null;
  supersededByVersionId: string | null;
  approvalRequired: boolean;
  submittedBy: string | null;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  activatedBy: string | null;
  activatedAt: string | null;
  suspendedBy: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
  retiredBy: string | null;
  retiredAt: string | null;
  retirementReason: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommercialGovernanceEventView = {
  eventId: string;
  businessId: string;
  ruleVersionId: string;
  eventType: string;
  actorUserId: string | null;
  beforeStatus: string | null;
  afterStatus: string | null;
  beforePayload: Record<string, unknown> | null;
  afterPayload: Record<string, unknown> | null;
  reason: string | null;
  approvalStatus: string | null;
  performedAt: string;
};

export type CommercialOverrideRequestView = {
  overrideId: string;
  businessId: string;
  ruleVersionId: string | null;
  snapshotId: string | null;
  resolutionId: string | null;
  status: CommercialOverrideStatusCode;
  reason: string;
  originalValue: Record<string, unknown>;
  overriddenValue: Record<string, unknown>;
  applicableRuleKey: string | null;
  requestedBy: string;
  requestedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
};

/**
 * Deterministic governance decision ? not a pricing calculation.
 */
export type CommercialGovernanceDecision = {
  decision: CommercialGovernanceDecisionCode;
  reason: string;
  governanceRule: string;
  businessId: string;
  actorUserId: string;
  approvalReference: string | null;
  ruleVersionId: string | null;
  timestamp: string;
  details?: Record<string, unknown>;
};

export type CreateCommercialRuleDraftInput = {
  ruleKey: string;
  ruleType: CommercialRuleTypeCode | string;
  label: string;
  description?: string | null;
  payload: Record<string, unknown>;
  currencyCode?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  previousVersionId?: string | null;
};

export type UpdateCommercialRuleDraftInput = {
  ruleVersionId: string;
  label?: string;
  description?: string | null;
  payload?: Record<string, unknown>;
  currencyCode?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
};

export type UpsertCommercialGovernancePolicyInput = {
  approvalRequired?: boolean;
  requiresSegregationOfDuties?: boolean;
  requiredApproverCount?: number;
  approvalThresholdAmount?: string | null;
  approvalThresholdCurrency?: string | null;
  allowOverride?: boolean;
  overrideRequiresApproval?: boolean;
  mandatoryJustification?: boolean;
  materialFieldPaths?: string[];
};

export type RequestCommercialOverrideInput = {
  ruleVersionId?: string | null;
  snapshotId?: string | null;
  resolutionId?: string | null;
  reason: string;
  originalValue: Record<string, unknown>;
  overriddenValue: Record<string, unknown>;
  applicableRuleKey?: string | null;
};

export type CommercialGovernanceWorkspaceView = {
  policy: CommercialGovernancePolicyView;
  drafts: CommercialRuleVersionView[];
  pendingApproval: CommercialRuleVersionView[];
  active: CommercialRuleVersionView[];
  suspended: CommercialRuleVersionView[];
  recentEvents: CommercialGovernanceEventView[];
  pendingOverrides: CommercialOverrideRequestView[];
};

/* -------------------------------------------------------------------------- */
/* BP-005 IP-09 ? Commercial validation & resilience                          */
/* -------------------------------------------------------------------------- */

/** Machine-readable commercial error for BP-006 / BP-007 / IP-10 consumers. */
export type StructuredCommercialErrorPayload = {
  code: CommercialErrorCode | string;
  family: CommercialErrorFamily | string;
  message: string;
  field?: string | null;
  ruleId?: string | null;
  businessId?: string | null;
  offeringId?: string | null;
  currencyCode?: string | null;
  details?: Record<string, unknown> | null;
  actionableHint: string;
  stage: CommercialValidationStage | string;
  ip: "IP-09";
  /** Commercial config failures are not retryable without a config change. */
  retryable: false;
  /** Explicit: no payable was produced. */
  payableProduced: false;
};

export type CommercialRequiredConfigPolicy = {
  requireBasePrice: boolean;
  requireTaxConfiguration: boolean;
  requireAdjustmentConfiguration: boolean;
  allowMixedCurrency: boolean;
  allowNegativePayable: boolean;
  allowSilentZeroFallback: boolean;
};

export type CommercialValidationIssue = {
  code: CommercialErrorCode | string;
  family: CommercialErrorFamily | string;
  message: string;
  field?: string | null;
  ruleId?: string | null;
  stage: CommercialValidationStage | string;
  actionableHint: string;
  details?: Record<string, unknown> | null;
};

export type CommercialValidationReport = {
  ok: boolean;
  stage: CommercialValidationStage | string;
  businessId: string;
  issues: CommercialValidationIssue[];
  /** Present only when ok ? never invent a payable on failure. */
  determinismFingerprint?: string | null;
};

export type CommercialPreValidationInput = {
  businessId: string;
  offeringId?: string | null;
  currencyCode?: string | null;
  quantity?: number | null;
  taxRules?: TaxRuleConfiguration[];
  adjustmentRules?: CommercialAdjustmentRuleConfiguration[];
  requireTaxConfiguration?: boolean;
  requireAdjustmentConfiguration?: boolean;
  allowNegativePayable?: boolean;
  policy?: Partial<CommercialRequiredConfigPolicy>;
};

/* -------------------------------------------------------------------------- */
/* BP-005 IP-10 ? Downstream commercial contract                              */
/* -------------------------------------------------------------------------- */

/**
 * Authoritative downstream commercial exchange format (v1).
 * Built solely from IP-06 snapshot + IP-07 expected amount + IP-09 validation.
 * Downstream must not recalculate pricing/tax/discounts from this payload.
 */
export type CommercialTransactionContract = {
  contractVersion: CommercialContractVersion | string;
  /** Deterministic for a given snapshot integrity ? not a new commercial calculation. */
  contractId: string;
  ip: "IP-10";
  status: CommercialContractStatus | string;

  identity: {
    businessId: string;
    snapshotId: string;
    resolutionId: string;
    /** Stable expected-amount identity derived from snapshot (no separate table). */
    expectedAmountId: string;
    effectiveAt: string;
    frozenAt: string;
    generatedAt: string;
  };

  commercial: {
    currency: string;
    principalAmount: string;
    principalAmountNumber: number;
    totalCharges: string;
    totalChargesNumber: number;
    totalDiscounts: string;
    totalDiscountsNumber: number;
    totalTax: string;
    totalTaxNumber: number;
    totalCommission: string;
    totalCommissionNumber: number;
    /** Authoritative expected payable ? equals IP-07 expectedAmount / IP-06 payable. */
    expectedPayable: string;
    expectedPayableNumber: number;
  };

  breakdown: ExpectedCommercialComponent[];

  provenance: {
    snapshotId: string;
    resolutionId: string;
    businessId: string;
    currency: string;
    pricingCatalogueId: string | null;
    pricingItemId: string | null;
    pricingMethod: string | null;
    pricingMethodLabel: string | null;
    catalogueCode: string | null;
    precedenceOwner: string | null;
    selectionMode: string | null;
    taxRuleIds: string[];
    adjustmentRuleIds: string[];
    pipeline: string;
    commercialPipeline: string;
    basePrice: ResolvedBasePrice["provenance"];
  };

  integrity: {
    snapshotIntegrityHash: string;
    determinismFingerprint: string | null;
    immutable: true;
    validationStatus: "PASSED";
    expectedReconcilesToPayable: true;
  };

  /**
   * Explicit RA / payment boundary ? actual collection belongs to BP-007+.
   */
  actualAmountCollected: null;
  revenueAssuranceNote: string;
  paymentAllocation: null;

  /** Echo of consumer correlation for idempotent reads (optional). */
  consumerRef: string | null;
  consumedAt: string;
};

export type ConsumeCommercialContractRequest = {
  businessId: string;
  snapshot: CommercialSnapshot;
  /** Optional pre-computed expected; when omitted, derived from snapshot via IP-07. */
  expected?: ExpectedCommercialAmount | null;
  /** When set, must match contract currency ? no FX. */
  expectedCurrency?: string | null;
  /** Optional consumer correlation key (does not mutate commercial amounts). */
  consumerRef?: string | null;
  /**
   * Optional downstream transaction context for idempotency documentation.
   * Does not create orders/payments.
   */
  downstreamContextKey?: string | null;
};

export type ValidateCommercialContractRequest = {
  businessId: string;
  contract: CommercialTransactionContract;
  snapshot?: CommercialSnapshot | null;
};

