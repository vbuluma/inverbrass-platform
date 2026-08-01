/**
 * Purpose:
 * Product Variants Dashboard — KPIs, search, and quick actions.
 *
 * Implementation Package:
 * BP-003 / IP-005 – Product Variants Engine
 */

"use client";

import { BoxesIcon, PlusIcon, SearchIcon } from "lucide-react";
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
import { searchVariantsAction } from "@/modules/product/actions/variant-actions";
import type { ProductVariantView, VariantDashboardView } from "@/modules/product/types";
import { VARIANT_UI_LABELS } from "@/modules/product/variant-ui-labels";

type VariantDashboardProps = {
  data: VariantDashboardView;
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

export function VariantDashboard({ data }: VariantDashboardProps) {
  const variantLabel = data.variantLabel;
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductVariantView[] | null>(
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
      const result = await searchVariantsAction({
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

  const displayVariants = searchResults ?? data.variants;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/products" label="Back to products" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-lg bg-amber-50 text-amber-900 ring-1 ring-amber-200">
              <BoxesIcon className="size-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {variantLabel}
              </h1>
              <p className="text-sm text-muted-foreground">
                {VARIANT_UI_LABELS.dashboardDescription}
              </p>
            </div>
          </div>
          <Link
            href="/products/variants/new"
            prefetch={false}
            className={cn(buttonVariants({ variant: "default" }), "gap-2")}
          >
            <PlusIcon className="size-4" aria-hidden />
            {VARIANT_UI_LABELS.quickActionRegister}
          </Link>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <PlatformKpiCard
          label={VARIANT_UI_LABELS.metricsTotal}
          value={data.totalVariants}
        />
        <PlatformKpiCard
          label={VARIANT_UI_LABELS.metricsActive}
          value={data.activeVariants}
        />
        <PlatformKpiCard
          label={VARIANT_UI_LABELS.metricsDraft}
          value={data.draftVariants}
        />
        <PlatformKpiCard
          label={VARIANT_UI_LABELS.metricsArchived}
          value={data.archivedVariants}
        />
        <PlatformKpiCard
          label={VARIANT_UI_LABELS.metricsParentOfferings}
          value={data.parentOfferingCount}
        />
      </section>

      <section aria-labelledby="variant-search-heading" className="space-y-3">
        <h2 id="variant-search-heading" className="text-lg font-semibold tracking-tight">
          Search {variantLabel}
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
            placeholder="Search by code, name, or parent offering…"
            className="pl-9"
            aria-label={`Search ${variantLabel.toLowerCase()}`}
          />
        </div>

        <PlatformSearchState
          status={searchStatus}
          errorMessage={searchError ?? undefined}
          onRetry={() => runSearch(searchQuery)}
          emptyTitle={`No ${variantLabel.toLowerCase()} found`}
          emptyHints={[
            "Try a different code or parent offering",
            VARIANT_UI_LABELS.quickActionRegister,
          ]}
          createLabel={VARIANT_UI_LABELS.quickActionRegister}
          onCreate={() => {
            window.location.assign("/products/variants/new");
          }}
        >
          {displayVariants.length > 0 ? (
            <Card>
              <CardContent className="divide-y px-0 py-0">
                {displayVariants.map((variant) => (
                  <Link
                    key={variant.id}
                    href={`/products/variants/${variant.id}`}
                    prefetch={false}
                    className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{variant.variantName}</p>
                      <p className="text-sm text-muted-foreground">
                        {variant.variantCode} · {variant.productName} (
                        {variant.productCode})
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {variant.statusLabel} · {formatDate(variant.updatedAt)}
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </PlatformSearchState>
      </section>

      <section aria-labelledby="recent-variants-heading" className="space-y-3">
        <h2
          id="recent-variants-heading"
          className="text-lg font-semibold tracking-tight"
        >
          Recently Updated
        </h2>
        {data.recentlyUpdated.length === 0 ? (
          <PlatformEmptyState
            title={`No ${variantLabel.toLowerCase()} yet`}
            description={`Register a ${variantLabel.toLowerCase().slice(0, -1) || "variant"} from a parent offering.`}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{VARIANT_UI_LABELS.metricsRecent}</CardTitle>
              <CardDescription>
                Latest updates across all parent {data.catalogueLabel.toLowerCase()}.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y px-0 py-0">
              {data.recentlyUpdated.map((variant) => (
                <Link
                  key={variant.id}
                  href={`/products/variants/${variant.id}`}
                  prefetch={false}
                  className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{variant.variantName}</p>
                    <p className="text-sm text-muted-foreground">
                      {variant.productName}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(variant.updatedAt)}
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
