/**
 * Purpose:
 * Compose Customer 360 from metadata catalog, business configuration,
 * registered widget loaders, and BP-002 read services.
 *
 * Customer 360 is a composition layer — not a static dashboard.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import type { PartyTimelineListResult } from "@/core/party-timeline";
import type { WorkAssignmentSummaryView } from "@/core/work-assignment-sla";
import {
  CUSTOMER_360_ZONE_LABELS,
  type Customer360WidgetCatalogEntry,
} from "@/modules/crm/customer-360/widget-catalog";
import {
  listEnabledWidgetsForZone,
  parseCustomer360WidgetOverrides,
  resolveCustomer360WidgetConfig,
  type ResolvedCustomer360WidgetConfig,
} from "@/modules/crm/customer-360/widget-config";
import {
  getCustomer360WidgetLoader,
  type Customer360WidgetContext,
  type Customer360WidgetZone,
} from "@/modules/crm/customer-360/widget-registry";
import { resolveCustomer360LayoutProfile } from "@/modules/crm/services/crm-rules";
import type {
  CrmDetailView,
  Customer360CompositionView,
  Customer360IdentityPanelView,
  Customer360WidgetSlotView,
  Customer360WidgetSummary,
  Customer360ZoneView,
} from "@/modules/crm/types";
import type { PartyRelationshipsPanelView } from "@/modules/party/types";

export type ComposeCustomer360Input = {
  context: CurrentBusinessContext;
  customer: CrmDetailView;
  relationships: PartyRelationshipsPanelView;
  /** Read-only feed from BP-002 Party Timeline — never a CRM-owned timeline. */
  partyTimeline: PartyTimelineListResult;
  assignmentSummary: WorkAssignmentSummaryView | null;
  /** Display label from BP-002 preferredContactMethod — never a CRM-owned preference. */
  preferredChannel?: string | null;
  businessSettings?: unknown;
};

function buildIdentityPanel(
  customer: CrmDetailView,
  preferredChannel: string | null
): Customer360IdentityPanelView {
  return {
    partyId: customer.partyId,
    customerNumber: customer.customerNumber,
    displayName: customer.displayName,
    partyTypeCode: customer.partyTypeCode,
    partyTypeName:
      customer.partyTypeCode === "INDIVIDUAL" ? "Individual" : "Organization",
    crmTypeName: customer.crmTypeName,
    statusName: customer.statusName,
    ownerDisplayName: customer.ownerDisplayName,
    relationshipManagerDisplayName: customer.relationshipManagerDisplayName,
    branchName: customer.branchName,
    customerSince: customer.customerSince,
    sourceName: customer.sourceName,
    preferredChannel,
  };
}

async function loadWidgetSlot(
  config: ResolvedCustomer360WidgetConfig,
  widgetContext: Customer360WidgetContext
): Promise<Customer360WidgetSlotView> {
  const loader = getCustomer360WidgetLoader(config.id);

  if (!loader) {
    return {
      config,
      summary: buildPlaceholderSummary(config),
      state: "placeholder",
    };
  }

  try {
    const summary = await loader(widgetContext);
    if (!summary) {
      return {
        config,
        summary: buildPlaceholderSummary(config),
        state: "placeholder",
      };
    }

    return {
      config,
      summary,
      state: summary.unavailable ? "placeholder" : "active",
    };
  } catch (error) {
    console.error(`[customer-360] Widget ${config.id} failed`, error);
    return {
      config,
      summary: {
        id: config.id,
        sourceIp: config.sourceIp,
        title: config.title,
        label: config.title,
        value: "Unavailable",
        hint: "This widget could not be loaded.",
        status: "warning",
        unavailable: true,
      },
      state: "error",
    };
  }
}

function buildPlaceholderSummary(
  config: Customer360WidgetCatalogEntry
): Customer360WidgetSummary {
  return {
    id: config.id,
    sourceIp: config.sourceIp,
    title: config.title,
    label: config.title,
    value: "—",
    hint: config.placeholderHint,
    status: "default",
    unavailable: true,
  };
}

async function composeZone(
  zone: Customer360WidgetZone,
  enabledConfigs: ResolvedCustomer360WidgetConfig[],
  widgetContext: Customer360WidgetContext
): Promise<Customer360ZoneView> {
  const slots = await Promise.all(
    enabledConfigs.map((config) => loadWidgetSlot(config, widgetContext))
  );

  return {
    zone,
    label: CUSTOMER_360_ZONE_LABELS[zone],
    slots,
  };
}

export async function composeCustomer360View(
  input: ComposeCustomer360Input
): Promise<Customer360CompositionView> {
  const layoutProfile = resolveCustomer360LayoutProfile(input.customer.partyTypeCode);
  const overrides = parseCustomer360WidgetOverrides(input.businessSettings);
  const widgetConfigs = resolveCustomer360WidgetConfig(layoutProfile, overrides);

  const widgetContext: Customer360WidgetContext = {
    businessContext: input.context,
    customer: input.customer,
  };

  const zones: Customer360WidgetZone[] = [
    "business-summary",
    "insights",
    "health",
  ];

  const composedZones = await Promise.all(
    zones.map((zone) =>
      composeZone(
        zone,
        listEnabledWidgetsForZone(widgetConfigs, zone),
        widgetContext
      )
    )
  );

  return {
    layoutProfile,
    identity: buildIdentityPanel(
      input.customer,
      input.preferredChannel ?? null
    ),
    assignmentSummary: input.assignmentSummary,
    relationships: input.relationships,
    partyTimeline: input.partyTimeline,
    partyTimelineSource: "BP-002 Party Timeline",
    zones: composedZones,
    widgetConfigs,
  };
}
