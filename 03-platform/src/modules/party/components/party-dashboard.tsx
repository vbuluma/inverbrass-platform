/**
 * Purpose:
 * Party Dashboard — KPIs, recent registrations, and quick actions.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

"use client";

import {
  ArrowLeftIcon,
  Building2Icon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
        <Link
          href="/dashboard"
          prefetch={false}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "w-fit gap-2 px-0"
          )}
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          Back to dashboard
        </Link>
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
              New Individual
            </Link>
            <Link
              href="/parties/new?type=ORGANIZATION"
              prefetch={false}
              className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
            >
              <Building2Icon className="size-4" aria-hidden />
              New Organization
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
        <KpiCard label="Total Parties" value={data.totalParties} />
        <KpiCard label="Individuals" value={data.individuals} />
        <KpiCard label="Organizations" value={data.organizations} />
        <KpiCard label="Active Parties" value={data.activeParties} />
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">No parties yet</CardTitle>
              <CardDescription>
                Register an Individual or Organization to populate the master
                Party repository.
              </CardDescription>
            </CardHeader>
          </Card>
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

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="gap-2 py-4">
      <CardHeader className="px-4 pb-0">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
