/**
 * Purpose:
 * Public exports for BP-005 commercial resolution (IP-01 … IP-10).
 *
 * Implementation Package:
 * BP-005 / IP-01 – Base Price Consumption & Applicable Selection
 * BP-005 / IP-02 – Price Components & Charge Composition
 * BP-005 / IP-03 – Tax Rules & Calculation
 * BP-005 / IP-04 – Discounts & Commercial Adjustments
 * BP-005 / IP-05 – Pricing Precedence, Eligibility & Conflict Resolution
 * BP-005 / IP-06 – Commercial Resolution Snapshot & Transaction Contract
 * BP-005 / IP-07 – Expected Commercial Amount
 * BP-005 / IP-08 – Commercial Governance
 * BP-005 / IP-09 – Commercial Validation & Resilience
 * BP-005 / IP-10 – Downstream Commercial Contract & Integration
 */

export {
  ADJUSTMENT_BASIS_CODES,
  ADJUSTMENT_DIRECTION_CODES,
  ADJUSTMENT_METHOD_CODES,
  ADJUSTMENT_RULE_STATUS_CODES,
  ADJUSTMENT_STACKING_CODES,
  BASE_PRICE_PRECEDENCE_STAGES,
  BASE_PRICE_PRECEDENCE_WEIGHTS,
  BASE_PRICE_RESOLUTION_CODES,
  BP003_SUPPORTED_PRICE_DIMENSIONS,
  BP003_UNSUPPORTED_PRICE_DIMENSIONS,
  COMMERCIAL_BUILD_PACK,
  COMMERCIAL_COMPONENT_TYPE_CODES,
  COMMERCIAL_CONTRACT_CONSUMER_PACKS,
  COMMERCIAL_CONTRACT_STATUSES,
  COMMERCIAL_CONTRACT_VERSION,
  COMMERCIAL_ERROR_FAMILIES,
  COMMERCIAL_IP,
  COMMERCIAL_VALIDATION_STAGES,
  DEFAULT_COMMERCIAL_COMPONENT_ORDER,
  DEFAULT_COMMERCIAL_COMPONENT_TYPES,
  DEFAULT_COMMERCIAL_REQUIRED_CONFIG,
  EXAMPLE_TAX_TYPE_CODES,
  EXPECTED_AMOUNT_SIGN_CONVENTION,
  TAX_RULE_STATUS_CODES,
  TAX_TREATMENT_CODES,
  type AdjustmentBasisCode,
  type AdjustmentDirectionCode,
  type AdjustmentMethodCode,
  type AdjustmentRuleStatusCode,
  type AdjustmentStackingCode,
  type BasePricePrecedenceStage,
  type CommercialComponentSign,
  type CommercialComponentTypeCode,
  type CommercialComponentTypeDefinition,
  type CommercialContractStatus,
  type CommercialContractVersion,
  type CommercialErrorFamily,
  type CommercialValidationStage,
  type TaxRuleStatusCode,
  type TaxTreatmentCode,
} from "@/modules/commercial/constants";

export {
  CommercialError,
  COMMERCIAL_ERROR_ACTIONABLE_HINTS,
  COMMERCIAL_ERROR_CODE_FAMILY,
  COMMERCIAL_ERROR_CODES,
  COMMERCIAL_USER_MESSAGES,
  type CommercialErrorCode,
} from "@/modules/commercial/errors";

export type {
  BasePriceCandidate,
  BasePricePrecedenceExplanation,
  BasePricePrecedenceInput,
  BasePricePrecedenceResult,
  BasePriceResolutionProvenance,
  BasePriceResolutionRequest,
  BasePriceScoredCandidate,
  CommercialAdjustmentResolutionRequest,
  CommercialAdjustmentResolutionResult,
  CommercialAdjustmentRuleConfiguration,
  CommercialComponentContribution,
  CommercialComponentProvenance,
  CommercialCompositionRequest,
  IdentifyBasePriceCandidatesResult,
  ResolvedBasePrice,
  ResolvedCommercialAdjustment,
  ResolvedCommercialComponent,
  ResolvedCommercialComposition,
  ResolvedTaxComponent,
  TaxResolutionRequest,
  TaxResolutionResult,
  TaxRuleConfiguration,
  CommercialResolution,
  CommercialResolutionComponentView,
  CommercialResolutionRequest,
  CommercialSnapshot,
  CalculateExpectedAmountRequest,
  ExpectedAmountLineRole,
  ExpectedCommercialAmount,
  ExpectedCommercialComponent,
  CommercialPreValidationInput,
  CommercialRequiredConfigPolicy,
  CommercialValidationIssue,
  CommercialValidationReport,
  StructuredCommercialErrorPayload,
  CommercialTransactionContract,
  ConsumeCommercialContractRequest,
  ValidateCommercialContractRequest,
} from "@/modules/commercial/types";

export {
  catalogueIdApplies,
  currencyApplies,
  dimensionApplies,
  filterApplicableCandidates,
  interimSpecificityScore,
  basePriceSpecificityScore,
  isCatalogueLifecycleApplicable,
  isEffectiveAtInWindow,
  isItemLifecycleApplicable,
  noteUnsupportedDimensions,
  resolveEffectiveAt,
  toBasePriceCandidate,
  type RawPriceItemForCandidate,
} from "@/modules/commercial/services/base-price-candidate-rules";

export {
  buildConflictExplanation,
  buildMissingExplanation,
  buildWinnerExplanation,
  rankScoredCandidates,
  scoreBasePriceCandidates,
} from "@/modules/commercial/services/pricing-precedence-rules";

export {
  BasePriceResolutionService,
  createBasePriceResolutionService,
} from "@/modules/commercial/services/base-price-resolution-service";

export {
  createInterimIp05BasePricePrecedenceResolver,
  createIp05BasePricePrecedenceResolver,
  InterimIp05BasePricePrecedenceResolver,
  Ip05BasePricePrecedenceResolver,
  type BasePricePrecedencePort,
} from "@/modules/commercial/services/ip05-base-price-precedence-port";

export {
  Bp003PricingReadAdapter,
  createBp003PricingReadAdapter,
} from "@/modules/commercial/adapters/bp003-pricing-read-adapter";

export {
  assertNonNegativeMagnitude,
  detectCircularDependencies,
  orderComponentsByDependencies,
  resolveComponentTypeCatalogue,
  resolveComponentTypeOrder,
} from "@/modules/commercial/services/commercial-component-rules";

export {
  CommercialCompositionService,
  createCommercialCompositionService,
} from "@/modules/commercial/services/commercial-composition-service";

export {
  addScaled,
  applySignedAmount,
  COMMERCIAL_DEFAULT_PRESENTATION_SCALE,
  COMMERCIAL_INTERNAL_MONEY_SCALE,
  multiplyScaledByNumber,
  parseMoneyToScaled,
  roundScaledToPresentation,
  scaledToNumber,
  scaledToString,
  sumSignedComponents,
  zeroScaled,
  type CommercialRoundingMode,
  type ScaledMoney,
} from "@/modules/commercial/money/commercial-money";

export {
  assertValidTaxRate,
  assertValidTaxTreatment,
  calculateTaxAmount,
  ratePercentToScaledRatio,
  type TaxCalculationBreakdown,
} from "@/modules/commercial/services/tax-calculation-rules";

export {
  filterApplicableTaxRules,
  isTaxRuleEffectiveAt,
  isTaxRuleLifecycleApplicable,
  selectTaxRulesForResolution,
  taxRuleSpecificityScore,
} from "@/modules/commercial/services/tax-applicability-rules";

export {
  createTaxResolutionService,
  TaxResolutionService,
} from "@/modules/commercial/services/tax-resolution-service";

export {
  createTaxAwareCommercialCompositionService,
  TaxAwareCommercialCompositionService,
  type ComposeWithTaxRequest,
  type ComposeWithTaxResult,
} from "@/modules/commercial/services/tax-composition-bridge";

export {
  assertSupportedAdjustmentBasis,
  assertValidAdjustmentMethod,
  calculateAdjustmentAmount,
  resolveAdjustmentBasisAmount,
  type AdjustmentCalculationBreakdown,
} from "@/modules/commercial/services/discount-calculation-rules";

export {
  adjustmentSpecificityScore,
  filterApplicableAdjustmentRules,
  isAdjustmentEffectiveAt,
  isAdjustmentLifecycleApplicable,
  selectAdjustmentRulesForResolution,
} from "@/modules/commercial/services/discount-applicability-rules";

export {
  CommercialAdjustmentService,
  createCommercialAdjustmentService,
} from "@/modules/commercial/services/commercial-adjustment-service";

export {
  AdjustmentAwareCommercialCompositionService,
  createAdjustmentAwareCommercialCompositionService,
  type ComposeWithTaxAndAdjustmentsRequest,
  type ComposeWithTaxAndAdjustmentsResult,
} from "@/modules/commercial/services/commercial-adjustment-bridge";

export {
  assertCommercialSnapshotValid,
  cloneCommercialResolution,
  computeCommercialIntegrityHash,
  reconcileResolutionPayable,
} from "@/modules/commercial/services/commercial-snapshot-rules";

export {
  CommercialResolutionService,
  createCommercialResolutionService,
} from "@/modules/commercial/services/commercial-resolution-service";

export {
  aggregateExpectedComponents,
  classifyExpectedLineRole,
  reconstructExpectedFromAggregates,
  roleSign,
  toExpectedComponent,
} from "@/modules/commercial/services/expected-commercial-amount-rules";

export {
  ExpectedCommercialAmountService,
  createExpectedCommercialAmountService,
} from "@/modules/commercial/services/expected-commercial-amount-service";

export {
  COMMERCIAL_GOVERNANCE_DECISION_CODES,
  COMMERCIAL_GOVERNANCE_EVENT_TYPES,
  COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES,
  COMMERCIAL_GOVERNANCE_PERMISSIONS,
  COMMERCIAL_GOVERNANCE_TRANSITIONS,
  COMMERCIAL_OVERRIDE_STATUS_CODES,
  COMMERCIAL_RULE_TYPE_CODES,
  DEFAULT_MATERIAL_FIELD_PATHS,
  DEFAULT_NON_MATERIAL_FIELD_PATHS,
  type CommercialGovernanceDecisionCode,
  type CommercialGovernanceLifecycleCode,
  type CommercialOverrideStatusCode,
  type CommercialRuleTypeCode,
} from "@/modules/commercial/constants";

export type {
  CommercialGovernanceActor,
  CommercialGovernanceDecision,
  CommercialGovernanceEventView,
  CommercialGovernancePolicyView,
  CommercialGovernanceWorkspaceView,
  CommercialOverrideRequestView,
  CommercialRuleVersionView,
  CreateCommercialRuleDraftInput,
  RequestCommercialOverrideInput,
  UpdateCommercialRuleDraftInput,
  UpsertCommercialGovernancePolicyInput,
} from "@/modules/commercial/types";

export {
  assertBusinessScope,
  assertLifecycleTransition,
  assertPermission,
  assertSegregationOfDuties,
  buildGovernanceDecision,
  canTransitionLifecycle,
  defaultGovernancePolicy,
  detectMaterialChange,
  evaluateActivationDecision,
  exceedsApprovalThreshold,
  isCommerciallyEffectiveAt,
} from "@/modules/commercial/services/commercial-governance-rules";

export {
  createInMemoryCommercialGovernanceStore,
  InMemoryCommercialGovernanceStore,
  type CommercialGovernanceStore,
} from "@/modules/commercial/services/commercial-governance-store";

export {
  CommercialGovernanceService,
  createCommercialGovernanceService,
} from "@/modules/commercial/services/commercial-governance-service";

export {
  assertDeterministicMatch,
  buildDeterminismFingerprint,
  buildValidationIssue,
  resolveRequiredConfigPolicy,
  throwFromValidationReport,
  toStructuredCommercialError,
  validateCommercialConfigurationPayload,
  validateResolutionIntegrity,
  validateResolutionRequestPre,
} from "@/modules/commercial/services/commercial-validation-rules";

export {
  CommercialValidationService,
  createCommercialValidationService,
} from "@/modules/commercial/services/commercial-validation-service";

export {
  assertContractMatchesSnapshot,
  assertExpectedMatchesSnapshot,
  buildCommercialTransactionContract,
  buildContractId,
  buildExpectedAmountId,
} from "@/modules/commercial/services/commercial-contract-rules";

export {
  CommercialContractService,
  createCommercialContractService,
} from "@/modules/commercial/services/commercial-contract-service";

export {
  DownstreamCommercialContractAdapter,
  createDownstreamCommercialContractAdapter,
} from "@/modules/commercial/adapters/downstream-commercial-contract-adapter";

export {
  TAX_COMPLIANCE_IP,
  TAX_COMPLIANCE_PERMISSIONS,
  TAX_COMPLIANCE_RULE_LIFECYCLE,
  TAX_COMPLIANCE_STATUSES,
  TAX_EVIDENCE_STATUSES,
  TAX_FILING_STATUSES,
  TAX_REMITTANCE_STATUSES,
  KENYA_JURISDICTION,
  KENYA_COMPLIANCE_RULE_TEMPLATES,
  UGANDA_JURISDICTION_STUB,
  TaxComplianceService,
  createTaxComplianceService,
  createInMemoryTaxComplianceStore,
  getProcessTaxComplianceStore,
  computeDueDate,
  generateFilingPeriod,
  deriveComplianceStatus,
} from "@/modules/commercial/tax-compliance";

export type {
  TaxComplianceDashboardView,
  TaxComplianceProfileView,
  TaxObligationView,
  TaxRegistrationView,
  TaxComplianceRuleView,
  TaxEvidenceView,
  TaxFilingPeriodView,
  TaxFilingView,
  TaxRemittanceView,
} from "@/modules/commercial/tax-compliance";
