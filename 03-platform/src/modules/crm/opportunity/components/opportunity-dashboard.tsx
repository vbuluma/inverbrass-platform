/**
 * Purpose:
 * Opportunities Dashboard — pipeline KPIs, forecast, and search.
 *
 * Implementation Package:
 * BP-004 / IP-03 – Opportunity Management
 */

"use client";

import { GitBranchIcon, PlusIcon, SearchIcon } from "lucide-react";
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
import { searchOpportunitiesAction } from "@/modules/crm/opportunity/actions/opportunity-actions";
import type {
  OpportunityDashboardView,
  OpportunitySummaryView,
} from "@/modules/crm/opportunity/types";

type OpportunityDashboardProps = {
  data: OpportunityDashboardView;
};

export function OpportunityDashboard({ data }: OpportunityDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<OpportunitySummaryView[] | null>(
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
      const result = await searchOpportunitiesAction(trimmed);
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
        <PageBackLink href="/dashboard" label="Back to dashboard" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-lg bg-violet-50 text-violet-800 ring-1 ring-violet-200">
              <GitBranchIcon className="size-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Opportunities</h1>
              <p className="text-sm text-muted-foreground">
                Pipeline tracking, forecasting, and win/loss analysis.
              </p>
            </div>
          </div>
          <Link href="/opportunities/new" className={buttonVariants()}>
            <PlusIcon className="size-4" />
            New opportunity
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard label="Open" value={data.totalOpen} />
        <PlatformKpiCard label="Won" value={data.totalWon} />
        <PlatformKpiCard label="Lost" value={data.totalLost} />
        <PlatformKpiCard label="Weighted forecast" value={data.weightedForecast} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search opportunities</CardTitle>
          <CardDescription>Search by name, number, or customer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                runSearch(event.target.value);
              }}
              placeholder="Search opportunities..."
              className="pl-9"
            />
          </div>
          <PlatformSearchState
            status={searchStatus}
            emptyTitle="No opportunities matched your search"
            errorMessage={searchError ?? undefined}
          />
          {searchResults && searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((item) => (
                <Link
                  key={item.opportunityId}
                  href={`/opportunities/${item.opportunityId}`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/40"
                >
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-muted-foreground">
                      {item.opportunityNumber} · {item.stageName}
                    </div>
                  </div>
                  <span className="text-muted-foreground">{item.displayName}</span>
                </Link>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Open pipeline by stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.stageSummary.length === 0 ? (
              <PlatformEmptyState
                title="No open opportunities"
                description="Create an opportunity to populate the pipeline."
              />
            ) : (
              data.stageSummary.map((item) => (
                <div
                  key={item.stageCode}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span>{item.stageName}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recently updated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentlyUpdated.length === 0 ? (
              <PlatformEmptyState
                title="No recent opportunities"
                description="Recently updated deals will appear here."
              />
            ) : (
              data.recentlyUpdated.map((item) => (
                <Link
                  key={item.opportunityId}
                  href={`/opportunities/${item.opportunityId}`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/40"
                >
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-muted-foreground">{item.opportunityNumber}</div>
                  </div>
                  <span className="text-muted-foreground">{item.stageName}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
