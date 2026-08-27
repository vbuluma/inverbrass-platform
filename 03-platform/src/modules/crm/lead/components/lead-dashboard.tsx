/**
 * Purpose:
 * Leads Dashboard — pipeline KPIs, status breakdown, search, and quick actions.
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
 */

"use client";

import { PlusIcon, SearchIcon, TargetIcon } from "lucide-react";
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
import { searchLeadsAction } from "@/modules/crm/lead/actions/lead-actions";
import type { LeadDashboardView, LeadSummaryView } from "@/modules/crm/lead/types";

type LeadDashboardProps = {
  data: LeadDashboardView;
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

export function LeadDashboard({ data }: LeadDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LeadSummaryView[] | null>(
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
      const result = await searchLeadsAction(trimmed);
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
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-lg bg-sky-50 text-sky-800 ring-1 ring-sky-200">
                <TargetIcon className="size-5" aria-hidden />
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
                <p className="text-sm text-muted-foreground">
                  Capture, qualify, and convert sales leads.
                </p>
              </div>
            </div>
          </div>
          <Link href="/leads/new" className={buttonVariants()}>
            <PlusIcon className="size-4" />
            New lead
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard label="Total leads" value={data.totalLeads} />
        <PlatformKpiCard label="New" value={data.newCount} />
        <PlatformKpiCard label="Qualified" value={data.qualifiedCount} />
        <PlatformKpiCard label="Converted" value={data.convertedCount} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search leads</CardTitle>
          <CardDescription>
            Search by lead number, party name, email, or phone.
          </CardDescription>
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
              placeholder="Search leads..."
              className="pl-9"
            />
          </div>
          <PlatformSearchState
            status={searchStatus}
            emptyTitle="No leads matched your search"
            errorMessage={searchError ?? undefined}
          />
          {searchResults && searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((lead) => (
                <Link
                  key={lead.leadId}
                  href={`/leads/${lead.leadId}`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/40"
                >
                  <div>
                    <div className="font-medium">{lead.displayName}</div>
                    <div className="text-muted-foreground">
                      {lead.leadNumber} · {lead.statusName}
                    </div>
                  </div>
                  <span className="text-muted-foreground">{lead.sourceName}</span>
                </Link>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline by status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.statusSummary.length === 0 ? (
              <PlatformEmptyState
                title="No leads yet"
                description="Create your first lead to populate the pipeline."
              />
            ) : (
              data.statusSummary.map((item) => (
                <div
                  key={item.statusCode}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span>{item.statusName}</span>
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
                title="No recent leads"
                description="Recently updated leads will appear here."
              />
            ) : (
              data.recentlyUpdated.map((lead) => (
                <Link
                  key={lead.leadId}
                  href={`/leads/${lead.leadId}`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/40"
                >
                  <div>
                    <div className="font-medium">{lead.displayName}</div>
                    <div className="text-muted-foreground">{lead.leadNumber}</div>
                  </div>
                  <span className="text-muted-foreground">
                    {formatDate(lead.updatedAt)}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
