/**
 * Purpose:
 * Customer Profile workspace — Customer 360 is the default landing tab.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { SetBreadcrumbs } from "@/components/platform/breadcrumb-context";
import {
  PlatformTabs,
  PlatformWorkspaceHeader,
} from "@/components/platform";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PartyDocumentsPanel } from "@/modules/party/components/party-documents-panel";
import { PartyRelationshipsPanel } from "@/modules/party/components/party-relationships-panel";
import { PartyTimelinePanel } from "@/modules/party/components/party-timeline-panel";
import type {
  PartyDocumentsPanelView,
  PartyRelationshipsPanelView,
  PartyTimelinePanelView,
} from "@/modules/party/types";
import { useCrmDashboardLabels } from "@/modules/crm/crm-terminology-labels";
import {
  CRM_DEFAULT_TAB,
  CRM_WORKSPACE_TABS,
  FUTURE_TAB_MESSAGE,
} from "@/modules/crm/constants";
import { Customer360Panel } from "@/modules/crm/components/customer-360-panel";
import {
  CustomerWorkspaceActivitiesTab,
  CustomerWorkspaceAnalyticsTab,
  CustomerWorkspaceCampaignsTab,
  CustomerWorkspaceCasesTab,
  CustomerWorkspaceCommunicationsTab,
  CustomerWorkspaceQuotationsTab,
  CustomerWorkspaceVisitsTab,
} from "@/modules/crm/components/customer-workspace-ip-panels";
import type {
  CrmDetailView,
  CrmRegistrationCatalogues,
  Customer360CompositionView,
} from "@/modules/crm/types";

type CustomerWorkspaceProps = {
  customer: CrmDetailView;
  catalogues: CrmRegistrationCatalogues;
  customer360: Customer360CompositionView;
  relationships: PartyRelationshipsPanelView;
  documents: PartyDocumentsPanelView;
  timeline: PartyTimelinePanelView;
  initialTab?: string;
};

const DELIVERED_IP_TABS = new Set([
  "activities",
  "visits",
  "communications",
  "cases",
  "quotations",
  "campaigns",
  "analytics",
]);

export function CustomerWorkspace({
  customer,
  catalogues,
  customer360,
  relationships,
  documents,
  timeline,
  initialTab,
}: CustomerWorkspaceProps) {
  const labels = useCrmDashboardLabels();
  const [activeTab, setActiveTab] = useState(initialTab ?? CRM_DEFAULT_TAB);

  const breadcrumbs = useMemo(
    () => [
      { label: "Dashboard", href: "/dashboard" },
      { label: "CRM", href: "/crm" },
      { label: labels.pageTitle, href: "/customers" },
      { label: customer.displayName },
    ],
    [customer.displayName, labels.pageTitle]
  );

  const tabs = CRM_WORKSPACE_TABS.map((tab) => ({
    id: tab.id,
    label: tab.label,
  }));

  return (
    <div className="platform-workspace-main mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <SetBreadcrumbs items={breadcrumbs} />

      <PlatformWorkspaceHeader
        backHref="/customers"
        backLabel={labels.backToDashboard}
        workspaceLabel={labels.workspaceLabel}
        title={customer.displayName}
        subtitle={`${customer.customerNumber} · ${customer.statusName}`}
        statusLabel={customer.statusName}
        quickActions={[
          {
            label: "Price a sale",
            href: `/commercial/resolve?partyId=${encodeURIComponent(customer.partyId)}&crmId=${encodeURIComponent(customer.crmId)}&customerName=${encodeURIComponent(customer.displayName)}`,
          },
          { label: "Offerings", href: "/products" },
        ]}
      />

      <PlatformTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ariaLabel="Customer workspace tabs"
      />

      {activeTab === "customer-360" ? (
        <Customer360Panel
          data={customer360}
          partyId={customer.partyId}
          timelinePanel={timeline}
        />
      ) : null}

      {activeTab === "documents" ? (
        <PartyDocumentsPanel partyId={customer.partyId} initialData={documents} />
      ) : null}

      {activeTab === "relationships" ? (
        <PartyRelationshipsPanel
          partyId={customer.partyId}
          initialData={relationships}
        />
      ) : null}

      {activeTab === "timeline" ? (
        <PartyTimelinePanel partyId={customer.partyId} initialData={timeline} />
      ) : null}

      {activeTab === "accounts" ? (
        <Card>
          <CardHeader>
            <CardTitle>Accounts</CardTitle>
            <CardDescription>
              CRM accounts linked to this customer — contact roles consume BP-002 Party
              identity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href={`/accounts/new?crmRecordId=${customer.crmId}`}
              className="text-sm text-primary hover:underline"
            >
              Create account for this customer
            </Link>
            <p className="text-sm text-muted-foreground">
              Open the Accounts module to manage hierarchy and contact roles. Customer
              360 surfaces the account hierarchy widget when accounts are linked.
            </p>
            <Link
              href="/accounts"
              className="inline-block text-sm text-primary hover:underline"
            >
              Browse accounts
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "opportunities" ? (
        <Card>
          <CardHeader>
            <CardTitle>Opportunities</CardTitle>
            <CardDescription>
              Pipeline deals linked to this customer record.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={`/opportunities/new?crmRecordId=${customer.crmId}`}
              className="text-sm text-primary hover:underline"
            >
              Create opportunity
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "activities" ? (
        <CustomerWorkspaceActivitiesTab
          key={`activities-${customer.partyId}`}
          partyId={customer.partyId}
        />
      ) : null}
      {activeTab === "visits" ? (
        <CustomerWorkspaceVisitsTab
          key={`visits-${customer.partyId}`}
          partyId={customer.partyId}
        />
      ) : null}
      {activeTab === "communications" ? (
        <CustomerWorkspaceCommunicationsTab
          key={`communications-${customer.partyId}`}
          partyId={customer.partyId}
        />
      ) : null}
      {activeTab === "cases" ? (
        <CustomerWorkspaceCasesTab
          key={`cases-${customer.partyId}`}
          partyId={customer.partyId}
        />
      ) : null}
      {activeTab === "quotations" ? (
        <CustomerWorkspaceQuotationsTab
          key={`quotations-${customer.partyId}`}
          partyId={customer.partyId}
        />
      ) : null}
      {activeTab === "campaigns" ? (
        <CustomerWorkspaceCampaignsTab
          key={`campaigns-${customer.partyId}`}
          partyId={customer.partyId}
        />
      ) : null}
      {activeTab === "analytics" ? (
        <CustomerWorkspaceAnalyticsTab
          key={`analytics-${customer.partyId}`}
          partyId={customer.partyId}
        />
      ) : null}

      {activeTab !== "customer-360" &&
      activeTab !== "documents" &&
      activeTab !== "relationships" &&
      activeTab !== "timeline" &&
      activeTab !== "accounts" &&
      activeTab !== "opportunities" &&
      !DELIVERED_IP_TABS.has(activeTab) ? (
        <FutureTabPlaceholder tabId={activeTab} />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>CRM context</CardTitle>
          <CardDescription>
            Customer master fields owned by CRM — identity remains on Party.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <MetaField label="CRM type" value={customer.crmTypeName} />
          <MetaField label="Status" value={customer.statusName} />
          <MetaField label="Owner" value={customer.ownerDisplayName ?? "—"} />
          <MetaField label="Branch" value={customer.branchName ?? "—"} />
          <MetaField label="Source" value={customer.sourceName ?? "—"} />
          <MetaField
            label="Party"
            value={
              <Link href={`/parties/${customer.partyId}`} className="text-primary hover:underline">
                Open party master
              </Link>
            }
          />
          <MetaField
            label="Available statuses"
            value={catalogues.crmStatuses.map((status) => status.name).join(", ")}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function FutureTabPlaceholder({ tabId }: { tabId: string }) {
  const tab = CRM_WORKSPACE_TABS.find((entry) => entry.id === tabId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tab?.label ?? "Coming soon"}</CardTitle>
        <CardDescription>
          {tab?.futureIp
            ? `${FUTURE_TAB_MESSAGE} (${tab.futureIp})`
            : FUTURE_TAB_MESSAGE}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Customer 360 remains the primary landing experience until this tab is
          delivered by its owning implementation package.
        </p>
      </CardContent>
    </Card>
  );
}

function MetaField({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
