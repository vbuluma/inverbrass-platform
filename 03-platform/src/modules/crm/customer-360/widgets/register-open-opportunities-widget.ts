/**
 * Purpose:
 * Register IP-03 Open Opportunities widget for Customer 360.
 *
 * Implementation Package:
 * BP-004 / IP-03 – Opportunity Management
 */

import { registerCustomer360WidgetLoader } from "@/modules/crm/customer-360/widget-registry";
import { createOpportunityService } from "@/modules/crm/opportunity/services/opportunity-service";

registerCustomer360WidgetLoader(
  "open-opportunities",
  async ({ businessContext, customer }) => {
    const opportunityService = createOpportunityService();
    const summary = await opportunityService.getOpenOpportunitiesWidgetSummary(
      businessContext,
      customer.partyId
    );

    if (summary.openCount === 0) {
      return null;
    }

    return {
      id: "open-opportunities",
      sourceIp: "IP-03",
      title: "Open Opportunities",
      label: "Open deals",
      value: String(summary.openCount),
      hint: summary.largestOpportunity
        ? `${summary.largestOpportunity.name} · ${summary.pipelineValue}`
        : `Pipeline ${summary.pipelineValue}`,
      status: "default",
      href: summary.largestOpportunity
        ? `/opportunities/${summary.largestOpportunity.opportunityId}`
        : "/opportunities",
    };
  }
);
