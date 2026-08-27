/**
 * Purpose:
 * Opportunity handoff adapter — IP-03 integration for BP-004 IP-10.
 *
 * On quotation accept: advances the linked opportunity toward PROPOSAL /
 * NEGOTIATION via OpportunityService.transitionStage (audit + timeline).
 * On sales order create: soft no-op — BP-006 owns fulfilment handoff.
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline (Phase 10.4)
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  createOpportunityReferenceRepository,
  type OpportunityReferenceRepository,
} from "@/modules/crm/opportunity/repositories/opportunity-reference-repository";
import {
  canTransitionStage,
  isOpportunityEditable,
  type PipelineStageDefinition,
} from "@/modules/crm/opportunity/services/opportunity-rules";
import {
  createOpportunityService,
  type OpportunityService,
} from "@/modules/crm/opportunity/services/opportunity-service";

export type OpportunityHandoffPayload = {
  opportunityId: string;
  quotationId: string;
  salesOrderId?: string;
  stageCode?: string;
};

export interface OpportunityHandoffAdapter {
  onQuotationAccepted(
    context: CurrentBusinessContext,
    payload: OpportunityHandoffPayload
  ): Promise<void>;

  onSalesOrderCreated(
    context: CurrentBusinessContext,
    payload: OpportunityHandoffPayload
  ): Promise<void>;
}

/** Preferred open stages after quotation acceptance (most advanced first). */
const QUOTATION_ACCEPTED_TARGET_STAGES = ["NEGOTIATION", "PROPOSAL"] as const;

/**
 * Historical no-op stub retained for reference. Factory returns the live adapter.
 */
export class NoOpOpportunityHandoffAdapter implements OpportunityHandoffAdapter {
  async onQuotationAccepted(): Promise<void> {
    // Replaced by OpportunityServiceHandoffAdapter (BRU-006 / IP-03).
  }

  async onSalesOrderCreated(): Promise<void> {
    // BP-006+ will consume sales order handoff records.
  }
}

/**
 * Live IP-03 adapter — quotation accept advances opportunity stage;
 * sales-order create remains a soft no-op pending BP-006 fulfilment.
 */
export class OpportunityServiceHandoffAdapter implements OpportunityHandoffAdapter {
  constructor(
    private readonly opportunityService: OpportunityService = createOpportunityService(),
    private readonly referenceRepository: OpportunityReferenceRepository = createOpportunityReferenceRepository()
  ) {}

  async onQuotationAccepted(
    context: CurrentBusinessContext,
    payload: OpportunityHandoffPayload
  ): Promise<void> {
    if (!payload.opportunityId) {
      return;
    }

    const opportunity = await this.opportunityService.getOpportunity(
      context,
      payload.opportunityId
    );

    if (!isOpportunityEditable(opportunity.statusCode)) {
      return;
    }

    if (opportunity.stageCode === "NEGOTIATION") {
      return;
    }

    const pipeline = await this.referenceRepository.findPipelineByCode(
      opportunity.pipelineCode
    );
    if (!pipeline) {
      return;
    }

    const stages = await this.referenceRepository.listActiveStages(pipeline.id);
    const stageDefs: PipelineStageDefinition[] = stages.map((stage) => ({
      code: stage.code,
      displayOrder: stage.displayOrder,
      defaultProbability: stage.defaultProbability,
      isClosedWon: stage.isClosedWon,
      isClosedLost: stage.isClosedLost,
    }));

    const ordered = [...stageDefs].sort(
      (a, b) => a.displayOrder - b.displayOrder
    );
    const fromIndex = ordered.findIndex(
      (stage) => stage.code === opportunity.stageCode
    );

    for (const targetCode of QUOTATION_ACCEPTED_TARGET_STAGES) {
      if (opportunity.stageCode === targetCode) {
        return;
      }

      const toIndex = ordered.findIndex((stage) => stage.code === targetCode);
      if (fromIndex < 0 || toIndex < 0 || toIndex <= fromIndex) {
        continue;
      }

      if (!canTransitionStage(stageDefs, opportunity.stageCode, targetCode)) {
        continue;
      }

      await this.opportunityService.transitionStage(
        context,
        payload.opportunityId,
        {
          stageCode: targetCode,
          version: opportunity.version,
        }
      );
      return;
    }
  }

  /**
   * Soft no-op: BP-006 owns sales-order fulfilment / handoff consumption.
   * Quotation → sales order already records party timeline in SalesOrderService.
   * Do not invent fulfilment stage transitions here.
   */
  async onSalesOrderCreated(): Promise<void> {
    // Intentionally empty — fulfilment ownership is BP-006.
  }
}

export function createOpportunityHandoffAdapter(): OpportunityHandoffAdapter {
  return new OpportunityServiceHandoffAdapter();
}
