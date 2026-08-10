/**
 * Purpose:
 * CRM Sales & Marketing module constants.
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline
 */

export const QUOTATION_STATUS_CODES = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
} as const;

export type QuotationStatusCode =
  (typeof QUOTATION_STATUS_CODES)[keyof typeof QUOTATION_STATUS_CODES];

/** Terminal statuses — no forward transitions except revision paths on Rejected/Expired. */
export const QUOTATION_TERMINAL_STATUS_CODES = [
  QUOTATION_STATUS_CODES.ACCEPTED,
  QUOTATION_STATUS_CODES.REJECTED,
  QUOTATION_STATUS_CODES.EXPIRED,
] as const;

/** Statuses open for editing (lines, pricing refresh). */
export const QUOTATION_EDITABLE_STATUS_CODES = [
  QUOTATION_STATUS_CODES.DRAFT,
] as const;

/** Statuses included in open pipeline / outstanding quote widgets. */
export const QUOTATION_OUTSTANDING_STATUS_CODES = [
  QUOTATION_STATUS_CODES.DRAFT,
  QUOTATION_STATUS_CODES.SENT,
] as const;

/** Statuses awaiting customer acceptance. */
export const QUOTATION_PENDING_ACCEPTANCE_STATUS_CODES = [
  QUOTATION_STATUS_CODES.SENT,
] as const;

/** Statuses where line pricing is locked (BRU-002, BRU-005). */
export const QUOTATION_LOCKED_STATUS_CODES = [
  QUOTATION_STATUS_CODES.SENT,
  QUOTATION_STATUS_CODES.ACCEPTED,
  QUOTATION_STATUS_CODES.REJECTED,
  QUOTATION_STATUS_CODES.EXPIRED,
] as const;

export const QUOTATION_DEFAULT_PAGE_SIZE = 25;

export const QUOTATION_NUMBER_PREFIX = "QT";

/** Default validity period in days when not configured. */
export const QUOTATION_DEFAULT_VALIDITY_DAYS = 30;

export const QUOTATION_APPROVAL_STATUS_CODES = {
  NOT_REQUIRED: "NOT_REQUIRED",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export type QuotationApprovalStatusCode =
  (typeof QUOTATION_APPROVAL_STATUS_CODES)[keyof typeof QUOTATION_APPROVAL_STATUS_CODES];

export const DEFAULT_QUOTATION_APPROVAL_THRESHOLD = 100_000;

export const SALES_ORDER_STATUS_CODES = {
  DRAFT: "DRAFT",
  HANDOFF_READY: "HANDOFF_READY",
} as const;

export type SalesOrderStatusCode =
  (typeof SALES_ORDER_STATUS_CODES)[keyof typeof SALES_ORDER_STATUS_CODES];

export const SALES_ORDER_HANDOFF_STATUS_CODES = {
  PENDING: "PENDING",
  DISPATCHED: "DISPATCHED",
} as const;

export const SALES_ORDER_NUMBER_PREFIX = "SO";

export const CRM_TIMELINE_EVENT_TYPES = {
  QUOTATION_CREATED: "QUOTATION_CREATED",
  QUOTATION_SENT: "QUOTATION_SENT",
  QUOTATION_ACCEPTED: "QUOTATION_ACCEPTED",
  QUOTATION_REJECTED: "QUOTATION_REJECTED",
  QUOTATION_EXPIRED: "QUOTATION_EXPIRED",
  QUOTATION_REVISED: "QUOTATION_REVISED",
  SALES_ORDER_CREATED: "SALES_ORDER_CREATED",
} as const;

export type CrmQuotationTimelineEventType =
  (typeof CRM_TIMELINE_EVENT_TYPES)[keyof typeof CRM_TIMELINE_EVENT_TYPES];

export const CRM_CUSTOMER_360_WIDGET_IDS = {
  QUOTATION_OUTSTANDING: "quotation.outstanding",
  QUOTATION_PENDING_ACCEPTANCE: "quotation.pending_acceptance",
  QUOTATION_EXPIRED: "quotation.expired",
  QUOTATION_ACCEPTED: "quotation.accepted",
  CAMPAIGN_ACTIVE_MEMBERSHIPS: "campaign.active_memberships",
  CAMPAIGN_RECENT_RESPONSES: "campaign.recent_responses",
  CAMPAIGN_LAST_TOUCH: "campaign.last_touch",
  ANALYTICS_HEALTH_SCORE: "analytics.health_score",
  ANALYTICS_CHURN_RISK: "analytics.churn_risk",
  ANALYTICS_DORMANCY: "analytics.dormancy",
  ANALYTICS_RELATIONSHIP_VALUE: "analytics.relationship_value",
  ANALYTICS_OPEN_PIPELINE: "analytics.open_pipeline",
} as const;

export const CRM_CUSTOMER_360_INSIGHT_IDS = {
  QUOTATION_AWAITING_RESPONSE: "quotation.awaiting_response",
  QUOTATION_TOTAL_QUOTED_VALUE: "quotation.total_quoted_value",
  CAMPAIGN_RESPONSE_RATE: "campaign.response_rate",
  CAMPAIGN_ATTRIBUTED_LEADS: "campaign.attributed_leads",
  ANALYTICS_HEALTH_SUMMARY: "analytics.health_summary",
} as const;

export const CRM_CUSTOMER_360_QUICK_ACTION_IDS = {
  QUOTATION_CREATE_FROM_OPPORTUNITY: "quotation.create_from_opportunity",
  QUOTATION_VIEW_LATEST: "quotation.view_latest",
  CAMPAIGN_LOG_RESPONSE: "campaign.log_response",
  ANALYTICS_VIEW_DASHBOARD: "analytics.view_dashboard",
  ANALYTICS_EXPORT: "analytics.export",
} as const;

export const CRM_CUSTOMER_360_TAB_IDS = {
  QUOTATIONS: "quotations",
  CAMPAIGNS: "campaigns",
  ANALYTICS: "analytics",
} as const;

/** Acceptance channel metadata — channels themselves are not implemented in IP-10. */
export const QUOTATION_ACCEPTANCE_CHANNELS = {
  CRM: "CRM",
  PORTAL: "PORTAL",
  EMAIL: "EMAIL",
  API: "API",
  WHATSAPP: "WHATSAPP",
  OTHER: "OTHER",
} as const;

export type QuotationAcceptanceChannel =
  (typeof QUOTATION_ACCEPTANCE_CHANNELS)[keyof typeof QUOTATION_ACCEPTANCE_CHANNELS];


export const CAMPAIGN_STATUS_CODES = {
  PLANNED: "PLANNED",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type CampaignStatusCode =
  (typeof CAMPAIGN_STATUS_CODES)[keyof typeof CAMPAIGN_STATUS_CODES];

export const CAMPAIGN_TYPE_CODES = {
  EMAIL: "EMAIL",
  EVENT: "EVENT",
  REFERRAL: "REFERRAL",
  ADVERTISING: "ADVERTISING",
  PARTNER: "PARTNER",
} as const;

export type CampaignTypeCode =
  (typeof CAMPAIGN_TYPE_CODES)[keyof typeof CAMPAIGN_TYPE_CODES];

export const CAMPAIGN_MEMBER_STATUS_CODES = {
  TARGETED: "TARGETED",
  SENT: "SENT",
  RESPONDED: "RESPONDED",
  CONVERTED: "CONVERTED",
  OPTED_OUT: "OPTED_OUT",
} as const;

export type CampaignMemberStatusCode =
  (typeof CAMPAIGN_MEMBER_STATUS_CODES)[keyof typeof CAMPAIGN_MEMBER_STATUS_CODES];

export const CAMPAIGN_DEFAULT_PAGE_SIZE = 25;

export const CAMPAIGN_NUMBER_PREFIX = "CMP";

export const CAMPAIGN_READ_ONLY_STATUS_CODES = [
  CAMPAIGN_STATUS_CODES.COMPLETED,
  CAMPAIGN_STATUS_CODES.CANCELLED,
] as const;

export const CRM_CAMPAIGN_TIMELINE_EVENT_TYPES = {
  CAMPAIGN_MEMBER_ADDED: "CAMPAIGN_MEMBER_ADDED",
  CAMPAIGN_RESPONSE: "CAMPAIGN_RESPONSE",
  CAMPAIGN_LEAD_ATTRIBUTED: "CAMPAIGN_LEAD_ATTRIBUTED",
} as const;

export function isCampaignStatusCode(value: string): value is CampaignStatusCode {
  return Object.values(CAMPAIGN_STATUS_CODES).includes(value as CampaignStatusCode);
}

export function campaignStatusLabel(status: CampaignStatusCode | string): string {
  switch (status) {
    case CAMPAIGN_STATUS_CODES.PLANNED:
      return "Planned";
    case CAMPAIGN_STATUS_CODES.ACTIVE:
      return "Active";
    case CAMPAIGN_STATUS_CODES.COMPLETED:
      return "Completed";
    case CAMPAIGN_STATUS_CODES.CANCELLED:
      return "Cancelled";
    default:
      return status;
  }
}

export function campaignTypeLabel(type: CampaignTypeCode | string): string {
  switch (type) {
    case CAMPAIGN_TYPE_CODES.EMAIL:
      return "Email";
    case CAMPAIGN_TYPE_CODES.EVENT:
      return "Event";
    case CAMPAIGN_TYPE_CODES.REFERRAL:
      return "Referral";
    case CAMPAIGN_TYPE_CODES.ADVERTISING:
      return "Advertising";
    case CAMPAIGN_TYPE_CODES.PARTNER:
      return "Partner";
    default:
      return type;
  }
}

export function campaignMemberStatusLabel(
  status: CampaignMemberStatusCode | string
): string {
  switch (status) {
    case CAMPAIGN_MEMBER_STATUS_CODES.TARGETED:
      return "Targeted";
    case CAMPAIGN_MEMBER_STATUS_CODES.SENT:
      return "Sent";
    case CAMPAIGN_MEMBER_STATUS_CODES.RESPONDED:
      return "Responded";
    case CAMPAIGN_MEMBER_STATUS_CODES.CONVERTED:
      return "Converted";
    case CAMPAIGN_MEMBER_STATUS_CODES.OPTED_OUT:
      return "Opted out";
    default:
      return status;
  }
}

export const CRM_METRIC_CATEGORIES = {
  SALES: "SALES",
  LEAD_CAMPAIGN: "LEAD_CAMPAIGN",
  SERVICE: "SERVICE",
  VISIT: "VISIT",
  ENGAGEMENT: "ENGAGEMENT",
  CUSTOMER_HEALTH: "CUSTOMER_HEALTH",
  SLA: "SLA",
} as const;

export type CrmMetricCategory =
  (typeof CRM_METRIC_CATEGORIES)[keyof typeof CRM_METRIC_CATEGORIES];

export const CRM_METRIC_CALCULATION_METHODS = {
  COUNT: "COUNT",
  SUM: "SUM",
  RATE: "RATE",
  AVERAGE: "AVERAGE",
  RULE: "RULE",
} as const;

export const CRM_METRIC_CODES = {
  QUOTED_VALUE: "kpi.quoted_value",
  OPEN_QUOTATIONS: "kpi.open_quotations",
  ACCEPTED_QUOTATIONS: "kpi.accepted_quotations",
  QUOTE_ACCEPTANCE_RATE: "kpi.quote_acceptance_rate",
  PIPELINE_BY_STAGE: "kpi.pipeline_by_stage",
  WEIGHTED_FORECAST: "kpi.weighted_forecast",
  WIN_RATE: "kpi.win_rate",
  SALES_CYCLE_DAYS: "kpi.sales_cycle_days",
  CAMPAIGN_ROI: "kpi.campaign_roi",
  CAMPAIGN_RESPONSE_RATE: "kpi.campaign_response_rate",
  LEAD_CONVERSION_RATE: "kpi.lead_conversion_rate",
  CASE_SLA_COMPLIANCE: "kpi.case_sla_compliance",
  VISIT_COVERAGE: "kpi.visit_coverage",
  HEALTH_SCORE: "analytics.health_score",
  CHURN_RISK: "analytics.churn_risk",
  DORMANCY: "analytics.dormancy",
  RELATIONSHIP_VALUE: "analytics.relationship_value",
} as const;

export const CRM_SNAPSHOT_PERIODS = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
} as const;

export const DEFAULT_DORMANCY_DAYS = 90;

export const DEFAULT_HEALTH_SCORE_WEIGHTS = {
  openQuotes: 20,
  acceptedQuotes: 40,
  campaignEngagement: 20,
  recency: 20,
} as const;

export function isQuotationStatusCode(value: string): value is QuotationStatusCode {
  return Object.values(QUOTATION_STATUS_CODES).includes(value as QuotationStatusCode);
}

export function approvalStatusLabel(status: string): string {
  switch (status) {
    case QUOTATION_APPROVAL_STATUS_CODES.NOT_REQUIRED:
      return "Not required";
    case QUOTATION_APPROVAL_STATUS_CODES.PENDING:
      return "Pending approval";
    case QUOTATION_APPROVAL_STATUS_CODES.APPROVED:
      return "Approved";
    case QUOTATION_APPROVAL_STATUS_CODES.REJECTED:
      return "Approval rejected";
    default:
      return status;
  }
}

export function quotationStatusLabel(status: QuotationStatusCode | string): string {
  switch (status) {
    case QUOTATION_STATUS_CODES.DRAFT:
      return "Draft";
    case QUOTATION_STATUS_CODES.SENT:
      return "Sent";
    case QUOTATION_STATUS_CODES.ACCEPTED:
      return "Accepted";
    case QUOTATION_STATUS_CODES.REJECTED:
      return "Rejected";
    case QUOTATION_STATUS_CODES.EXPIRED:
      return "Expired";
    default:
      return status;
  }
}
