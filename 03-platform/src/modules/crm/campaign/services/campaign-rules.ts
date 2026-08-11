/**
 * Purpose:
 * Pure campaign lifecycle and ROI helpers.
 *
 * Implementation Package:
 * BP-004 / IP-11 – Campaign Management
 */

import {
  CAMPAIGN_MEMBER_STATUS_CODES,
  CAMPAIGN_READ_ONLY_STATUS_CODES,
  CAMPAIGN_STATUS_CODES,
  type CampaignMemberStatusCode,
  type CampaignStatusCode,
} from "@/modules/crm/constants";
import type { CampaignRoiView } from "@/modules/crm/campaign/types";

export const CAMPAIGN_STATUS_TRANSITIONS: Record<
  CampaignStatusCode,
  readonly CampaignStatusCode[]
> = {
  [CAMPAIGN_STATUS_CODES.PLANNED]: [
    CAMPAIGN_STATUS_CODES.ACTIVE,
    CAMPAIGN_STATUS_CODES.CANCELLED,
  ],
  [CAMPAIGN_STATUS_CODES.ACTIVE]: [
    CAMPAIGN_STATUS_CODES.COMPLETED,
    CAMPAIGN_STATUS_CODES.CANCELLED,
  ],
  [CAMPAIGN_STATUS_CODES.COMPLETED]: [],
  [CAMPAIGN_STATUS_CODES.CANCELLED]: [],
};

export function canTransitionCampaignStatus(
  from: CampaignStatusCode | string,
  to: CampaignStatusCode | string
): boolean {
  const allowed =
    CAMPAIGN_STATUS_TRANSITIONS[from as CampaignStatusCode] ?? [];
  return allowed.includes(to as CampaignStatusCode);
}

export function isCampaignReadOnly(status: CampaignStatusCode | string): boolean {
  return (CAMPAIGN_READ_ONLY_STATUS_CODES as readonly string[]).includes(status);
}

export function canEditCampaignMembers(
  status: CampaignStatusCode | string
): boolean {
  return (
    status === CAMPAIGN_STATUS_CODES.PLANNED ||
    status === CAMPAIGN_STATUS_CODES.ACTIVE
  );
}

export function computeCampaignRoi(input: {
  statuses: Array<CampaignMemberStatusCode | string>;
  budgetAmount: number;
  actualCost: number;
}): CampaignRoiView {
  const counts = {
    targetedCount: 0,
    sentCount: 0,
    respondedCount: 0,
    convertedCount: 0,
    optedOutCount: 0,
  };

  for (const status of input.statuses) {
    switch (status) {
      case CAMPAIGN_MEMBER_STATUS_CODES.TARGETED:
        counts.targetedCount += 1;
        break;
      case CAMPAIGN_MEMBER_STATUS_CODES.SENT:
        counts.sentCount += 1;
        break;
      case CAMPAIGN_MEMBER_STATUS_CODES.RESPONDED:
        counts.respondedCount += 1;
        break;
      case CAMPAIGN_MEMBER_STATUS_CODES.CONVERTED:
        counts.convertedCount += 1;
        break;
      case CAMPAIGN_MEMBER_STATUS_CODES.OPTED_OUT:
        counts.optedOutCount += 1;
        break;
      default:
        break;
    }
  }

  const memberCount = input.statuses.length;
  const outreachBase = counts.sentCount + counts.respondedCount + counts.convertedCount;
  const responseBase = outreachBase;
  const responseRate =
    responseBase > 0
      ? Number(
          (
            ((counts.respondedCount + counts.convertedCount) / responseBase) *
            100
          ).toFixed(2)
        )
      : 0;
  const conversionRate =
    memberCount > 0
      ? Number(((counts.convertedCount / memberCount) * 100).toFixed(2))
      : 0;

  return {
    memberCount,
    ...counts,
    responseRate,
    conversionRate,
    budgetAmount: input.budgetAmount,
    actualCost: input.actualCost,
    costVariance: Number((input.budgetAmount - input.actualCost).toFixed(2)),
    // IP-03 opportunity amounts not available from this agent — stub until merge.
    attributedPipelineValue: 0,
  };
}
