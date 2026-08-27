/**
 * Purpose:
 * Units of Measure Dashboard — KPIs, search, categories, and quick actions.
 *
 * Implementation Package:
 * BP-003 / IP-003 – Units of Measure Engine
 */

"use client";

import { PlusIcon, RulerIcon, SearchIcon } from "lucide-react";
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
import { searchUnitsAction } from "@/modules/product/actions/unit-actions";
import type { UnitDashboardView, UnitView } from "@/modules/product/types";
import { useProductUiLabels } from "@/modules/product/product-terminology-labels";

type UnitDashboardProps = {
  data: UnitDashboardView;
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

export function UnitDashboard({ data }: UnitDashboardProps) {
  const labels = useProductUiLabels();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UnitView[] | null>(null);
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
      const result = await searchUnitsAction({
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

  const displayUnits = searchResults ?? data.units;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/products" label={labels.unit.backLabel} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-lg bg-sky-50 text-sky-800 ring-1 ring-sky-200">
                <RulerIcon className="size-5" aria-hidden />
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {labels.unit.dashboardTitle}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {labels.unit.dashboardDescription}
                </p>
              </div>
            </div>
          </div>
          <Link
            href="/products/units/new"
            prefetch={false}
            className={cn(buttonVariants({ variant: "default" }), "gap-2")}
          >
            <PlusIcon className="size-4" aria-hidden />
            {labels.unit.quickActionRegister}
          </Link>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard label={labels.unit.metricsTotal} value={data.totalUnits} />
        <PlatformKpiCard label={labels.unit.metricsActive} value={data.activeUnits} />
        <PlatformKpiCard
          label={labels.unit.metricsCategories}
          value={data.categoryCount}
        />
        <PlatformKpiCard
          label={labels.unit.metricsRecent}
          value={data.recentlyUpdated.length}
        />
      </section>

      <section aria-labelledby="unit-quick-actions" className="space-y-3">
        <h2 id="unit-quick-actions" className="text-lg font-semibold tracking-tight">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/products/units/new"
            prefetch={false}
            className={cn(buttonVariants({ variant: "default" }), "gap-2")}
          >
            <PlusIcon className="size-4" aria-hidden />
            {labels.unit.quickActionRegister}
          </Link>
          <Link
            href="/products/classifications"
            prefetch={false}
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            {labels.unit.quickActionCategories}
          </Link>
        </div>
      </section>

      <section aria-labelledby="unit-search-heading" className="space-y-3">
        <h2 id="unit-search-heading" className="text-lg font-semibold tracking-tight">
          Search Units
        </h2>
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
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
            placeholder="Search by code, name, symbol, or category…"
            className="pl-9"
            aria-label="Search units"
          />
        </div>

        <PlatformSearchState
          status={searchStatus}
          errorMessage={searchError ?? undefined}
          onRetry={() => runSearch(searchQuery)}
          emptyTitle="No units found"
          emptyHints={[
            "Try a different code or symbol",
            "Register a new unit of measure",
          ]}
          createLabel={labels.unit.quickActionRegister}
          onCreate={() => {
            window.location.assign("/products/units/new");
          }}
        >
          {displayUnits.length > 0 ? (
            <Card>
              <CardContent className="divide-y px-0 py-0">
                {displayUnits.map((unit) => (
                  <Link
                    key={unit.id}
                    href={`/products/units/${unit.id}`}
                    prefetch={false}
                    className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {unit.name}{" "}
                        <span className="text-muted-foreground">({unit.symbol})</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {unit.code} · {unit.categoryName}
                        {unit.isBaseUnit ? " · Base unit" : ""}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {unit.statusLabel}
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </PlatformSearchState>
      </section>

      <section aria-labelledby="unit-categories-heading" className="space-y-3">
        <h2
          id="unit-categories-heading"
          className="text-lg font-semibold tracking-tight"
        >
          Categories
        </h2>
        {data.categories.length === 0 ? (
          <PlatformEmptyState
            title="No categories yet"
            description="Default categories are created automatically on first visit."
          />
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Unit categories</CardTitle>
              <CardDescription>
                Each category defines one base unit and related conversions.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y px-0 py-0">
              {data.categories.map((category) => (
                <div
                  key={category.id}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {category.code}
                      {category.baseUnitName
                        ? ` · Base: ${category.baseUnitName} (${category.baseUnitSymbol})`
                        : ""}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {category.unitCount} units
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      <section aria-labelledby="recent-units-heading" className="space-y-3">
        <h2
          id="recent-units-heading"
          className="text-lg font-semibold tracking-tight"
        >
          Recent Updates
        </h2>
        {data.recentlyUpdated.length === 0 ? (
          <PlatformEmptyState
            title="No units yet"
            description="Register units or rely on platform defaults seeded for your business."
            actionLabel={labels.unit.quickActionRegister}
            actionHref="/products/units/new"
          />
        ) : (
          <Card>
            <CardContent className="divide-y px-0 py-0">
              {data.recentlyUpdated.map((unit) => (
                <Link
                  key={unit.id}
                  href={`/products/units/${unit.id}`}
                  prefetch={false}
                  className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{unit.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {unit.code} · {unit.categoryName}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(unit.updatedAt)}
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
