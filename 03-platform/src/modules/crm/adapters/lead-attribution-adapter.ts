/**
 * Purpose:
 * Lead attribution adapter — IP-02 integration contract for campaign responses.
 *
 * Integration contract:
 *
 *   Campaign response
 *       ↓
 *   LeadAttributionAdapter.attributeLeadFromCampaignResponse()
 *       ↓
 *   IP-02 Lead service (create/match Party → create Lead with campaign source)
 *       ↓
 *   Lead id returned → stored on campaign_member.lead_id
 *
 * This adapter NEVER creates Lead tables or Party duplicates.
 *
 * Implementation Package:
 * BP-004 / IP-11 – Campaign Management (Phase 11.4)
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { CRM_SOURCE_CODES } from "@/modules/crm/constants";
import { LeadError } from "@/modules/crm/lead/errors";
import {
  createLeadService,
  type LeadService,
} from "@/modules/crm/lead/services/lead-service";

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
 * Historical stub retained for reference. Factory returns the live adapter.
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

/**
 * Live IP-02 adapter — attributes campaign responses to Lead Management.
 */
export class LeadServiceLeadAttributionAdapter implements LeadAttributionAdapter {
  constructor(private readonly leadService: LeadService = createLeadService()) {}

  async attributeLeadFromCampaignResponse(
    context: CurrentBusinessContext,
    payload: LeadAttributionPayload
  ): Promise<LeadAttributionResult> {
    if (payload.existingLeadId) {
      return {
        attributed: true,
        leadId: payload.existingLeadId,
        deferredToIp02: false,
      };
    }

    const activeLead = await this.leadService.getActiveLeadWidgetSummary(
      context,
      payload.partyId
    );
    if (activeLead) {
      return {
        attributed: true,
        leadId: activeLead.leadId,
        deferredToIp02: false,
      };
    }

    const catalogues = await this.leadService.getRegistrationCatalogues(context);
    const campaignSource = catalogues.leadSources.find(
      (source) => source.code === CRM_SOURCE_CODES.CAMPAIGN
    );
    const sourceCode = campaignSource?.code ?? catalogues.leadSources[0]?.code;

    if (!sourceCode) {
      throw new LeadError(
        "REFERENCE_DATA_MISSING",
        "Lead source reference data is not available.",
        500
      );
    }

    try {
      const lead = await this.leadService.createLead(context, {
        partyId: payload.partyId,
        sourceCode,
        notes: `Attributed from campaign ${payload.campaignId}`,
      });

      return {
        attributed: true,
        leadId: lead.leadId,
        deferredToIp02: false,
      };
    } catch (error) {
      if (
        error instanceof LeadError &&
        error.code === "DUPLICATE_ACTIVE_LEAD"
      ) {
        const raceLead = await this.leadService.getActiveLeadWidgetSummary(
          context,
          payload.partyId
        );
        if (raceLead) {
          return {
            attributed: true,
            leadId: raceLead.leadId,
            deferredToIp02: false,
          };
        }
      }
      throw error;
    }
  }
}

export function createLeadAttributionAdapter(): LeadAttributionAdapter {
  return new LeadServiceLeadAttributionAdapter();
}
