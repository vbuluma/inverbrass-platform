/**
 * Purpose:
 * Register IP-11 Campaign Membership widget for Customer 360.
 *
 * Implementation Package:
 * BP-004 / IP-11 – Campaign Management
 */

import { CRM_CUSTOMER_360_WIDGET_IDS } from "@/modules/crm/constants";
import { registerCustomer360WidgetLoader } from "@/modules/crm/customer-360/widget-registry";
import { createCampaignCustomer360Provider } from "@/modules/crm/campaign/services/campaign-customer-360-provider";

registerCustomer360WidgetLoader(
  "campaign-membership",
  async ({ businessContext, customer }) => {
    const contribution = await createCampaignCustomer360Provider().getContribution(
      businessContext,
      customer.partyId
    );

    const active = contribution.widgets.find(
      (widget) =>
        widget.id === CRM_CUSTOMER_360_WIDGET_IDS.CAMPAIGN_ACTIVE_MEMBERSHIPS
    );
    const lastTouch = contribution.widgets.find(
      (widget) => widget.id === CRM_CUSTOMER_360_WIDGET_IDS.CAMPAIGN_LAST_TOUCH
    );

    const activeCount =
      typeof active?.value === "number"
        ? active.value
        : Number(active?.value ?? 0);

    return {
      id: "campaign-membership",
      sourceIp: "IP-11",
      title: "Campaign Membership",
      label: "Active campaigns",
      value: String(activeCount),
      hint:
        lastTouch && lastTouch.value !== "—"
          ? `Last touch ${String(lastTouch.value)}`
          : contribution.insights[0]?.summary,
      status: activeCount > 0 ? "success" : "default",
      href: "/campaigns",
    };
  }
);
