/**
 * Purpose:
 * Digital Catalogue Dashboard.
 */

"use client";

import { GlobeIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import {
  PlatformEmptyState,
  PlatformKpiCard,
  PlatformSearchState,
} from "@/components/platform";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { searchCatalogueAction } from "@/modules/product/actions/product-catalogue-actions";
import { useProductUiLabels } from "@/modules/product/product-terminology-labels";
import type {
  CatalogueDashboardEntryView,
  CatalogueDashboardView,
} from "@/modules/product/types";

type CatalogueDashboardProps = {
  data: CatalogueDashboardView;
};

export function CatalogueDashboard({ data }: CatalogueDashboardProps) {
  const labels = useProductUiLabels();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CatalogueDashboardEntryView[] | null>(
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
            : searchResults
              ? "success"
              : "idle";

  function runSearch(query: string) {
    startTransition(async () => {
      setSearchError(null);
      const result = await searchCatalogueAction({
        query: query.trim().length >= 2 ? query : undefined,
        publishedOnly: true,
      });
      if (!result.success) {
        setSearchResults(null);
        setSearchError(result.error.message);
        return;
      }
      setSearchResults(result.data);
    });
  }

  const displayEntries = searchResults ?? data.entries;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/products" label={labels.catalogue.backLabel} />
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-sky-50 text-sky-900 ring-1 ring-sky-200">
            <GlobeIcon className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {data.catalogueLabel} {labels.catalogue.dashboardTitle.replace("Digital ", "")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {labels.catalogue.dashboardDescription}
            </p>
          </div>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <PlatformKpiCard label={labels.catalogue.metricsPublished} value={data.publishedProductCount} />
        <PlatformKpiCard label={labels.catalogue.metricsDraft} value={data.unpublishedActiveCount} />
        <PlatformKpiCard label={labels.catalogue.metricsScheduled} value={data.scheduledPublicationCount} />
        <PlatformKpiCard label={labels.catalogue.metricsFeatured} value={data.featuredCount} />
        <PlatformKpiCard label={labels.catalogue.metricsChannels} value={data.channelCount} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Search Published Offerings</h2>
        <div className="relative max-w-xl">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={searchQuery}
            onChange={(event) => {
              const next = event.target.value;
              setSearchQuery(next);
              if (next.trim().length >= 2) runSearch(next);
              else {
                setSearchResults(null);
                setSearchError(null);
              }
            }}
            placeholder="Search by code or name…"
            className="pl-9"
          />
        </div>
        <PlatformSearchState
          status={searchStatus}
          errorMessage={searchError ?? undefined}
          onRetry={() => runSearch(searchQuery)}
          emptyTitle="No published offerings found"
          emptyHints={["Publish an active product to a channel first"]}
        >
          {displayEntries.length > 0 ? (
            <Card>
              <CardContent className="divide-y px-0 py-0">
                {displayEntries.map((entry) => (
                  <Link
                    key={entry.productId}
                    href={`/products/catalogue/${entry.productId}`}
                    prefetch={false}
                    className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{entry.productName}</p>
                      <p className="text-sm text-muted-foreground">{entry.productCode}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {entry.publishedChannelCount} channels
                      {entry.featuredChannelCount > 0
                        ? ` · ${entry.featuredChannelCount} featured`
                        : ""}
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : (
            <PlatformEmptyState
              title="No catalogue entries yet"
              description="Open a product workspace and publish it to your first channel."
            />
          )}
        </PlatformSearchState>
      </section>
    </main>
  );
}
