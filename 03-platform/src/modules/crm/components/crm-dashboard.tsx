/**
 * Purpose:
 * Customer Profile list — KPIs, status breakdown, search, and open a profile.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

"use client";

import { HandshakeIcon, PlusIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState } from "@/components/platform/platform-empty-state";
import { PlatformKpiCard } from "@/components/platform/platform-kpi-card";
import { PlatformSearchState } from "@/components/platform/platform-search-state";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { searchCrmRecordsAction } from "@/modules/crm/actions/crm-actions";
import { useCrmDashboardLabels } from "@/modules/crm/crm-terminology-labels";
import type {
  CrmDashboardView,
  CrmSummaryView,
} from "@/modules/crm/types";

type CrmDashboardProps = {
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

export function CrmDashboard({ data }: CrmDashboardProps) {
  const labels = useCrmDashboardLabels();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CrmSummaryView[] | null>(
    null
  );
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const searchStatus =
    searchQuery.trim().length < 2
      ? "idle"
      : isPending
        ? "searching"
        : searchError
          ? "error"
          : searchResults && searchResults.length === 0
            ? "empty"
            : searchResults && searchResults.length > 0
              ? "success"
              : "idle";

  function runSearch(query: string) {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults(null);
      setSearchError(null);
      return;
    }

    startTransition(async () => {
      setSearchError(null);
      const result = await searchCrmRecordsAction(trimmed);
      if (!result.success) {
        setSearchResults(null);
        setSearchError(result.error.message);
        return;
      }
      setSearchResults(result.data);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/crm" label="Back to CRM" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
                <HandshakeIcon className="size-5" aria-hidden />
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {labels.pageTitle}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Search and open a profile. Customer 360 is the first tab on
                  the profile.
                </p>
              </div>
            </div>
          </div>
          <Link href="/customers/new" className={buttonVariants()}>
            <PlusIcon className="size-4" aria-hidden />
            {labels.registerCustomer}
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <PlatformKpiCard label={labels.totalCustomers} value={data.totalCustomers} />
        <PlatformKpiCard label="Prospects" value={data.prospectCount} />
        <PlatformKpiCard label="Leads" value={data.leadCount} />
        <PlatformKpiCard label="Active" value={data.activeCount} />
        <PlatformKpiCard label="Dormant" value={data.dormantCount} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search customers</CardTitle>
          <CardDescription>
            Search by customer number, party name, or party number.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-xl">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={searchQuery}
              onChange={(event) => {
                const value = event.target.value;
                setSearchQuery(value);
                runSearch(value);
              }}
              placeholder={labels.searchPlaceholder}
              className="pl-9"
            />
          </div>
          <PlatformSearchState
            status={searchStatus}
            emptyTitle="No customers matched your search."
            errorMessage={searchError ?? undefined}
            onRetry={() => runSearch(searchQuery)}
          >
            {searchResults?.map((item) => (
              <Link
                key={item.crmId}
                href={`/customers/${item.crmId}`}
                className="block rounded-lg border p-3 transition hover:bg-muted/40"
              >
                <div className="font-medium">{item.displayName}</div>
                <div className="text-sm text-muted-foreground">
                  {item.customerNumber} · {item.statusName} · {item.crmTypeName}
                </div>
              </Link>
            ))}
          </PlatformSearchState>
        </CardContent>
      </Card>

      {data.totalCustomers === 0 ? (
        <PlatformEmptyState
          title={labels.emptyTitle}
          description={labels.emptyDescription}
          actionLabel={labels.registerCustomer}
          actionHref="/customers/new"
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recently updated</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.recentlyUpdated.map((item) => (
                <Link
                  key={item.crmId}
                  href={`/customers/${item.crmId}`}
                  className="block rounded-lg border p-3 transition hover:bg-muted/40"
                >
                  <div className="font-medium">{item.displayName}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.customerNumber} · Updated {formatDate(item.updatedAt)}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>By status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.statusSummary.map((item) => (
                <div
                  key={item.statusCode}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span>{item.statusName}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
