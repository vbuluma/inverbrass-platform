/**
 * Purpose:
 * Party Workspace Timeline tab — chronological activity feed with filters.
 *
 * Implementation Package:
 * BP-002 / IP-010 – Party Timeline & Activity History
 */

"use client";

import { ChevronDownIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  listPartyTimelineAction,
  loadMorePartyTimelineAction,
} from "@/modules/party/actions/party-timeline-actions";
import type {
  PartyTimelineEventView,
  PartyTimelinePanelView,
} from "@/modules/party/types";

type PartyTimelinePanelProps = {
  partyId: string;
  initialData: PartyTimelinePanelView;
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

function TimelineEventCard({ event }: { event: PartyTimelineEventView }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails =
    Boolean(event.description) ||
    Boolean(event.referenceEntity) ||
    Boolean(event.metadata);

  return (
    <article className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <time className="text-sm font-medium text-muted-foreground">
          {formatDateTime(event.eventDateTime)}
        </time>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
          {event.eventCategoryLabel}
        </span>
      </div>

      <h3 className="mt-2 text-base font-semibold">{event.summary}</h3>

      <dl className="mt-3 space-y-1 text-sm text-muted-foreground">
        {event.performedByName ? (
          <div className="flex flex-wrap gap-x-1">
            <dt className="font-medium text-foreground">Performed by</dt>
            <dd>{event.performedByName}</dd>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-x-1">
          <dt className="font-medium text-foreground">Module</dt>
          <dd>{event.sourceModuleLabel}</dd>
        </div>
      </dl>

      {hasDetails ? (
        <div className="mt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Hide details" : "View details"}
            <ChevronDownIcon
              className={cn(
                "ml-1 size-3.5 transition-transform",
                expanded && "rotate-180"
              )}
            />
          </Button>
          {expanded ? (
            <div className="mt-2 space-y-2 rounded-md bg-muted/40 p-3 text-sm">
              {event.description ? (
                <p className="text-muted-foreground">{event.description}</p>
              ) : null}
              {event.referenceEntity ? (
                <p>
                  <span className="font-medium">Reference: </span>
                  {event.referenceEntity}
                  {event.referenceId ? ` (${event.referenceId})` : ""}
                </p>
              ) : null}
              {event.metadata ? (
                <pre className="overflow-x-auto whitespace-pre-wrap text-xs">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function PartyTimelinePanel({
  partyId,
  initialData,
}: PartyTimelinePanelProps) {
  const [panel, setPanel] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [syncedPartyId, setSyncedPartyId] = useState(partyId);
  const [filters, setFilters] = useState<TimelineFilters>({
    category: "",
    sourceModule: "",
    search: "",
    dateFrom: "",
    dateTo: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (partyId !== syncedPartyId) {
    setSyncedPartyId(partyId);
    setError(null);
  }

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setPanel(initialData);
  }

  const activeFilterCount = useMemo(
    () =>
      [filters.category, filters.sourceModule, filters.search, filters.dateFrom, filters.dateTo]
        .filter(Boolean).length,
    [filters]
  );

  function buildFilterPayload(offset = 0) {
    return {
      category: filters.category || undefined,
      sourceModule: filters.sourceModule || undefined,
      search: filters.search || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      limit: panel.pageSize,
      offset,
    };
  }

  function applyFilterResult(
    result:
      | { success: true; data: PartyTimelinePanelView }
      | { success: false; error: { message: string } },
    append = false
  ) {
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setError(null);
    setPanel((current) =>
      append
        ? {
            ...result.data,
            events: [...current.events, ...result.data.events],
          }
        : result.data
    );
  }

  function onApplyFilters() {
    setError(null);
    startTransition(async () => {
      const result = await listPartyTimelineAction(
        partyId,
        buildFilterPayload(0)
      );
      applyFilterResult(result);
    });
  }

  function onClearFilters() {
    const cleared: TimelineFilters = {
      category: "",
      sourceModule: "",
      search: "",
      dateFrom: "",
      dateTo: "",
    };
    setFilters(cleared);
    setError(null);
    startTransition(async () => {
      const result = await listPartyTimelineAction(partyId, {
        limit: panel.pageSize,
        offset: 0,
      });
      applyFilterResult(result);
    });
  }

  function onLoadMore() {
    setError(null);
    startTransition(async () => {
      const result = await loadMorePartyTimelineAction(
        partyId,
        buildFilterPayload(panel.offset + panel.events.length)
      );
      applyFilterResult(result, true);
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Party Timeline & Activity History
          </CardTitle>
          <CardDescription>
            Chronological history of important events for this party.
            {activeFilterCount > 0
              ? ` ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active.`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor="timeline-category">Category</Label>
            <select
              id="timeline-category"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              value={filters.category}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
            >
              <option value="">All categories</option>
              {panel.filterOptions.categories.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="timeline-source-module">Source module</Label>
            <select
              id="timeline-source-module"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              value={filters.sourceModule}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  sourceModule: event.target.value,
                }))
              }
            >
              <option value="">All modules</option>
              {panel.filterOptions.sourceModules.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="timeline-date-from">From</Label>
            <Input
              id="timeline-date-from"
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

          <div className="space-y-1.5">
            <Label htmlFor="timeline-date-to">To</Label>
            <Input
              id="timeline-date-to"
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

          <div className="space-y-1.5 md:col-span-2 lg:col-span-3 xl:col-span-1">
            <Label htmlFor="timeline-search">Search</Label>
            <Input
              id="timeline-search"
              placeholder="Search summary or description"
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
            />
          </div>

          <div className="flex items-end gap-2 md:col-span-2 lg:col-span-3 xl:col-span-5">
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={onApplyFilters}
            >
              Apply filters
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={onClearFilters}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {panel.events.length === 0 ? (
        <PlatformEmptyState
          title="No Timeline Events Yet"
          description="Activity will appear here as changes are recorded for this party."
        />
      ) : (
        <div className="space-y-3">
          {panel.events.map((event) => (
            <TimelineEventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {panel.hasMore ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={onLoadMore}
          >
            {isPending ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}

      {panel.totalCount > 0 ? (
        <p className="text-center text-xs text-muted-foreground">
          Showing {panel.events.length} of {panel.totalCount} events
        </p>
      ) : null}
    </div>
  );
}
