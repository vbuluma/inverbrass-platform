/**
 * Purpose:
 * Campaign consent adapter — BP-002 IP-12 marketing consent check.
 *
 * Implementation Package:
 * BP-004 / IP-11 – Campaign Management (Phase 11.3)
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { createCommunicationPreferenceRepository } from "@/core/communication-preference";

export type CampaignConsentCheckResult = {
  checkedAt: Date;
  granted: boolean;
  reason: string;
};

export interface CampaignConsentAdapter {
  checkMarketingConsent(
    context: CurrentBusinessContext,
    partyId: string
  ): Promise<CampaignConsentCheckResult>;
}

export class PartyPreferenceCampaignConsentAdapter
  implements CampaignConsentAdapter
{
  constructor(
    private readonly preferenceRepository = createCommunicationPreferenceRepository()
  ) {}

  async checkMarketingConsent(
    context: CurrentBusinessContext,
    partyId: string
  ): Promise<CampaignConsentCheckResult> {
    const checkedAt = new Date();
    const preference = await this.preferenceRepository.findActiveByPartyId(
      context.businessId,
      partyId
    );

    if (!preference) {
      return {
        checkedAt,
        granted: false,
        reason: "No communication preference record found.",
      };
    }

    if (!preference.marketingConsent) {
      return {
        checkedAt,
        granted: false,
        reason: "Marketing consent is not granted.",
      };
    }

    return {
      checkedAt,
      granted: true,
      reason: "Marketing consent granted.",
    };
  }
}

export function createCampaignConsentAdapter(): CampaignConsentAdapter {
  return new PartyPreferenceCampaignConsentAdapter();
}
