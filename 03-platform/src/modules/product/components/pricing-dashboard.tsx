/**
 * Purpose:
 * Offering Pricing Dashboard — KPIs, search, catalogues, and quick actions.
 *
 * Implementation Package:
 * BP-003 / IP-011 – Offering Pricing & Pricing Rules
 */

"use client";

import { PlusIcon, SearchIcon, TagsIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import {
  PlatformEmptyState,
  PlatformKpiCard,
  PlatformSearchState,
} from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { searchPricingItemsAction } from "@/modules/product/actions/pricing-actions";
import { useProductUiLabels } from "@/modules/product/product-terminology-labels";
import type { PricingDashboardView, PricingItemView } from "@/modules/product/types";

type PricingDashboardProps = {
  data: PricingDashboardView;
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

export function PricingDashboard({ data }: PricingDashboardProps) {
  const labels = useProductUiLabels();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PricingItemView[] | null>(null);
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
            : searchResults
              ? "success"
              : "idle";

  function runSearch(query: string) {
    startTransition(async () => {
      setSearchError(null);
      const result = await searchPricingItemsAction({
        query: query.trim().length >= 2 ? query : undefined,
      });
      if (!result.success) {
        setSearchResults(null);
        setSearchError(result.error.message);
        return;
      }
      setSearchResults(result.data);
    });
  }

  const displayItems = searchResults ?? data.recentlyUpdated;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/products" label={labels.pricing.backLabel} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
                <TagsIcon className="size-5" aria-hidden />
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {labels.pricing.dashboardTitle}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {labels.pricing.dashboardDescription}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard label={labels.pricing.metricsActive} value={data.activePrices} />
        <PlatformKpiCard label={labels.pricing.metricsFuture} value={data.futurePrices} />
        <PlatformKpiCard label={labels.pricing.metricsExpired} value={data.expiredPrices} />
        <PlatformKpiCard
          label={labels.pricing.metricsCatalogues}
          value={data.catalogueCount}
        />
      </section>

      <section aria-labelledby="pricing-quick-actions" className="space-y-3">
        <h2 id="pricing-quick-actions" className="text-lg font-semibold tracking-tight">
          {labels.pricing.quickActionsHeading}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/products"
            prefetch={false}
            className={cn(buttonVariants({ variant: "default" }), "gap-2")}
          >
            <PlusIcon className="size-4" aria-hidden />
            {labels.pricing.quickActionAddPrice}
          </Link>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{labels.pricing.searchHeading}</CardTitle>
          <CardDescription>{labels.pricing.searchDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              runSearch(searchQuery);
            }}
          >
            <div className="relative flex-1">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={labels.pricing.searchPlaceholder}
                className="pl-9"
              />
            </div>
            <button type="submit" className={cn(buttonVariants({ variant: "outline" }))}>
              {labels.pricing.searchButton}
            </button>
          </form>

          <PlatformSearchState
            status={searchStatus}
            emptyTitle={labels.pricing.searchEmptyTitle}
            emptyHints={[...labels.pricing.searchEmptyHints]}
            errorMessage={searchError ?? undefined}
            onRetry={() => runSearch(searchQuery)}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-2 py-2">{labels.pricing.offering}</th>
                    <th className="px-2 py-2">{labels.pricing.catalogue}</th>
                    <th className="px-2 py-2">{labels.pricing.unitPrice}</th>
                    <th className="px-2 py-2">{labels.pricing.status}</th>
                    <th className="px-2 py-2">{labels.pricing.updated}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-2 py-3">
                        <Link
                          href={`/products/${item.offeringId}?tab=pricing`}
                          className="font-medium text-primary hover:underline"
                        >
                          {item.offeringName}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {item.offeringCode}
                        </div>
                      </td>
                      <td className="px-2 py-3">{item.catalogueName}</td>
                      <td className="px-2 py-3">
                        {Number(item.unitPrice).toLocaleString()} {item.currencyCode}
                      </td>
                      <td className="px-2 py-3">{item.statusLabel}</td>
                      <td className="px-2 py-3">{formatDate(item.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PlatformSearchState>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{labels.pricing.sectionCatalogues}</CardTitle>
          <CardDescription>
            {labels.pricing.cataloguesSummary(data.activeCatalogues, data.catalogueCount)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.catalogues.length === 0 ? (
            <PlatformEmptyState
              title={labels.pricing.noCataloguesTitle}
              description={labels.pricing.noCataloguesDescription}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.catalogues.map((catalogue) => (
                <div
                  key={catalogue.id}
                  className="rounded-lg border p-4"
                >
                  <div className="font-medium">{catalogue.name}</div>
                  <div className="text-xs text-muted-foreground">{catalogue.code}</div>
                  <div className="mt-2 text-sm">
                    {catalogue.currencyCode} · {catalogue.statusLabel}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
