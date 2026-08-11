/**
 * Purpose:
 * Opportunity handoff adapter — IP-03 integration stub for BP-004 IP-10.
 *
 * Design rationale:
 * ENG-005 / IP-03 will replace this stub when Opportunity Management merges.
 * CRM Core must not be modified from this agent.
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline (Phase 10.4)
 */

import type { CurrentBusinessContext } from "@/core/auth/types";

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

/** No-op stub until IP-03 Opportunity service is available. */
export class NoOpOpportunityHandoffAdapter implements OpportunityHandoffAdapter {
  async onQuotationAccepted(): Promise<void> {
    // IP-03 will update opportunity stage when configured (BRU-006).
  }

  async onSalesOrderCreated(): Promise<void> {
    // BP-006+ will consume sales order handoff records.
  }
}

export function createOpportunityHandoffAdapter(): OpportunityHandoffAdapter {
  return new NoOpOpportunityHandoffAdapter();
}
