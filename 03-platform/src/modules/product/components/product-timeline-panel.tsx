/**
 * Purpose:
 * Product Workspace Timeline tab.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

"use client";

import { useMemo, useState, useTransition } from "react";

import { PlatformEmptyState } from "@/components/platform";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductTimelinePanelView } from "@/core/product-timeline";
import {
  listProductTimelineAction,
  loadMoreProductTimelineAction,
} from "@/modules/product/actions/product-timeline-actions";

type ProductTimelinePanelProps = {
  productId: string;
  initialData: ProductTimelinePanelView;
};

type TimelineFilters = {
  category: string;
  sourceModule: string;
  search: string;
  dateFrom: string;
  dateTo: string;
};

function formatDateTime(value: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function ProductTimelinePanel({
  productId,
  initialData,
}: ProductTimelinePanelProps) {
  const [data, setData] = useState(initialData);
  const [filters, setFilters] = useState<TimelineFilters>({
    category: "",
    sourceModule: "",
    search: "",
    dateFrom: "",
    dateTo: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeFilterCount = useMemo(
    () =>
      Object.values(filters).filter((value) => value.trim().length > 0).length,
    [filters]
  );

  function applyFilters(nextOffset = 0, append = false) {
    startTransition(async () => {
      setError(null);
      const action =
        nextOffset > 0 ? loadMoreProductTimelineAction : listProductTimelineAction;
      const result = await action(productId, {
        category: filters.category || undefined,
        sourceModule: filters.sourceModule || undefined,
        search: filters.search || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        offset: nextOffset,
        limit: data.pageSize,
      });

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      setData((current) =>
        append
          ? {
              ...result.data,
              events: [...current.events, ...result.data.events],
            }
          : result.data
      );
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Timeline</CardTitle>
        <CardDescription>
          Chronological activity history for this product.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1">
            <Label htmlFor="timeline-category">Category</Label>
            <select
              id="timeline-category"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={filters.category}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
            >
              <option value="">All</option>
              {data.filterOptions.categories.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="timeline-search">Search</Label>
            <Input
              id="timeline-search"
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="timeline-from">From</Label>
            <Input
              id="timeline-from"
              type="date"
              value={filters.dateFrom}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  dateFrom: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="timeline-to">To</Label>
            <Input
              id="timeline-to"
              type="date"
              value={filters.dateTo}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  dateTo: event.target.value,
                }))
              }
            />
          </div>
          <div className="flex items-end gap-2">
            <Button type="button" onClick={() => applyFilters()} disabled={isPending}>
              Apply
            </Button>
            {activeFilterCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setFilters({
                    category: "",
                    sourceModule: "",
                    search: "",
                    dateFrom: "",
                    dateTo: "",
                  });
                }}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {data.events.length === 0 ? (
          <PlatformEmptyState
            title="No Timeline Events"
            description="Product lifecycle and registration events will appear here."
          />
        ) : (
          <div className="space-y-3">
            {data.events.map((event) => (
              <article key={event.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <time className="text-sm text-muted-foreground">
                    {formatDateTime(event.eventDateTime)}
                  </time>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                    {event.eventCategoryLabel}
                  </span>
                </div>
                <h3 className="mt-2 font-semibold">{event.summary}</h3>
                {event.description ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {event.description}
                  </p>
                ) : null}
              </article>
            ))}
            {data.hasMore ? (
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => applyFilters(data.offset + data.pageSize, true)}
              >
                Load more
              </Button>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
