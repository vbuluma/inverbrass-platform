/**
 * Purpose:
 * Lead attribution adapter — IP-02 integration contract for campaign responses.
 *
 * Integration contract (once IP-02 merges):
 *
 *   Campaign response
 *       ↓
 *   LeadAttributionAdapter.attributeLeadFromCampaignResponse()
 *       ↓
 *   IP-02 Lead service (create/match Party → create Lead with campaignId source)
 *       ↓
 *   Lead id returned → stored on campaign_member.lead_id
 *
 * This adapter NEVER creates Lead tables or Party duplicates.
 * Until IP-02 is merged, StubLeadAttributionAdapter defers creation.
 *
 * Implementation Package:
 * BP-004 / IP-11 – Campaign Management (Phase 11.4)
 */

import type { CurrentBusinessContext } from "@/core/auth/types";

export type LeadAttributionPayload = {
  campaignId: string;
  partyId: string;
  memberId: string;
  sourceChannel?: string | null;
  /**
   * When an IP-02 Lead already exists (or was just created by a live adapter),
   * pass its id so membership can store campaign attribution.
   */
  existingLeadId?: string | null;
};

export type LeadAttributionResult = {
  attributed: boolean;
  leadId: string | null;
  /** True when Lead creation is waiting on IP-02 merge. */
  deferredToIp02: boolean;
};

export interface LeadAttributionAdapter {
  attributeLeadFromCampaignResponse(
    context: CurrentBusinessContext,
    payload: LeadAttributionPayload
  ): Promise<LeadAttributionResult>;
}

/**
 * v1 stub — replace factory return with IP-02-backed adapter after CRM Core merge.
 * Do not invent fallback Lead persistence in Sales & Marketing.
 */
export class StubLeadAttributionAdapter implements LeadAttributionAdapter {
  async attributeLeadFromCampaignResponse(
    _context: CurrentBusinessContext,
    payload: LeadAttributionPayload
  ): Promise<LeadAttributionResult> {
    if (payload.existingLeadId) {
      return {
        attributed: true,
        leadId: payload.existingLeadId,
        deferredToIp02: false,
      };
    }

    return {
      attributed: false,
      leadId: null,
      deferredToIp02: true,
    };
  }
}

export function createLeadAttributionAdapter(): LeadAttributionAdapter {
  return new StubLeadAttributionAdapter();
}
