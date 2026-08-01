/**
 * Purpose:
 * Product Bundles Dashboard — KPIs, search, and quick actions.
 */

"use client";

import { LayersIcon, PlusIcon, SearchIcon } from "lucide-react";
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
import { searchBundlesAction } from "@/modules/product/actions/product-bundle-actions";
import { BUNDLE_UI_LABELS } from "@/modules/product/bundle-ui-labels";
import type { BundleDashboardView, ProductBundleView } from "@/modules/product/types";

type BundleDashboardProps = {
  data: BundleDashboardView;
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

export function BundleDashboard({ data }: BundleDashboardProps) {
  const bundleLabel = data.bundleLabel;
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductBundleView[] | null>(
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
      const result = await searchBundlesAction({
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

  const displayBundles = searchResults ?? data.bundles;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/products" label="Back to products" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200">
              <LayersIcon className="size-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{bundleLabel}</h1>
              <p className="text-sm text-muted-foreground">
                {BUNDLE_UI_LABELS.dashboardDescription}
              </p>
            </div>
          </div>
          <Link
            href="/products/bundles/new"
            prefetch={false}
            className={cn(buttonVariants({ variant: "default" }), "gap-2")}
          >
            <PlusIcon className="size-4" aria-hidden />
            {BUNDLE_UI_LABELS.quickActionRegister}
          </Link>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard label={BUNDLE_UI_LABELS.metricsTotal} value={data.totalBundles} />
        <PlatformKpiCard label={BUNDLE_UI_LABELS.metricsActive} value={data.activeBundles} />
        <PlatformKpiCard label={BUNDLE_UI_LABELS.metricsDraft} value={data.draftBundles} />
        <PlatformKpiCard
          label={BUNDLE_UI_LABELS.metricsArchived}
          value={data.archivedBundles}
        />
      </section>

      <section aria-labelledby="bundle-search-heading" className="space-y-3">
        <h2 id="bundle-search-heading" className="text-lg font-semibold tracking-tight">
          Search {bundleLabel}
        </h2>
        <div className="relative max-w-xl">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={searchQuery}
            onChange={(event) => {
              const next = event.target.value;
              setSearchQuery(next);
              if (next.trim().length >= 2) {
                runSearch(next);
              } else {
                setSearchResults(null);
                setSearchError(null);
              }
            }}
            placeholder="Search by code, name, or contained product…"
            className="pl-9"
            aria-label={`Search ${bundleLabel.toLowerCase()}`}
          />
        </div>

        <PlatformSearchState
          status={searchStatus}
          errorMessage={searchError ?? undefined}
          onRetry={() => runSearch(searchQuery)}
          emptyTitle={`No ${bundleLabel.toLowerCase()} found`}
          emptyHints={["Try a different code or name", BUNDLE_UI_LABELS.quickActionRegister]}
          createLabel={BUNDLE_UI_LABELS.quickActionRegister}
          onCreate={() => {
            window.location.assign("/products/bundles/new");
          }}
        >
          {displayBundles.length > 0 ? (
            <Card>
              <CardContent className="divide-y px-0 py-0">
                {displayBundles.map((bundle) => (
                  <Link
                    key={bundle.id}
                    href={`/products/bundles/${bundle.id}`}
                    prefetch={false}
                    className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{bundle.bundleName}</p>
                      <p className="text-sm text-muted-foreground">
                        {bundle.bundleCode} · {bundle.bundleTypeLabel} · {bundle.itemCount}{" "}
                        items
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {bundle.statusLabel} · {formatDate(bundle.updatedAt)}
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </PlatformSearchState>
      </section>

      <section aria-labelledby="recent-bundles-heading" className="space-y-3">
        <h2 id="recent-bundles-heading" className="text-lg font-semibold tracking-tight">
          Recently Updated
        </h2>
        {data.recentlyUpdated.length === 0 ? (
          <PlatformEmptyState
            title={`No ${bundleLabel.toLowerCase()} yet`}
            description="Create a bundle to compose multiple offerings into one commercial package."
            actionLabel={BUNDLE_UI_LABELS.quickActionRegister}
            actionHref="/products/bundles/new"
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{BUNDLE_UI_LABELS.metricsRecent}</CardTitle>
              <CardDescription>Latest bundle updates across your catalogue.</CardDescription>
            </CardHeader>
            <CardContent className="divide-y px-0 py-0">
              {data.recentlyUpdated.map((bundle) => (
                <Link
                  key={bundle.id}
                  href={`/products/bundles/${bundle.id}`}
                  prefetch={false}
                  className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{bundle.bundleName}</p>
                    <p className="text-sm text-muted-foreground">{bundle.bundleCode}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(bundle.updatedAt)}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}
