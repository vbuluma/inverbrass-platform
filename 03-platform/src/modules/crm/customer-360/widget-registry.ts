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

/** IP-01 built-in loader until IP-12 delivers scoring. */
registerCustomer360WidgetLoader("health-summary", async ({ customer }) => ({
  id: "health-summary",
  sourceIp: "IP-01",
  title: "Relationship Health",
  label: "Health score",
  value: "Not yet calculated",
  hint: `${customer.statusName} customer — analytics widgets arrive in IP-12.`,
  status: "default",
  unavailable: true,
}));
