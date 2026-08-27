/**
 * Purpose:
 * Campaign outreach adapter — ENG-009 stub for BP-004 IP-11.
 *
 * Design rationale:
 * v1 records manual send intent; ENG-009 replaces blast delivery later.
 *
 * Implementation Package:
 * BP-004 / IP-11 – Campaign Management (Phase 11.5)
 */

import type { CurrentBusinessContext } from "@/core/auth/types";

export type CampaignOutreachPayload = {
  campaignId: string;
  memberId: string;
  partyId: string;
  channel?: string | null;
};

export interface CampaignOutreachAdapter {
  sendOutreach(
    context: CurrentBusinessContext,
    payload: CampaignOutreachPayload
  ): Promise<{ delivered: boolean; providerMessageId: string | null }>;
}

export class ManualCampaignOutreachAdapter implements CampaignOutreachAdapter {
  async sendOutreach(
    _context: CurrentBusinessContext,
    payload: CampaignOutreachPayload
  ): Promise<{ delivered: boolean; providerMessageId: string | null }> {
    // ENG-009 will dispatch email/SMS/push; v1 treats workspace action as send.
    return {
      delivered: true,
      providerMessageId: `manual-${payload.memberId}`,
    };
  }
}

export function createCampaignOutreachAdapter(): CampaignOutreachAdapter {
  return new ManualCampaignOutreachAdapter();
}
