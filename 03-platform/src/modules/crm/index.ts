/**
 * CRM Sales & Marketing module exports.
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline
 */

export {
  CRM_CUSTOMER_360_INSIGHT_IDS,
  CRM_CUSTOMER_360_QUICK_ACTION_IDS,
  CRM_CUSTOMER_360_WIDGET_IDS,
  CRM_TIMELINE_EVENT_TYPES,
  DEFAULT_QUOTATION_APPROVAL_THRESHOLD,
  QUOTATION_APPROVAL_STATUS_CODES,
  QUOTATION_DEFAULT_PAGE_SIZE,
  QUOTATION_DEFAULT_VALIDITY_DAYS,
  QUOTATION_EDITABLE_STATUS_CODES,
  QUOTATION_LOCKED_STATUS_CODES,
  QUOTATION_NUMBER_PREFIX,
  QUOTATION_OUTSTANDING_STATUS_CODES,
  QUOTATION_PENDING_ACCEPTANCE_STATUS_CODES,
  QUOTATION_STATUS_CODES,
  QUOTATION_TERMINAL_STATUS_CODES,
  SALES_ORDER_HANDOFF_STATUS_CODES,
  SALES_ORDER_NUMBER_PREFIX,
  SALES_ORDER_STATUS_CODES,
  approvalStatusLabel,
  isQuotationStatusCode,
  quotationStatusLabel,
} from "@/modules/crm/constants";

export {
  CRM_ERROR_CODES,
  CRM_USER_MESSAGES,
  CrmError,
} from "@/modules/crm/errors";

export {
  createPricingResolutionAdapter,
  PricingResolutionAdapter,
} from "@/modules/crm/adapters/pricing-resolution-adapter";

export {
  createOpportunityHandoffAdapter,
  NoOpOpportunityHandoffAdapter,
  OpportunityServiceHandoffAdapter,
} from "@/modules/crm/adapters/opportunity-handoff-adapter";

export type {
  OpportunityHandoffAdapter,
  OpportunityHandoffPayload,
} from "@/modules/crm/adapters/opportunity-handoff-adapter";

export {
  createQuotationDocumentAdapter,
  QuotationDocumentAdapter,
} from "@/modules/crm/adapters/quotation-document-adapter";

export type { QuotationDocumentSnapshot } from "@/modules/crm/adapters/quotation-document-adapter";

export { CRM_QUOTATION_LABELS, useCrmQuotationLabels } from "@/modules/crm/crm-terminology-labels";

export type {
  AddQuotationLinePayload,
  CreateQuotationLinePayload,
  CreateQuotationPayload,
  PricingResolutionRequest,
  QuotationCalculationOptions,
  QuotationDetailView,
  QuotationLineCalculationInput,
  QuotationLineCalculationResult,
  QuotationLineInsertValues,
  QuotationLineView,
  QuotationSearchFilters,
  QuotationSearchResultView,
  QuotationSummaryView,
  QuotationTotalsCalculationResult,
  QuotationVersionInsertValues,
  QuotationVersionView,
  QuotationCustomer360Contribution,
  QuotationDashboardView,
  QuotationDocumentView,
  ResolvedOfferingPrice,
  ReviseQuotationPayload,
  SalesOrderDetailView,
  SalesOrderLineView,
  UpdateQuotationHeaderPayload,
  UpdateQuotationLinePayload,
} from "@/modules/crm/quotation/types";

export {
  createQuotationLineSchema,
  createQuotationSchema,
  quotationIdParamSchema,
  quotationLineIdParamSchema,
  quotationSearchFiltersSchema,
  quotationVersionParamSchema,
  reviseQuotationSchema,
  transitionQuotationStatusSchema,
  updateQuotationHeaderSchema,
  updateQuotationLineSchema,
} from "@/modules/crm/quotation/validators/quotation-validators";

export {
  createQuotationRepository,
  QuotationRepository,
} from "@/modules/crm/quotation/repositories/quotation-repository";

export {
  createQuotationVersionRepository,
  QuotationVersionRepository,
} from "@/modules/crm/quotation/repositories/quotation-version-repository";

export {
  createQuotationLineRepository,
  QuotationLineRepository,
} from "@/modules/crm/quotation/repositories/quotation-line-repository";

export {
  createSalesOrderRepository,
  SalesOrderRepository,
} from "@/modules/crm/quotation/repositories/sales-order-repository";

export {
  QUOTATION_STATUS_TRANSITIONS,
  canConvertQuotationToOrder,
  canTransitionQuotationStatus,
  isQuotationEditable,
  isQuotationExpiredByDate,
  isQuotationLockedStatus,
  isQuotationTerminalStatus,
  isQuotationVersionLocked,
  nextRevisionVersionNumber,
  requiresRevisionToEdit,
  resolveDefaultValidUntil,
  resolveEffectiveQuotationStatus,
  timelineEventForStatusTransition,
} from "@/modules/crm/quotation/services/quotation-rules";

export {
  calculateLineDiscountAmount,
  calculateLineSubtotal,
  calculateLineTaxAmount,
  calculateLineTotal,
  roundMoney,
  sumMoney,
} from "@/modules/crm/quotation/services/quotation-calculation-rules";

export {
  createQuotationCalculationService,
  QuotationCalculationService,
} from "@/modules/crm/quotation/services/quotation-calculation-service";

export {
  createQuotationService,
  QuotationService,
} from "@/modules/crm/quotation/services/quotation-service";

export {
  canSendQuotationWithApproval,
  canSubmitForApproval,
  requiresApprovalByValue,
  resolveRequiredApprovalStatus,
} from "@/modules/crm/quotation/services/quotation-approval-rules";

export {
  createSalesOrderService,
  SalesOrderService,
} from "@/modules/crm/quotation/services/sales-order-service";

export {
  createQuotationCustomer360Provider,
  QuotationCustomer360Provider,
} from "@/modules/crm/quotation/services/quotation-customer-360-provider";

export {
  CRM_AUDIT_ENTITY_NAMES,
  CRM_AUDIT_SOURCE_MODULE,
  CRM_AUDIT_SOURCE_MODULE_CAMPAIGN,
  recordCrmEntityAudit,
} from "@/modules/crm/quotation/services/crm-audit-helper";

export {
  CAMPAIGN_DEFAULT_PAGE_SIZE,
  CAMPAIGN_MEMBER_STATUS_CODES,
  CAMPAIGN_NUMBER_PREFIX,
  CAMPAIGN_READ_ONLY_STATUS_CODES,
  CAMPAIGN_STATUS_CODES,
  CAMPAIGN_TYPE_CODES,
  CRM_CAMPAIGN_TIMELINE_EVENT_TYPES,
  campaignMemberStatusLabel,
  campaignStatusLabel,
  campaignTypeLabel,
  isCampaignStatusCode,
} from "@/modules/crm/constants";

export {
  createCampaignOutreachAdapter,
  ManualCampaignOutreachAdapter,
} from "@/modules/crm/adapters/campaign-outreach-adapter";

export {
  createLeadAttributionAdapter,
  LeadServiceLeadAttributionAdapter,
  StubLeadAttributionAdapter,
} from "@/modules/crm/adapters/lead-attribution-adapter";

export {
  createCampaignConsentAdapter,
  PartyPreferenceCampaignConsentAdapter,
} from "@/modules/crm/adapters/campaign-consent-adapter";

export {
  createCampaignRepository,
  CampaignRepository,
} from "@/modules/crm/campaign/repositories/campaign-repository";

export {
  createCampaignMemberRepository,
  CampaignMemberRepository,
} from "@/modules/crm/campaign/repositories/campaign-member-repository";

export {
  CAMPAIGN_STATUS_TRANSITIONS,
  canEditCampaignMembers,
  canTransitionCampaignStatus,
  computeCampaignRoi,
  isCampaignReadOnly,
} from "@/modules/crm/campaign/services/campaign-rules";

export {
  createCampaignService,
  CampaignService,
} from "@/modules/crm/campaign/services/campaign-service";

export {
  createCampaignCustomer360Provider,
  CampaignCustomer360Provider,
} from "@/modules/crm/campaign/services/campaign-customer-360-provider";

export {
  createCampaignSchema,
  updateCampaignSchema,
  campaignSearchFiltersSchema,
} from "@/modules/crm/campaign/validators/campaign-validators";

export type {
  CampaignDetailView,
  CampaignDashboardView,
  CampaignMemberView,
  CampaignRoiView,
  CampaignSummaryView,
  CreateCampaignPayload,
  UpdateCampaignPayload,
  CampaignCustomer360Contribution,
} from "@/modules/crm/campaign/types";

export {
  CRM_CAMPAIGN_LABELS,
  CRM_ANALYTICS_LABELS,
  useCrmCampaignLabels,
  useCrmAnalyticsLabels,
} from "@/modules/crm/crm-terminology-labels";

export {
  CRM_SALES_STRIP_SLOTS,
  CRM_CHANNEL_IDENTITY_PRINCIPLE,
} from "@/modules/crm/customer-360-contracts";

export {
  CRM_METRIC_CATEGORIES,
  CRM_METRIC_CODES,
  CRM_METRIC_CALCULATION_METHODS,
  CRM_SNAPSHOT_PERIODS,
  DEFAULT_DORMANCY_DAYS,
  QUOTATION_ACCEPTANCE_CHANNELS,
  CRM_CUSTOMER_360_TAB_IDS,
} from "@/modules/crm/constants";

export {
  createCrmAnalyticsService,
  CrmAnalyticsService,
} from "@/modules/crm/analytics/services/crm-analytics-service";

export {
  calculateHealthScore,
  calculateRate,
  isDormant,
  resolveChurnRisk,
  toCsv,
} from "@/modules/crm/analytics/services/crm-analytics-rules";

export type {
  CrmAnalyticsDashboardView,
  CrmAnalyticsExportView,
  CrmCustomerAnalyticsView,
  CrmAnalyticsKpiCardView,
} from "@/modules/crm/analytics/types";
