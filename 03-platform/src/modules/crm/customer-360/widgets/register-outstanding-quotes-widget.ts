/**
 * Purpose:
 * Register IP-10 Outstanding Quotations widget for Customer 360.
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline
 */

import { CRM_CUSTOMER_360_WIDGET_IDS } from "@/modules/crm/constants";
import { registerCustomer360WidgetLoader } from "@/modules/crm/customer-360/widget-registry";
import { createQuotationCustomer360Provider } from "@/modules/crm/quotation/services/quotation-customer-360-provider";

registerCustomer360WidgetLoader(
  "outstanding-quotes",
  async ({ businessContext, customer }) => {
    const contribution = await createQuotationCustomer360Provider().getContribution(
      businessContext,
      customer.partyId
    );

    const outstanding = contribution.widgets.find(
      (widget) => widget.id === CRM_CUSTOMER_360_WIDGET_IDS.QUOTATION_OUTSTANDING
    );
    const pending = contribution.widgets.find(
      (widget) =>
        widget.id === CRM_CUSTOMER_360_WIDGET_IDS.QUOTATION_PENDING_ACCEPTANCE
    );

    const outstandingCount =
      typeof outstanding?.value === "number"
        ? outstanding.value
        : Number(outstanding?.value ?? 0);
    const pendingCount =
      typeof pending?.value === "number"
        ? pending.value
        : Number(pending?.value ?? 0);

    return {
      id: "outstanding-quotes",
      sourceIp: "IP-10",
      title: "Outstanding Quotations",
      label: "Open quotes",
      value: String(outstandingCount),
      hint:
        pendingCount > 0
          ? `${pendingCount} awaiting customer acceptance`
          : contribution.insights[0]?.summary,
      status: pendingCount > 0 ? "warning" : "default",
      href: outstanding?.href ?? "/quotations",
    };
  }
);
