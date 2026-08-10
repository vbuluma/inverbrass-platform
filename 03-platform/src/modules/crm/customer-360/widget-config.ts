/**
 * Purpose:
 * Resolve metadata-driven Customer 360 widget visibility per business.
 *
 * Configuration path (business_configuration.settings JSON):
 *   crm.customer360.widgets.<widgetId> = true | false
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

import type {
  Customer360LayoutProfile,
  Customer360WidgetCatalogEntry,
} from "@/modules/crm/customer-360/widget-catalog";
import { CUSTOMER_360_WIDGET_CATALOG } from "@/modules/crm/customer-360/widget-catalog";

export type Customer360WidgetConfigOverrides = Record<string, boolean>;

export type ResolvedCustomer360WidgetConfig = Customer360WidgetCatalogEntry & {
  enabled: boolean;
};

type BusinessSettingsDocument = {
  crm?: {
    customer360?: {
      widgets?: Customer360WidgetConfigOverrides;
    };
  };
};

export function parseCustomer360WidgetOverrides(
  settings: unknown
): Customer360WidgetConfigOverrides {
  if (!settings || typeof settings !== "object") {
    return {};
  }

  const document = settings as BusinessSettingsDocument;
  return document.crm?.customer360?.widgets ?? {};
}

export function resolveCustomer360WidgetConfig(
  layoutProfile: "individual" | "entity",
  overrides: Customer360WidgetConfigOverrides = {},
  catalog: Customer360WidgetCatalogEntry[] = CUSTOMER_360_WIDGET_CATALOG
): ResolvedCustomer360WidgetConfig[] {
  return catalog
    .map((entry) => {
      const profileMatch =
        entry.layoutProfiles.includes("all") ||
        entry.layoutProfiles.includes(layoutProfile as Customer360LayoutProfile);

      if (!profileMatch) {
        return null;
      }

      const override = overrides[entry.id];
      const enabled =
        typeof override === "boolean" ? override : entry.defaultEnabled;

      return {
        ...entry,
        enabled,
      };
    })
    .filter((entry): entry is ResolvedCustomer360WidgetConfig => entry !== null)
    .sort((a, b) => a.order - b.order);
}

export function listEnabledWidgetsForZone(
  configs: ResolvedCustomer360WidgetConfig[],
  zone: Customer360WidgetCatalogEntry["zone"]
): ResolvedCustomer360WidgetConfig[] {
  return configs.filter((config) => config.enabled && config.zone === zone);
}
