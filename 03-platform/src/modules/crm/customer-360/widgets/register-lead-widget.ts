/**
 * Purpose:
 * Register IP-02 Active Lead widget loader for Customer 360 composition.
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
 */

import { registerCustomer360WidgetLoader } from "@/modules/crm/customer-360/widget-registry";
import { createLeadService } from "@/modules/crm/lead/services/lead-service";

registerCustomer360WidgetLoader("active-lead", async ({ businessContext, customer }) => {
  const leadService = createLeadService();
  const summary = await leadService.getActiveLeadWidgetSummary(
    businessContext,
    customer.partyId
  );

  if (!summary) {
    return null;
  }

  return {
    id: "active-lead",
    sourceIp: "IP-02",
    title: "Active Lead",
    label: summary.statusName,
    value: summary.leadNumber,
    hint: summary.sourceName
      ? `${summary.sourceName}${summary.ownerDisplayName ? ` · ${summary.ownerDisplayName}` : ""}`
      : summary.ownerDisplayName ?? undefined,
    status: summary.statusTone,
    href: summary.leadId ? `/leads/${summary.leadId}` : undefined,
  };
});
