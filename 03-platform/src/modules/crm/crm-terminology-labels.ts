/**
 * Purpose:
 * Industry-native CRM labels for dashboards and workspace UI.
 * Also includes ENG-003k - CRM quotation/campaign/analytics UI labels (static v1 profile).
 *
 * Implementation Package:
 * BP-004 / IP-001 - CRM Foundation & Customer 360
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
    searchPlaceholder: `Search ${customer.plural.toLowerCase()}...`,
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

export const CRM_QUOTATION_LABELS = {
  moduleName: "Quotations",
  dashboardTitle: "Quotations",
  dashboardDescription:
    "Create, send, and track customer quotations linked to opportunities and offerings.",
  workspaceTitle: "Quotation",
  createLabel: "New Quotation",
  backLabel: "Back to Quotations",
  searchPlaceholder: "Search quotations...",
  emptyTitle: "No quotations yet",
  metrics: {
    total: "Total Quotations",
    draft: "Draft",
    sent: "Sent",
    accepted: "Accepted",
    pendingApproval: "Pending Approval",
    quotedValue: "Total Quoted Value",
  },
  actions: {
    send: "Send Quotation",
    accept: "Mark Accepted",
    reject: "Mark Rejected",
    expire: "Mark Expired",
    revise: "Create Revision",
    refreshPrices: "Refresh Prices",
    submitApproval: "Submit for Approval",
    approve: "Approve",
    rejectApproval: "Reject Approval",
    generateDocument: "Generate Document",
    convertOrder: "Create Sales Order",
  },
  tabs: {
    overview: "Overview",
    lines: "Line Items",
    document: "Document",
    versions: "Versions",
  },
} as const;

export function useCrmQuotationLabels() {
  return CRM_QUOTATION_LABELS;
}

export const CRM_CAMPAIGN_LABELS = {
  moduleName: "Campaigns",
  dashboardTitle: "Campaigns",
  dashboardDescription:
    "Plan campaigns, sync party-group audiences, capture responses, and track ROI.",
  workspaceTitle: "Campaign",
  createLabel: "New Campaign",
  backLabel: "Back to Campaigns",
  emptyTitle: "No campaigns yet",
  metrics: {
    total: "Total Campaigns",
    planned: "Planned",
    active: "Active",
    completed: "Completed",
    budget: "Total Budget",
  },
  actions: {
    activate: "Activate",
    complete: "Complete",
    cancel: "Cancel",
    syncAudience: "Sync Audience",
    markSent: "Mark Sent",
    recordResponse: "Record Response",
    markConverted: "Mark Converted",
  },
  tabs: {
    overview: "Overview",
    members: "Members",
    roi: "ROI",
  },
} as const;

export function useCrmCampaignLabels() {
  return CRM_CAMPAIGN_LABELS;
}

export const CRM_ANALYTICS_LABELS = {
  moduleName: "CRM Analytics",
  dashboardTitle: "CRM Analytics",
  dashboardDescription:
    "Executive KPIs for quotations, campaigns, and customer health. Missing CRM Core sources degrade gracefully.",
  backLabel: "Dashboard",
  refreshLabel: "Refresh Snapshots",
  exportLabel: "Export CSV",
  emptyPending: "Awaiting upstream CRM data",
} as const;

export function useCrmAnalyticsLabels() {
  return CRM_ANALYTICS_LABELS;
}