/**
 * Purpose:
 * CRM hub landing — pipeline, engagement, and Customer Profile entry.
 *
 * Navigation:
 * NAV-001 hub-first IA. Domain routes are unchanged.
 */

"use client";

import { HandshakeIcon, PlusIcon, TargetIcon, FileTextIcon } from "lucide-react";
import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import {
  PlatformEmptyState,
  PlatformHubSections,
  PlatformKpiCard,
} from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CrmDashboardView } from "@/modules/crm/types";

type CrmHubWorkspaceProps = {
  data: CrmDashboardView;
};

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function CrmHubWorkspace({ data }: CrmHubWorkspaceProps) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/dashboard" label="Back to dashboard" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
              <HandshakeIcon className="size-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">CRM</h1>
              <p className="text-sm text-muted-foreground">
                Manage relationships, pipeline, and customer engagement.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/customers/new" className={cn(buttonVariants(), "gap-2")}>
              <PlusIcon className="size-4" aria-hidden />
              Register customer
            </Link>
            <Link
              href="/leads/new"
              className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
            >
              <TargetIcon className="size-4" aria-hidden />
              New lead
            </Link>
            <Link
              href="/quotations/new"
              className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
            >
              <FileTextIcon className="size-4" aria-hidden />
              New quotation
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <PlatformKpiCard label="Customers" value={data.totalCustomers} />
        <PlatformKpiCard label="Prospects" value={data.prospectCount} />
        <PlatformKpiCard label="Leads" value={data.leadCount} />
        <PlatformKpiCard label="Active" value={data.activeCount} />
        <PlatformKpiCard label="Dormant" value={data.dormantCount} />
      </div>

      <PlatformHubSections
        sections={[
          {
            title: "Pipeline",
            description: "Win and progress commercial relationships.",
            links: [
              {
                href: "/customers",
                label: "Customer Profile",
                description: "Open a profile. Customer 360 is the first tab.",
              },
              {
                href: "/leads",
                label: "Leads",
                description: "Capture and qualify new demand.",
              },
              {
                href: "/opportunities",
                label: "Opportunities",
                description: "Track deals through the sales pipeline.",
              },
              {
                href: "/accounts",
                label: "Accounts",
                description: "Organisation accounts and contacts.",
              },
              {
                href: "/quotations",
                label: "Quotations",
                description: "Prepare and send commercial quotes.",
              },
            ],
          },
          {
            title: "Engagement",
            description: "Stay in contact and resolve service work.",
            links: [
              {
                href: "/crm/activities",
                label: "Activities",
                description: "Tasks, calls, and follow-ups.",
              },
              {
                href: "/crm/appointments",
                label: "Appointments",
                description: "Calendar and customer appointments.",
              },
              {
                href: "/crm/visits",
                label: "Visits",
                description: "Visit plans and call reports.",
              },
              {
                href: "/crm/communications",
                label: "Communications",
                description: "Messages sent to customers.",
              },
              {
                href: "/crm/cases",
                label: "Cases",
                description: "Service requests and complaints.",
              },
            ],
          },
          {
            title: "Insights",
            links: [
              {
                href: "/campaigns",
                label: "Campaigns",
                description: "Plan and track marketing campaigns.",
              },
              {
                href: "/crm-analytics",
                label: "Analytics",
                description: "Pipeline, engagement, and productivity.",
              },
            ],
          },
        ]}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Recently updated</h2>
        {data.recentlyUpdated.length === 0 ? (
          <PlatformEmptyState
            title="No customers yet"
            description="Register a customer to start relationship management."
            actionLabel="Register customer"
            actionHref="/customers/new"
          />
        ) : (
          <ul className="divide-y rounded-xl border bg-white">
            {data.recentlyUpdated.map((item) => (
              <li key={item.crmId}>
                <Link
                  href={`/customers/${item.crmId}`}
                  className="block px-4 py-3 hover:bg-slate-50"
                >
                  <p className="font-medium">{item.displayName}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.customerNumber} · {item.statusName} · Updated{" "}
                    {formatDate(item.updatedAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
