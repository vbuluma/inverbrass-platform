/**
 * Purpose:
 * Customer 360 widget loader registry.
 *
 * Catalog metadata lives in widget-catalog.ts; this module holds optional
 * loaders contributed by CRM IPs. Missing loaders render configured placeholders.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { createCrmAnalyticsService } from "@/modules/crm/analytics/services/crm-analytics-service";
import type {
  Customer360WidgetSummary,
  CrmDetailView,
} from "@/modules/crm/types";

export type Customer360WidgetZone =
  | "business-summary"
  | "insights"
  | "health";

export type Customer360WidgetContext = {
  businessContext: CurrentBusinessContext;
  customer: CrmDetailView;
};

export type Customer360WidgetLoader = (
  context: Customer360WidgetContext
) => Promise<Customer360WidgetSummary | null>;

const widgetLoaders = new Map<string, Customer360WidgetLoader>();

export function registerCustomer360WidgetLoader(
  widgetId: string,
  loader: Customer360WidgetLoader
): void {
  widgetLoaders.set(widgetId, loader);
}

export function getCustomer360WidgetLoader(
  widgetId: string
): Customer360WidgetLoader | undefined {
  return widgetLoaders.get(widgetId);
}

export function unregisterCustomer360WidgetLoader(widgetId: string): void {
  widgetLoaders.delete(widgetId);
}

/** IP-12 health score via getCustomerAnalytics — replaces IP-01 placeholder. */
registerCustomer360WidgetLoader(
  "health-summary",
  async ({ businessContext, customer }) => {
    const analytics = await createCrmAnalyticsService().getCustomerAnalytics(
      businessContext,
      customer.partyId
    );

    return {
      id: "health-summary",
      sourceIp: "IP-12",
      title: "Relationship Health",
      label: "Health score",
      value: String(analytics.healthScore),
      hint: analytics.dormancyFlag
        ? `Dormant · Churn ${analytics.churnRisk} · ${customer.statusName}`
        : `Churn ${analytics.churnRisk} · ${analytics.openQuotations} open quote(s)`,
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
