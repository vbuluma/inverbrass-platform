/**
 * Purpose:
 * Customer workspace tab panels for delivered BP-004 IPs (05–12).
 * Mounts existing Customer 360 contribution actions / analytics panel —
 * does not invent a second 360 shell.
 *
 * Implementation Package:
 * BP-004 / IP-01 integration of IP-05–IP-12 contributions
 */

"use client";

import Link from "next/link";
import { useEffect, useState, useTransition, type ReactNode } from "react";

import { PlatformKpiCard } from "@/components/platform";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCrmActivityCustomer360ContributionAction } from "@/modules/crm-activity/actions/crm-activity-actions";
import type { CrmActivityCustomer360Contribution } from "@/modules/crm-activity/types";
import { getCrmCaseCustomer360ContributionAction } from "@/modules/crm-case/actions/crm-case-actions";
import type { CrmCaseCustomer360Contribution } from "@/modules/crm-case/types";
import { getCrmCommunicationCustomer360ContributionAction } from "@/modules/crm-communication/actions/crm-communication-actions";
import type { CrmCommunicationCustomer360Contribution } from "@/modules/crm-communication/types";
import { getCrmVisitCustomer360ContributionAction } from "@/modules/crm-visit/actions/crm-visit-actions";
import type { CrmVisitCustomer360Contribution } from "@/modules/crm-visit/types";
import { getCampaignCustomer360Action } from "@/modules/crm/actions/campaign-actions";
import { getCrmCustomerAnalyticsAction } from "@/modules/crm/actions/crm-analytics-actions";
import { getQuotationCustomer360Action } from "@/modules/crm/actions/quotation-actions";
import type { CrmCustomerAnalyticsView } from "@/modules/crm/analytics/types";
import type { CampaignCustomer360Contribution } from "@/modules/crm/campaign/types";
import { CrmCustomerAnalyticsPanel } from "@/modules/crm/components/crm-customer-analytics-panel";
import type { QuotationCustomer360Contribution } from "@/modules/crm/quotation/types";

type PartyScopedPanelProps = {
  partyId: string;
};

type LoadState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

function useContributionLoad<T>(
  partyId: string,
  loader: (partyId: string) => Promise<
    | { success: true; data: T }
    | { success: false; error: { message: string } }
  >
): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ status: "loading" });
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      const result = await loader(partyId);
      if (cancelled) {
        return;
      }
      if (!result.success) {
        setState({ status: "error", message: result.error.message });
        return;
      }
      setState({ status: "ready", data: result.data });
    });
    return () => {
      cancelled = true;
    };
  }, [partyId, loader]);

  return state;
}

function PanelShell({
  title,
  description,
  browseHref,
  browseLabel,
  createHref,
  createLabel,
  children,
}: {
  title: string;
  description: string;
  browseHref: string;
  browseLabel: string;
  createHref?: string;
  createLabel?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href={browseHref} className="text-primary hover:underline">
            {browseLabel}
          </Link>
          {createHref && createLabel ? (
            <Link href={createHref} className="text-primary hover:underline">
              {createLabel}
            </Link>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function LoadingMessage() {
  return <p className="text-sm text-muted-foreground">Loading…</p>;
}

function ErrorMessage({ message }: { message: string }) {
  return <p className="text-sm text-destructive">{message}</p>;
}

function ItemList({
  items,
}: {
  items: Array<{ id: string; href: string; primary: string; secondary: string }>;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No records for this customer yet.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-md border px-3 py-2 text-sm">
          <Link href={item.href} className="font-medium text-primary hover:underline">
            {item.primary}
          </Link>
          <p className="text-muted-foreground">{item.secondary}</p>
        </li>
      ))}
    </ul>
  );
}

function DomainContributionBody({
  widgets,
  insights,
  quickActions,
}: {
  widgets: Array<{
    id: string;
    label: string;
    value: string | number;
    tone?: "default" | "warning" | "success";
  }>;
  insights: Array<{ id: string; label: string; summary: string }>;
  quickActions: Array<{ id: string; label: string; href: string }>;
}) {
  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {widgets.map((widget) => (
          <PlatformKpiCard
            key={widget.id}
            label={widget.label}
            value={widget.value}
            variant={
              widget.tone === "warning"
                ? "warning"
                : widget.tone === "success"
                  ? "success"
                  : "default"
            }
          />
        ))}
      </section>
      {insights.length > 0 ? (
        <div className="space-y-2">
          {insights.map((insight) => (
            <div key={insight.id} className="rounded-md border px-3 py-2 text-sm">
              <p className="font-medium">{insight.label}</p>
              <p className="text-muted-foreground">{insight.summary}</p>
            </div>
          ))}
        </div>
      ) : null}
      {quickActions.length > 0 ? (
        <div className="flex flex-wrap gap-3 text-sm">
          {quickActions.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className="text-primary hover:underline"
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const loadActivityContribution = (partyId: string) =>
  getCrmActivityCustomer360ContributionAction(partyId);

export function CustomerWorkspaceActivitiesTab({ partyId }: PartyScopedPanelProps) {
  const state = useContributionLoad(partyId, loadActivityContribution);

  return (
    <PanelShell
      title="Activities"
      description="Open tasks and recent activities for this customer (IP-05)."
      browseHref="/crm/activities"
      browseLabel="Browse activities"
      createHref={`/crm/activities/new?partyId=${partyId}`}
      createLabel="Log activity"
    >
      {state.status === "loading" ? <LoadingMessage /> : null}
      {state.status === "error" ? <ErrorMessage message={state.message} /> : null}
      {state.status === "ready" ? (
        <ActivityContributionBody data={state.data} />
      ) : null}
    </PanelShell>
  );
}

function ActivityContributionBody({
  data,
}: {
  data: CrmActivityCustomer360Contribution;
}) {
  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard label="Open tasks" value={data.openTasksCount} />
        <PlatformKpiCard
          label="Overdue"
          value={data.overdueTasksCount}
          variant={data.overdueTasksCount > 0 ? "warning" : "default"}
        />
        <PlatformKpiCard label="Upcoming" value={data.upcomingActivitiesCount} />
        <PlatformKpiCard
          label="Next follow-up"
          value={
            data.nextFollowUpDate
              ? data.nextFollowUpDate.slice(0, 10)
              : "—"
          }
        />
      </section>
      <ItemList
        items={data.recentActivities.map((activity) => ({
          id: activity.id,
          href: `/crm/activities/${activity.id}`,
          primary: `${activity.activityNumber} · ${activity.subject}`,
          secondary: `${activity.statusLabel} · ${activity.activityTypeLabel}${
            activity.dueDate ? ` · due ${activity.dueDate.slice(0, 10)}` : ""
          }`,
        }))}
      />
    </div>
  );
}

const loadVisitContribution = (partyId: string) =>
  getCrmVisitCustomer360ContributionAction(partyId);

export function CustomerWorkspaceVisitsTab({ partyId }: PartyScopedPanelProps) {
  const state = useContributionLoad(partyId, loadVisitContribution);

  return (
    <PanelShell
      title="Visits"
      description="Visit plans and call reports for this customer (IP-07)."
      browseHref="/crm/visits"
      browseLabel="Browse visits"
      createHref={`/crm/visits/new?partyId=${partyId}`}
      createLabel="Plan visit"
    >
      {state.status === "loading" ? <LoadingMessage /> : null}
      {state.status === "error" ? <ErrorMessage message={state.message} /> : null}
      {state.status === "ready" ? <VisitContributionBody data={state.data} /> : null}
    </PanelShell>
  );
}

function VisitContributionBody({ data }: { data: CrmVisitCustomer360Contribution }) {
  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <PlatformKpiCard label="Upcoming visits" value={data.upcomingVisits.length} />
        <PlatformKpiCard label="Recent visits" value={data.recentVisits.length} />
        <PlatformKpiCard
          label="Pending approvals"
          value={data.pendingApprovals}
          variant={data.pendingApprovals > 0 ? "warning" : "default"}
        />
      </section>
      <ItemList
        items={data.recentVisits.map((visit) => ({
          id: visit.id,
          href: `/crm/visits/${visit.id}`,
          primary: `${visit.visitNumber} · ${visit.subject}`,
          secondary: `${visit.statusLabel} · ${visit.visitDate.slice(0, 10)}`,
        }))}
      />
    </div>
  );
}

const loadCommunicationContribution = (partyId: string) =>
  getCrmCommunicationCustomer360ContributionAction(partyId);

export function CustomerWorkspaceCommunicationsTab({
  partyId,
}: PartyScopedPanelProps) {
  const state = useContributionLoad(partyId, loadCommunicationContribution);

  return (
    <PanelShell
      title="Communications"
      description="Logged interactions for this customer (IP-08)."
      browseHref="/crm/communications"
      browseLabel="Browse communications"
      createHref={`/crm/communications/new?partyId=${partyId}`}
      createLabel="Log communication"
    >
      {state.status === "loading" ? <LoadingMessage /> : null}
      {state.status === "error" ? <ErrorMessage message={state.message} /> : null}
      {state.status === "ready" ? (
        <CommunicationContributionBody data={state.data} />
      ) : null}
    </PanelShell>
  );
}

function CommunicationContributionBody({
  data,
}: {
  data: CrmCommunicationCustomer360Contribution;
}) {
  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <PlatformKpiCard
          label="Recent entries"
          value={data.recentCommunicationCount}
        />
        <PlatformKpiCard
          label="Last channel"
          value={data.lastInteractionChannel ?? "—"}
        />
        <PlatformKpiCard
          label="Last interaction"
          value={
            data.lastInteractionAt
              ? data.lastInteractionAt.slice(0, 10)
              : "—"
          }
        />
      </section>
      <ItemList
        items={data.recentCommunications.map((entry) => ({
          id: entry.id,
          href: `/crm/communications/${entry.id}`,
          primary: `${entry.communicationNumber} · ${entry.subject ?? entry.summary}`,
          secondary: `${entry.channelTypeLabel} · ${entry.directionLabel} · ${entry.communicatedAt.slice(0, 10)}`,
        }))}
      />
    </div>
  );
}

const loadCaseContribution = (partyId: string) =>
  getCrmCaseCustomer360ContributionAction(partyId);

export function CustomerWorkspaceCasesTab({ partyId }: PartyScopedPanelProps) {
  const state = useContributionLoad(partyId, loadCaseContribution);

  return (
    <PanelShell
      title="Cases"
      description="Service cases and complaints for this customer (IP-09)."
      browseHref="/crm/cases"
      browseLabel="Browse cases"
      createHref={`/crm/cases/new?partyId=${partyId}`}
      createLabel="Create case"
    >
      {state.status === "loading" ? <LoadingMessage /> : null}
      {state.status === "error" ? <ErrorMessage message={state.message} /> : null}
      {state.status === "ready" ? <CaseContributionBody data={state.data} /> : null}
    </PanelShell>
  );
}

function CaseContributionBody({ data }: { data: CrmCaseCustomer360Contribution }) {
  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard label="Open cases" value={data.openCaseCount} />
        <PlatformKpiCard
          label="SLA at risk"
          value={data.slaAtRiskCount}
          variant={data.slaAtRiskCount > 0 ? "warning" : "default"}
        />
        <PlatformKpiCard
          label="Breached"
          value={data.breachedCaseCount}
          variant={data.breachedCaseCount > 0 ? "warning" : "default"}
        />
        <PlatformKpiCard label="Escalated" value={data.escalatedCaseCount} />
      </section>
      <ItemList
        items={data.recentCases.map((item) => ({
          id: item.id,
          href: `/crm/cases/${item.id}`,
          primary: `${item.caseNumber} · ${item.subject}`,
          secondary: `${item.statusLabel} · ${item.priorityLabel}`,
        }))}
      />
    </div>
  );
}

const loadQuotationContribution = (partyId: string) =>
  getQuotationCustomer360Action(partyId);

export function CustomerWorkspaceQuotationsTab({
  partyId,
}: PartyScopedPanelProps) {
  const state = useContributionLoad(partyId, loadQuotationContribution);

  return (
    <PanelShell
      title="Quotations"
      description="Outstanding and accepted quotations for this customer (IP-10)."
      browseHref="/quotations"
      browseLabel="Browse quotations"
      createHref="/quotations/new"
      createLabel="New quotation"
    >
      {state.status === "loading" ? <LoadingMessage /> : null}
      {state.status === "error" ? <ErrorMessage message={state.message} /> : null}
      {state.status === "ready" ? (
        <QuotationContributionBody data={state.data} />
      ) : null}
    </PanelShell>
  );
}

function QuotationContributionBody({
  data,
}: {
  data: QuotationCustomer360Contribution;
}) {
  return (
    <DomainContributionBody
      widgets={data.widgets}
      insights={data.insights}
      quickActions={data.quickActions}
    />
  );
}

const loadCampaignContribution = (partyId: string) =>
  getCampaignCustomer360Action(partyId);

export function CustomerWorkspaceCampaignsTab({
  partyId,
}: PartyScopedPanelProps) {
  const state = useContributionLoad(partyId, loadCampaignContribution);

  return (
    <PanelShell
      title="Campaigns"
      description="Campaign membership and responses for this customer (IP-11)."
      browseHref="/campaigns"
      browseLabel="Browse campaigns"
    >
      {state.status === "loading" ? <LoadingMessage /> : null}
      {state.status === "error" ? <ErrorMessage message={state.message} /> : null}
      {state.status === "ready" ? (
        <CampaignContributionBody data={state.data} />
      ) : null}
    </PanelShell>
  );
}

function CampaignContributionBody({
  data,
}: {
  data: CampaignCustomer360Contribution;
}) {
  return (
    <DomainContributionBody
      widgets={data.widgets}
      insights={data.insights}
      quickActions={data.quickActions}
    />
  );
}

const loadAnalyticsContribution = (partyId: string) =>
  getCrmCustomerAnalyticsAction(partyId);

export function CustomerWorkspaceAnalyticsTab({
  partyId,
}: PartyScopedPanelProps) {
  const state = useContributionLoad(partyId, loadAnalyticsContribution);

  return (
    <PanelShell
      title="Analytics"
      description="Customer health and relationship analytics (IP-12)."
      browseHref="/crm-analytics"
      browseLabel="Open CRM analytics dashboard"
    >
      {state.status === "loading" ? <LoadingMessage /> : null}
      {state.status === "error" ? <ErrorMessage message={state.message} /> : null}
      {state.status === "ready" ? (
        <AnalyticsContributionBody data={state.data} />
      ) : null}
    </PanelShell>
  );
}

function AnalyticsContributionBody({ data }: { data: CrmCustomerAnalyticsView }) {
  return (
    <div className="space-y-4">
      <CrmCustomerAnalyticsPanel data={data} />
      {data.quickActions.length > 0 ? (
        <div className="flex flex-wrap gap-3 text-sm">
          {data.quickActions.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className="text-primary hover:underline"
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
