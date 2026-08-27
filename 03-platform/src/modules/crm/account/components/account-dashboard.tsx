/**
 * Purpose:
 * Accounts Dashboard.
 *
 * Implementation Package:
 * BP-004 / IP-04 – Customer & Contact Management
 */

"use client";

import { Building2Icon, PlusIcon, SearchIcon } from "lucide-react";
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
import { searchAccountsAction } from "@/modules/crm/account/actions/account-actions";
import type {
  AccountDashboardView,
  AccountSummaryView,
} from "@/modules/crm/account/types";

type AccountDashboardProps = {
  data: AccountDashboardView;
};

export function AccountDashboard({ data }: AccountDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AccountSummaryView[] | null>(
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
      const result = await searchAccountsAction(trimmed);
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
            <span className="flex size-11 items-center justify-center rounded-lg bg-teal-50 text-teal-800 ring-1 ring-teal-200">
              <Building2Icon className="size-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
              <p className="text-sm text-muted-foreground">
                Organisational selling context with contact roles from BP-002.
              </p>
            </div>
          </div>
          <Link href="/accounts/new" className={buttonVariants()}>
            <PlusIcon className="size-4" />
            New account
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard label="Total accounts" value={data.totalAccounts} />
        <PlatformKpiCard label="Active" value={data.activeCount} />
        <PlatformKpiCard label="Prospect" value={data.prospectCount} />
        <PlatformKpiCard label="Inactive" value={data.inactiveCount} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search accounts</CardTitle>
          <CardDescription>Search by name, number, or linked party.</CardDescription>
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
              placeholder="Search accounts..."
              className="pl-9"
            />
          </div>
          <PlatformSearchState
            status={searchStatus}
            emptyTitle="No accounts matched your search"
            errorMessage={searchError ?? undefined}
          />
          {searchResults && searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((item) => (
                <Link
                  key={item.accountId}
                  href={`/accounts/${item.accountId}`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/40"
                >
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-muted-foreground">
                      {item.accountNumber} · {item.statusName}
                    </div>
                  </div>
                  <span className="text-muted-foreground">{item.accountTypeName}</span>
                </Link>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.typeSummary.length === 0 ? (
              <PlatformEmptyState
                title="No accounts yet"
                description="Create an account to organise B2B relationships."
              />
            ) : (
              data.typeSummary.map((item) => (
                <div
                  key={item.typeCode}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span>{item.typeName}</span>
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
                title="No recent accounts"
                description="Recently updated accounts will appear here."
              />
            ) : (
              data.recentlyUpdated.map((item) => (
                <Link
                  key={item.accountId}
                  href={`/accounts/${item.accountId}`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/40"
                >
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-muted-foreground">{item.accountNumber}</div>
                  </div>
                  <span className="text-muted-foreground">{item.statusName}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
