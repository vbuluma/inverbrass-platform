/**
 * Purpose:
 * Product Attributes Dashboard — KPIs, search, groups, and definitions.
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

"use client";

import { LayersIcon, PlusIcon, SearchIcon, TagsIcon } from "lucide-react";
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
import { searchAttributesAction } from "@/modules/product/actions/attribute-actions";
import { useProductUiLabels } from "@/modules/product/product-terminology-labels";
import type {
  AttributeDashboardView,
  AttributeDefinitionView,
} from "@/modules/product/types";

type AttributeDashboardProps = {
  data: AttributeDashboardView;
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

export function AttributeDashboard({ data }: AttributeDashboardProps) {
  const labels = useProductUiLabels();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    AttributeDefinitionView[] | null
  >(null);
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
      const result = await searchAttributesAction({
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

  const displayDefinitions = searchResults ?? data.definitions;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/products" label={labels.attribute.backLabel} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-lg bg-violet-50 text-violet-800 ring-1 ring-violet-200">
              <TagsIcon className="size-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {labels.attribute.dashboardTitle}
              </h1>
              <p className="text-sm text-muted-foreground">
                {labels.attribute.dashboardDescription}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/products/attributes/groups/new"
              prefetch={false}
              className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
            >
              <LayersIcon className="size-4" aria-hidden />
              {labels.attribute.quickActionGroup}
            </Link>
            <Link
              href="/products/attributes/definitions/new"
              prefetch={false}
              className={cn(buttonVariants({ variant: "default" }), "gap-2")}
            >
              <PlusIcon className="size-4" aria-hidden />
              {labels.attribute.quickActionDefinition}
            </Link>
          </div>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard
          label={labels.attribute.metricsTotalGroups}
          value={data.totalGroups}
        />
        <PlatformKpiCard
          label={labels.attribute.metricsTotalAttributes}
          value={data.totalAttributes}
        />
        <PlatformKpiCard
          label={labels.attribute.metricsActive}
          value={data.activeAttributes}
        />
        <PlatformKpiCard
          label={labels.attribute.metricsArchived}
          value={data.archivedAttributes}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Search Attributes</h2>
        <div className="relative max-w-xl">
          <SearchIcon
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Search by name or code…"
            className="pl-9"
            value={searchQuery}
            onChange={(event) => {
              const query = event.target.value;
              setSearchQuery(query);
              if (query.trim().length >= 2) {
                runSearch(query);
              } else {
                setSearchResults(null);
                setSearchError(null);
              }
            }}
          />
        </div>
        <PlatformSearchState
          status={searchStatus}
          emptyTitle="No attributes match your search."
          errorMessage={searchError ?? undefined}
          onRetry={() => runSearch(searchQuery)}
        >
          <div className="space-y-2">
            {displayDefinitions.map((definition) => (
              <Link
                key={definition.id}
                href={`/products/attributes/definitions/${definition.id}`}
                prefetch={false}
                className="block rounded-lg border p-4 transition hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{definition.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {definition.code} · {definition.groupName} ·{" "}
                      {definition.dataTypeLabel}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {definition.statusLabel}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </PlatformSearchState>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attribute Groups</CardTitle>
            <CardDescription>Reusable groupings for related fields.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.groups.length === 0 ? (
              <PlatformEmptyState
                title="No attribute groups yet"
                description="Create a group to organize attribute definitions."
                actionHref="/products/attributes/groups/new"
                actionLabel={labels.attribute.quickActionGroup}
              />
            ) : (
              data.groups.map((group) => (
                <Link
                  key={group.id}
                  href={`/products/attributes/groups/${group.id}`}
                  prefetch={false}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/40"
                >
                  <span>
                    {group.name}{" "}
                    <span className="text-muted-foreground">({group.code})</span>
                  </span>
                  <span className="text-muted-foreground">
                    {group.definitionCount} defs
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recently Updated</CardTitle>
            <CardDescription>Latest attribute definition changes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentlyUpdated.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent updates.</p>
            ) : (
              data.recentlyUpdated.map((definition) => (
                <Link
                  key={definition.id}
                  href={`/products/attributes/definitions/${definition.id}`}
                  prefetch={false}
                  className="block rounded-md border px-3 py-2 text-sm hover:bg-muted/40"
                >
                  <p className="font-medium">{definition.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDate(definition.updatedAt)}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
