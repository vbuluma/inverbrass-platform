/**
 * Purpose:
 * Product/Offering Dashboard — KPIs, type breakdown, search, and quick actions.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

"use client";

import {
  ArchiveIcon,
  FilePlusIcon,
  FolderTreeIcon,
  PackageIcon,
  PlusIcon,
  RulerIcon,
  SearchIcon,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { searchProductsAction } from "@/modules/product/actions/product-actions";
import type {
  ProductDashboardView,
  ProductSummaryView,
} from "@/modules/product/types";

type ProductDashboardProps = {
  data: ProductDashboardView;
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

export function ProductDashboard({ data }: ProductDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductSummaryView[] | null>(
    null
  );
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pageTitle = `${data.catalogueLabel} Catalogue`;

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
      const result = await searchProductsAction(trimmed);
      if (!result.success) {
        setSearchResults(null);
        setSearchError(result.error.message);
        return;
      }
      setSearchResults(result.data);
    });
  }

  const topTypes = [...data.typeSummary]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/dashboard" label="Back to dashboard" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-lg bg-sky-50 text-sky-800 ring-1 ring-sky-200">
                <PackageIcon className="size-5" aria-hidden />
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {pageTitle}
                </h1>
                {data.industryName ? (
                  <p className="text-xs text-muted-foreground">
                    {data.industryName} edition
                  </p>
                ) : null}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Enterprise offering master — products, services, subscriptions, and
              more from one shared engine.
            </p>
          </div>
          <Link
            href="/products/new"
            prefetch={false}
            className={cn(buttonVariants({ variant: "default" }), "gap-2")}
          >
            <PlusIcon className="size-4" aria-hidden />
            Create {data.catalogueLabel.replace(/s$/, "")}
          </Link>
        </div>
      </div>

      <section aria-labelledby="product-kpis-heading" className="space-y-3">
        <h2 id="product-kpis-heading" className="text-lg font-semibold tracking-tight">
          Products
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <PlatformKpiCard label="Total Products" value={data.totalProducts} />
          <PlatformKpiCard label="Active" value={data.activeProducts} />
          <PlatformKpiCard label="Draft" value={data.draftProducts} />
          <PlatformKpiCard label="Archived" value={data.archivedProducts} />
          <PlatformKpiCard
            label="Discontinued"
            value={data.discontinuedProducts}
          />
        </div>
        {data.suspendedProducts > 0 ? (
          <p className="text-sm text-muted-foreground">
            {data.suspendedProducts} suspended — temporarily unavailable.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="product-types-heading" className="space-y-3">
        <h2
          id="product-types-heading"
          className="text-lg font-semibold tracking-tight"
        >
          By Product Type
        </h2>
        {topTypes.length === 0 ? (
          <PlatformEmptyState
            title="No Types Yet"
            description="Register offerings to populate type breakdown."
            actionLabel={`Create ${data.catalogueLabel.replace(/s$/, "")}`}
            actionHref="/products/new"
          />
        ) : (
          <Card>
            <CardContent className="grid gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
              {topTypes.map((type) => (
                <div
                  key={type.typeCode}
                  className="flex items-center justify-between gap-3 border-b border-border/50 pb-2 last:border-0 last:pb-0 sm:border-0 sm:pb-0"
                >
                  <span className="text-sm text-muted-foreground">
                    {type.typeName}
                  </span>
                  <span className="text-lg font-semibold tracking-tight">
                    {type.count}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      <section aria-labelledby="quick-actions-heading" className="space-y-3">
        <h2
          id="quick-actions-heading"
          className="text-lg font-semibold tracking-tight"
        >
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/products/new"
            prefetch={false}
            className={cn(buttonVariants({ variant: "default" }), "gap-2")}
          >
            <FilePlusIcon className="size-4" aria-hidden />
            Register Offering
          </Link>
          <Link
            href="/products/classifications"
            prefetch={false}
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <FolderTreeIcon className="size-4" aria-hidden />
            Classifications
          </Link>
          <Link
            href="/products/units"
            prefetch={false}
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <RulerIcon className="size-4" aria-hidden />
            Units of Measure
          </Link>
          <Link
            href="/products/new"
            prefetch={false}
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <ArchiveIcon className="size-4" aria-hidden />
            Import / Migrate
          </Link>
        </div>
      </section>

      <section aria-labelledby="product-search-heading" className="space-y-3">
        <h2
          id="product-search-heading"
          className="text-lg font-semibold tracking-tight"
        >
          Search
        </h2>
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
            placeholder="Search by code, name, or legacy code…"
            className="pl-9"
            aria-label="Search products"
          />
        </div>

        <PlatformSearchState
          status={searchStatus}
          errorMessage={searchError ?? undefined}
          onRetry={() => runSearch(searchQuery)}
          emptyTitle="No results found"
          emptyHints={[
            "Try a different code or name",
            "Search legacy codes for migrated records",
            "Register a new offering",
          ]}
          createLabel="Create Offering"
          onCreate={() => {
            window.location.assign("/products/new");
          }}
        >
          {searchResults && searchResults.length > 0 ? (
            <Card>
              <CardContent className="divide-y px-0 py-0">
                {searchResults.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    prefetch={false}
                    className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{product.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.productCode} · {product.productTypeName}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {product.statusName}
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </PlatformSearchState>
      </section>

      <section aria-labelledby="recent-products-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="recent-products-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Recently Updated
          </h2>
        </div>

        {data.recentlyUpdated.length === 0 ? (
          <PlatformEmptyState
            title="No Offerings Yet"
            description="Register your first offering to build the enterprise catalogue."
            actionLabel="Create Offering"
            actionHref="/products/new"
          />
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Latest Activity</CardTitle>
              <CardDescription>
                Sorted by last update — opens the offering workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y px-0 py-0">
              {data.recentlyUpdated.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  prefetch={false}
                  className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{product.productName}</p>
                    <p className="text-sm text-muted-foreground">
                      {product.productCode} · {product.productTypeName}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <span>{product.statusName}</span>
                    <span className="mx-2">·</span>
                    <time dateTime={product.updatedAt}>
                      {formatDate(product.updatedAt)}
                    </time>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}
