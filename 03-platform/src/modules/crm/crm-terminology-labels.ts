/**
 * Purpose:
 * Industry-native CRM labels for dashboards and workspace UI.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

"use client";

import { useMemo } from "react";

import type { BusinessTerminology } from "@/core/industry-experience/business-terminology";
import { useBusinessTerminology } from "@/core/industry-experience/business-terminology-context";

export function buildCrmDashboardLabels(terminology: BusinessTerminology) {
  const customer = terminology.entities.customer;
  return {
    pageTitle: `${customer.plural} Dashboard`,
    registerCustomer: `Register ${customer.singular}`,
    backToDashboard: `Back to ${customer.plural.toLowerCase()}`,
    searchPlaceholder: `Search ${customer.plural.toLowerCase()}…`,
    emptyTitle: `No ${customer.plural.toLowerCase()} yet`,
    emptyDescription: `Register your first ${customer.singular.toLowerCase()} from an existing party.`,
    workspaceLabel: "Customer Profile",
    customer360Title: `${customer.singular} 360`,
    totalCustomers: `Total ${customer.plural}`,
  } as const;
}

export function useCrmDashboardLabels() {
  const terminology = useBusinessTerminology();
  return useMemo(() => buildCrmDashboardLabels(terminology), [terminology]);
}
