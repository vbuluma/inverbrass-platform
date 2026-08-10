/**
 * Purpose:
 * Customer 360 read-only contribution for quotations (IP-10 → IP-01 contract).
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline (Phase 10.7)
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  CRM_CUSTOMER_360_INSIGHT_IDS,
  CRM_CUSTOMER_360_QUICK_ACTION_IDS,
  CRM_CUSTOMER_360_WIDGET_IDS,
  CRM_TIMELINE_EVENT_TYPES,
  QUOTATION_OUTSTANDING_STATUS_CODES,
  QUOTATION_PENDING_ACCEPTANCE_STATUS_CODES,
  QUOTATION_STATUS_CODES,
} from "@/modules/crm/constants";
import { createQuotationRepository } from "@/modules/crm/quotation/repositories/quotation-repository";
import { createQuotationVersionRepository } from "@/modules/crm/quotation/repositories/quotation-version-repository";
import type { QuotationCustomer360Contribution } from "@/modules/crm/quotation/types";

export class QuotationCustomer360Provider {
  constructor(
    private readonly quotationRepository = createQuotationRepository(),
    private readonly versionRepository = createQuotationVersionRepository()
  ) {}

  async getContribution(
    context: CurrentBusinessContext,
    partyId: string
  ): Promise<QuotationCustomer360Contribution> {
    const { rows } = await this.quotationRepository.search(context.businessId, {
      partyId,
      pageSize: 100,
    });

    let outstanding = 0;
    let pendingAcceptance = 0;
    let expired = 0;
    let accepted = 0;
    let totalQuotedValue = 0;

    for (const { quotation } of rows) {
      if (
        (QUOTATION_OUTSTANDING_STATUS_CODES as readonly string[]).includes(
          quotation.status
        )
      ) {
        outstanding += 1;
      }
      if (
        (QUOTATION_PENDING_ACCEPTANCE_STATUS_CODES as readonly string[]).includes(
          quotation.status
        )
      ) {
        pendingAcceptance += 1;
      }
      if (quotation.status === QUOTATION_STATUS_CODES.EXPIRED) {
        expired += 1;
      }
      if (quotation.status === QUOTATION_STATUS_CODES.ACCEPTED) {
        accepted += 1;
      }

      const version = await this.versionRepository.findByQuotationAndNumber(
        context.businessId,
        quotation.id,
        quotation.currentVersionNumber
      );
      if (version) {
        totalQuotedValue += Number(version.grandTotal);
      }
    }

    const latestQuotation = rows[0]?.quotation;

    return {
      domain: "quotations",
      widgets: [
        {
          id: CRM_CUSTOMER_360_WIDGET_IDS.QUOTATION_OUTSTANDING,
          label: "Outstanding Quotations",
          value: outstanding,
          href: latestQuotation
            ? `/quotations/${latestQuotation.id}`
            : "/quotations",
        },
        {
          id: CRM_CUSTOMER_360_WIDGET_IDS.QUOTATION_PENDING_ACCEPTANCE,
          label: "Pending Acceptance",
          value: pendingAcceptance,
          tone: pendingAcceptance > 0 ? "warning" : "default",
        },
        {
          id: CRM_CUSTOMER_360_WIDGET_IDS.QUOTATION_EXPIRED,
          label: "Expired Quotes",
          value: expired,
          tone: expired > 0 ? "warning" : "default",
        },
        {
          id: CRM_CUSTOMER_360_WIDGET_IDS.QUOTATION_ACCEPTED,
          label: "Accepted Quotations",
          value: accepted,
          tone: accepted > 0 ? "success" : "default",
        },
      ],
      insights: [
        {
          id: CRM_CUSTOMER_360_INSIGHT_IDS.QUOTATION_TOTAL_QUOTED_VALUE,
          label: "Total Quoted Value",
          summary: `${totalQuotedValue.toFixed(2)} across ${rows.length} quotation(s)`,
        },
        {
          id: CRM_CUSTOMER_360_INSIGHT_IDS.QUOTATION_AWAITING_RESPONSE,
          label: "Awaiting Response",
          summary:
            pendingAcceptance > 0
              ? `${pendingAcceptance} quotation(s) sent and awaiting customer response.`
              : "No quotations awaiting customer response.",
          tone: pendingAcceptance > 0 ? "warning" : "default",
        },
      ],
      quickActions: [
        {
          id: CRM_CUSTOMER_360_QUICK_ACTION_IDS.QUOTATION_VIEW_LATEST,
          label: latestQuotation
            ? `View ${latestQuotation.quotationNumber}`
            : "View Quotations",
          href: latestQuotation
            ? `/quotations/${latestQuotation.id}`
            : "/quotations",
        },
        {
          id: CRM_CUSTOMER_360_QUICK_ACTION_IDS.QUOTATION_CREATE_FROM_OPPORTUNITY,
          label: "New Quotation",
          href: "/quotations/new",
        },
      ],
      timelineEventTypes: Object.values(CRM_TIMELINE_EVENT_TYPES),
    };
  }
}

export function createQuotationCustomer360Provider() {
  return new QuotationCustomer360Provider();
}
