/**
 * Purpose:
 * Register IP-12 Customer Analytics widget for Customer 360.
 *
 * Implementation Package:
 * BP-004 / IP-12 – CRM Analytics & Dashboards
 */

import { registerCustomer360WidgetLoader } from "@/modules/crm/customer-360/widget-registry";
import { createCrmAnalyticsService } from "@/modules/crm/analytics/services/crm-analytics-service";

registerCustomer360WidgetLoader(
  "customer-analytics",
  async ({ businessContext, customer }) => {
    const analytics = await createCrmAnalyticsService().getCustomerAnalytics(
      businessContext,
      customer.partyId
    );

    return {
      id: "customer-analytics",
      sourceIp: "IP-12",
      title: "Customer Analytics",
      label: "Relationship value",
      value: String(analytics.relationshipValue),
      hint: `Health ${analytics.healthScore} · Churn ${analytics.churnRisk}${
        analytics.dormancyFlag ? " · Dormant" : ""
      }`,
      status:
        analytics.churnRisk === "HIGH"
          ? "warning"
          : analytics.healthScore >= 60
            ? "success"
            : "default",
      href: "/crm-analytics",
    };
  }
);
