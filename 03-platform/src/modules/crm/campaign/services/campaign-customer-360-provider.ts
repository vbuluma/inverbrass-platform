/**
 * Purpose:
 * Customer 360 contribution for campaign memberships.
 *
 * Implementation Package:
 * BP-004 / IP-11 – Campaign Management (Phase 11.7)
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  CAMPAIGN_MEMBER_STATUS_CODES,
  CRM_CAMPAIGN_TIMELINE_EVENT_TYPES,
  CRM_CUSTOMER_360_INSIGHT_IDS,
  CRM_CUSTOMER_360_QUICK_ACTION_IDS,
  CRM_CUSTOMER_360_WIDGET_IDS,
} from "@/modules/crm/constants";
import { createCampaignMemberRepository } from "@/modules/crm/campaign/repositories/campaign-member-repository";
import type { CampaignCustomer360Contribution } from "@/modules/crm/campaign/types";

const RECENT_RESPONSE_DAYS = 90;

export class CampaignCustomer360Provider {
  constructor(
    private readonly memberRepository = createCampaignMemberRepository()
  ) {}

  async getContribution(
    context: CurrentBusinessContext,
    partyId: string
  ): Promise<CampaignCustomer360Contribution> {
    const members = await this.memberRepository.listByPartyId(
      context.businessId,
      partyId
    );

    const activeMemberships = members.filter(
      (m) =>
        m.memberStatus !== CAMPAIGN_MEMBER_STATUS_CODES.OPTED_OUT &&
        m.memberStatus !== CAMPAIGN_MEMBER_STATUS_CODES.CONVERTED
    ).length;

    const cutoff = Date.now() - RECENT_RESPONSE_DAYS * 24 * 60 * 60 * 1000;
    const recentResponses = members.filter(
      (m) =>
        m.respondedAt != null &&
        m.respondedAt.getTime() >= cutoff
    ).length;

    const lastTouch = members
      .map((m) => m.respondedAt ?? m.updatedAt)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    const sentOrBeyond = members.filter((m) =>
      [
        CAMPAIGN_MEMBER_STATUS_CODES.SENT,
        CAMPAIGN_MEMBER_STATUS_CODES.RESPONDED,
        CAMPAIGN_MEMBER_STATUS_CODES.CONVERTED,
      ].includes(m.memberStatus as typeof CAMPAIGN_MEMBER_STATUS_CODES.SENT)
    ).length;

    const respondedOrConverted = members.filter((m) =>
      [
        CAMPAIGN_MEMBER_STATUS_CODES.RESPONDED,
        CAMPAIGN_MEMBER_STATUS_CODES.CONVERTED,
      ].includes(
        m.memberStatus as typeof CAMPAIGN_MEMBER_STATUS_CODES.RESPONDED
      )
    ).length;

    const attributedLeads = members.filter((m) => m.leadId != null).length;
    const responseRate =
      sentOrBeyond > 0
        ? Number(((respondedOrConverted / sentOrBeyond) * 100).toFixed(1))
        : 0;

    return {
      domain: "campaigns",
      widgets: [
        {
          id: CRM_CUSTOMER_360_WIDGET_IDS.CAMPAIGN_ACTIVE_MEMBERSHIPS,
          label: "Active Campaigns",
          value: activeMemberships,
        },
        {
          id: CRM_CUSTOMER_360_WIDGET_IDS.CAMPAIGN_RECENT_RESPONSES,
          label: "Campaign Responses (90d)",
          value: recentResponses,
        },
        {
          id: CRM_CUSTOMER_360_WIDGET_IDS.CAMPAIGN_LAST_TOUCH,
          label: "Last Campaign Touch",
          value: lastTouch ? lastTouch.toISOString().slice(0, 10) : "—",
        },
      ],
      insights: [
        {
          id: CRM_CUSTOMER_360_INSIGHT_IDS.CAMPAIGN_RESPONSE_RATE,
          label: "Campaign response rate",
          summary: `${responseRate}% response rate across campaign touches.`,
        },
        {
          id: CRM_CUSTOMER_360_INSIGHT_IDS.CAMPAIGN_ATTRIBUTED_LEADS,
          label: "Leads from campaigns",
          summary: `${attributedLeads} lead(s) attributed to campaigns.`,
        },
      ],
      quickActions: [
        {
          id: CRM_CUSTOMER_360_QUICK_ACTION_IDS.CAMPAIGN_LOG_RESPONSE,
          label: "Log Campaign Response",
          href: "/campaigns",
        },
      ],
      timelineEventTypes: Object.values(CRM_CAMPAIGN_TIMELINE_EVENT_TYPES),
    };
  }
}

export function createCampaignCustomer360Provider() {
  return new CampaignCustomer360Provider();
}
