/**
 * Purpose:
 * Stable Customer 360 contribution contracts published by IP-10 / IP-11 / IP-12.
 *
 * Ownership:
 * IP-01 owns the Customer Profile / 360 shell and mounts these contributions.
 * Sales & Marketing publishes data only — it does not render a second 360 shell.
 *
 * Implementation Package:
 * BP-004 / IP-10–IP-12 – Final remediation
 */

export {
  CRM_CAMPAIGN_TIMELINE_EVENT_TYPES,
  CRM_CUSTOMER_360_INSIGHT_IDS,
  CRM_CUSTOMER_360_QUICK_ACTION_IDS,
  CRM_CUSTOMER_360_TAB_IDS,
  CRM_CUSTOMER_360_WIDGET_IDS,
  CRM_TIMELINE_EVENT_TYPES,
} from "@/modules/crm/constants";

/**
 * Future Customer 360 "sales strip" composition (IP-01 mounts; sources below).
 *
 * | Slot | Source IP | Status |
 * |------|-----------|--------|
 * | Current opportunity | IP-03 | Pending CRM Core |
 * | Probability | IP-03 | Pending CRM Core |
 * | Outstanding quotation | IP-10 | Available via quotation.outstanding |
 * | Recent campaign engagement | IP-11 | Available via campaign.* widgets |
 * | Next sales action | IP-05 | Pending Activities |
 * | Sales health indicator | IP-12 | Available via analytics.health_score |
 */
export const CRM_SALES_STRIP_SLOTS = {
  CURRENT_OPPORTUNITY: "sales_strip.current_opportunity",
  PROBABILITY: "sales_strip.probability",
  OUTSTANDING_QUOTATION: "sales_strip.outstanding_quotation",
  RECENT_CAMPAIGN_ENGAGEMENT: "sales_strip.recent_campaign_engagement",
  NEXT_SALES_ACTION: "sales_strip.next_sales_action",
  SALES_HEALTH: "sales_strip.sales_health",
} as const;

/**
 * Channel / onboarding readiness principle (do not implement channels here):
 *
 * Party identity (BP-002)
 *   → CRM identity (IP-01)
 *   → Lead (IP-02) / Opportunity (IP-03) / Quotation (IP-10) / Campaign (IP-11)
 *
 * Digital origins (portal, WhatsApp, contact centre, social, API, web, mobile)
 * must reuse Party + CRM records — never create duplicate customers.
 */
export const CRM_CHANNEL_IDENTITY_PRINCIPLE =
  "REUSE_PARTY_AND_CRM_RECORD_ACROSS_CHANNELS" as const;
