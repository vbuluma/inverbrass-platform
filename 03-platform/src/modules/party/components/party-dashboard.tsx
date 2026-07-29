/**
 * Purpose:
 * Party Dashboard — KPIs, recent registrations, and quick actions.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

"use client";

import {
  Building2Icon,
  NetworkIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState } from "@/components/platform/platform-empty-state";
import { PlatformKpiCard } from "@/components/platform/platform-kpi-card";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PARTY_TYPE_CODES } from "@/modules/party/constants";
import type { PartyDashboardView } from "@/modules/party/types";

type PartyDashboardProps = {
  data: PartyDashboardView;
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

export function PartyDashboard({ data }: PartyDashboardProps) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/dashboard" label="Back to dashboard" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
                <UsersIcon className="size-5" aria-hidden />
              </span>
              <h1 className="text-2xl font-semibold tracking-tight">
                Party Dashboard
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Master repository for Individuals and Organizations.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/parties/new?type=INDIVIDUAL"
              prefetch={false}
              className={cn(buttonVariants({ variant: "default" }), "gap-2")}
            >
              <UserPlusIcon className="size-4" aria-hidden />
              Create Individual
            </Link>
            <Link
              href="/parties/new?type=ORGANIZATION"
              prefetch={false}
              className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
            >
              <Building2Icon className="size-4" aria-hidden />
              Create Organization
            </Link>
          </div>
        </div>
      </div>

      <section
        aria-labelledby="party-kpis-heading"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <h2 id="party-kpis-heading" className="sr-only">
          Party statistics
        </h2>
        <PlatformKpiCard label="Total Parties" value={data.totalParties} />
        <PlatformKpiCard label="Individuals" value={data.individuals} />
        <PlatformKpiCard label="Organizations" value={data.organizations} />
        <PlatformKpiCard label="Active Parties" value={data.activeParties} />
      </section>

      <section aria-labelledby="party-roles-heading" className="space-y-3">
        <h2
          id="party-roles-heading"
          className="text-lg font-semibold tracking-tight"
        >
          Roles
        </h2>
        {data.roleCounts.length === 0 ? (
          <PlatformEmptyState
            title="No Roles Yet"
            description="Assign Customer, Supplier, Farmer, and other roles from a Party Workspace to populate this widget."
            actionLabel="View Parties"
            actionHref="/parties"
          />
        ) : (
          <Card>
            <CardContent className="grid gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.roleCounts.map((role) => (
                <div
                  key={role.roleTypeCode}
                  className="flex items-center justify-between gap-3 border-b border-border/50 pb-2 last:border-0 last:pb-0 sm:border-0 sm:pb-0"
                >
                  <span className="text-sm text-muted-foreground">
                    {role.roleTypeName}
                  </span>
                  <span className="text-lg font-semibold tracking-tight">
                    {role.count}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      <section aria-labelledby="recent-parties-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="recent-parties-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Recently Registered
          </h2>
          <Link
            href="/parties/new"
            prefetch={false}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Register Party
          </Link>
        </div>

        {data.recentlyRegistered.length === 0 ? (
          <PlatformEmptyState
            title="No Parties Yet"
            description="Create an Individual or Organization to populate the master Party repository."
            actionLabel="Create Individual"
            actionHref="/parties/new?type=INDIVIDUAL"
          />
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Party ID</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">
                    Type
                  </th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">
                    Status
                  </th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">
                    Registered
                  </th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.recentlyRegistered.map((party) => (
                  <tr
                    key={party.id}
                    className="border-t transition-colors hover:bg-muted/20"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/parties/${party.id}`}
                        prefetch={false}
                        className="font-medium text-emerald-800 hover:underline"
                      >
                        {party.partyNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{party.displayName}</td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      {party.partyTypeName}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      {party.statusName}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      {formatDate(party.registrationDate)}
                    </td>
                    <td className="px-4 py-3">
                      {party.partyTypeCode === PARTY_TYPE_CODES.ORGANIZATION ? (
                        <Link
                          href={`/parties/${party.id}?tab=organization-structure&add=1`}
                          prefetch={false}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "gap-1"
                          )}
                        >
                          <NetworkIcon className="size-3.5" aria-hidden />
                          Add Unit
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
