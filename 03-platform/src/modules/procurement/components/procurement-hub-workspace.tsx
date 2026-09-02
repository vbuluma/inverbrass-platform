"use client";

/**
 * Purpose:
 * Procurement hub landing — suppliers and purchase requests.
 */

import { TruckIcon } from "lucide-react";
import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import {
  PlatformHubSections,
  PlatformKpiCard,
} from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProcurementDashboardView } from "@/modules/procurement/types";

type ProcurementHubWorkspaceProps = {
  data: ProcurementDashboardView;
};

export function ProcurementHubWorkspace({ data }: ProcurementHubWorkspaceProps) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/dashboard" label="Dashboard" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-lg bg-sky-50 text-sky-800 ring-1 ring-sky-200">
              <TruckIcon className="size-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Procurement</h1>
              <p className="text-sm text-muted-foreground">
                Find suppliers, raise purchase requests, and award sourcing events.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/procurement/requests/new" className={cn(buttonVariants(), "h-10")}>
              New request
            </Link>
            <Link href="/procurement/suppliers" className={cn(buttonVariants({ variant: "outline" }), "h-10")}>
              Find supplier
            </Link>
            <Link
              href="/procurement/suppliers/new"
              className={cn(buttonVariants({ variant: "outline" }), "h-10")}
            >
              Add supplier
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <PlatformKpiCard label="Active suppliers" value={String(data.activeCount)} />
        <PlatformKpiCard label="Preferred" value={String(data.preferredCount)} />
        <PlatformKpiCard label="My drafts" value={String(data.requestDraftCount)} />
        <PlatformKpiCard
          label="Pending approval"
          value={String(data.requestPendingApprovalCount)}
        />
        <PlatformKpiCard label="Open exceptions" value={String(data.openExceptionCount)} />
      </div>

      <PlatformHubSections
        sections={[
          {
            title: "Supplier management",
            description: "Who can we procure from, and are they eligible?",
            links: [
              {
                href: "/procurement/suppliers",
                label: "Suppliers",
                description: "Search, filter, and open supplier profiles.",
              },
              {
                href: "/procurement/suppliers/new",
                label: "Add supplier",
                description: "Link an existing party to a procurement profile.",
              },
            ],
          },
          {
            title: "Purchase requests",
            description: "Turn a need into an approved purchase request.",
            links: [
              {
                href: "/procurement/requests",
                label: "Purchase requests",
                description: "Create, track, and approve purchase requests.",
              },
              {
                href: "/procurement/requests?status=pending-approval",
                label: "Pending approval",
                description: "Requests waiting for a decision.",
              },
              {
                href: "/procurement/requests/new",
                label: "New request",
                description: "Request something the business needs.",
              },
            ],
          },
          {
            title: "Sourcing",
            description: "Invite suppliers, evaluate quotes, and record the award.",
            links: [
              {
                href: "/procurement/sourcing",
                label: "RFX",
                description: "Create sourcing events from approved requests.",
              },
              {
                href: "/procurement/sourcing/evaluations",
                label: "Evaluations",
                description: "Compare budget, quotes, and savings.",
              },
              {
                href: "/procurement/sourcing/awards",
                label: "Awards",
                description: "See who was awarded and for how much.",
              },
            ],
          },
          {
            title: "Controls",
            description: "Resolve variances before payment-ready.",
            links: [
              {
                href: "/procurement/exceptions",
                label: "Exceptions",
                description: "Open, assign, and close procurement exceptions.",
              },
              {
                href: "/procurement/invoices",
                label: "Supplier invoices",
                description: "Review unmatched and duplicate invoices.",
              },
              {
                href: "/procurement/analytics",
                label: "Analytics",
                description: "Spend, cycle time, RFX rates, and lifecycle chains.",
              },
            ],
          },
        ]}
      />
    </main>
  );
}
