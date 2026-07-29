/**
 * Purpose:
 * Party Workspace Audit History tab — immutable system change log.
 *
 * Implementation Package:
 * BP-002 / IP-011 – Enterprise Audit History
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
import type { AuditHistoryDetailView } from "@/core/audit/types";
import {
  getPartyAuditDetailAction,
  listPartyAuditHistoryAction,
  loadMorePartyAuditHistoryAction,
} from "@/modules/party/actions/party-audit-actions";
import type {
  PartyAuditHistoryEntryView,
  PartyAuditHistoryPanelView,
} from "@/modules/party/types";

type PartyAuditHistoryPanelProps = {
  partyId: string;
  initialData: PartyAuditHistoryPanelView;
};

type AuditFilters = {
  operation: string;
  entityName: string;
  changedBy: string;
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

function truncateValue(value: string | null, max = 48): string {
  if (!value) {
    return "—";
  }
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function AuditDetailPanel({
  detail,
  onClose,
}: {
  detail: AuditHistoryDetailView;
  onClose: () => void;
}) {
  const allChanges = [detail, ...detail.relatedChanges];

  return (
    <div className="mt-3 space-y-3 rounded-md border bg-muted/30 p-4 text-sm">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold">Audit Detail</h4>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <dl className="grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="font-medium text-muted-foreground">Who</dt>
          <dd>{detail.changedByName ?? "System"}</dd>
        </div>
        <div>
          <dt className="font-medium text-muted-foreground">When</dt>
          <dd>{formatDateTime(detail.changedDateTime)}</dd>
        </div>
        <div>
          <dt className="font-medium text-muted-foreground">Operation</dt>
          <dd>{detail.operationLabel}</dd>
        </div>
        <div>
          <dt className="font-medium text-muted-foreground">Entity</dt>
          <dd>
            {detail.entityLabel} ({detail.entityId})
          </dd>
        </div>
        <div>
          <dt className="font-medium text-muted-foreground">Module</dt>
          <dd>{detail.sourceModuleLabel}</dd>
        </div>
        {detail.ipAddress ? (
          <div>
            <dt className="font-medium text-muted-foreground">IP Address</dt>
            <dd>{detail.ipAddress}</dd>
          </div>
        ) : null}
        {detail.browserClient ? (
          <div className="sm:col-span-2">
            <dt className="font-medium text-muted-foreground">Client</dt>
            <dd className="break-all">{detail.browserClient}</dd>
          </div>
        ) : null}
      </dl>

      <div>
        <p className="mb-2 font-medium">Fields Changed</p>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead className="bg-muted/60">
              <tr>
                <th className="px-3 py-2 font-medium">Field</th>
                <th className="px-3 py-2 font-medium">Old Value</th>
                <th className="px-3 py-2 font-medium">New Value</th>
              </tr>
            </thead>
            <tbody>
              {allChanges.map((change) => (
                <tr key={change.id} className="border-t">
                  <td className="px-3 py-2">{change.fieldName ?? "—"}</td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground">
                    {change.oldValue ?? "—"}
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2">
                    {change.newValue ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detail.metadata ? (
        <div>
          <p className="mb-1 font-medium">Metadata</p>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-background p-2 text-xs">
            {JSON.stringify(detail.metadata, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function AuditRow({
  entry,
  expandedId,
  detail,
  isLoadingDetail,
  onToggle,
}: {
  entry: PartyAuditHistoryEntryView;
  expandedId: string | null;
  detail: AuditHistoryDetailView | null;
  isLoadingDetail: boolean;
  onToggle: (auditId: string) => void;
}) {
  const isExpanded = expandedId === entry.id;

  return (
    <>
      <tr className="border-t hover:bg-muted/30">
        <td className="whitespace-nowrap px-3 py-2 text-xs">
          {formatDateTime(entry.changedDateTime)}
        </td>
        <td className="px-3 py-2 text-xs">{entry.changedByName ?? "System"}</td>
        <td className="px-3 py-2 text-xs">{entry.operationLabel}</td>
        <td className="px-3 py-2 text-xs">{entry.entityLabel}</td>
        <td className="px-3 py-2 text-xs">{entry.fieldName ?? "—"}</td>
        <td className="max-w-[120px] truncate px-3 py-2 text-xs text-muted-foreground">
          {truncateValue(entry.oldValue)}
        </td>
        <td className="max-w-[120px] truncate px-3 py-2 text-xs">
          {truncateValue(entry.newValue)}
        </td>
        <td className="px-3 py-2 text-xs">{entry.sourceModuleLabel}</td>
        <td className="px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={isLoadingDetail}
            onClick={() => onToggle(entry.id)}
          >
            {isExpanded ? "Hide" : "Details"}
            <ChevronDownIcon
              className={cn(
                "ml-1 size-3 transition-transform",
                isExpanded && "rotate-180"
              )}
            />
          </Button>
        </td>
      </tr>
      {isExpanded && detail ? (
        <tr className="border-t bg-muted/20">
          <td colSpan={9} className="px-3 py-2">
            <AuditDetailPanel detail={detail} onClose={() => onToggle(entry.id)} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function PartyAuditHistoryPanel({
  partyId,
  initialData,
}: PartyAuditHistoryPanelProps) {
  const [panel, setPanel] = useState(initialData);
  const [syncedInitial, setSyncedInitial] = useState(initialData);
  const [syncedPartyId, setSyncedPartyId] = useState(partyId);
  const [filters, setFilters] = useState<AuditFilters>({
    operation: "",
    entityName: "",
    changedBy: "",
    search: "",
    dateFrom: "",
    dateTo: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AuditHistoryDetailView | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  if (partyId !== syncedPartyId) {
    setSyncedPartyId(partyId);
    setError(null);
    setExpandedId(null);
    setDetail(null);
  }

  if (initialData !== syncedInitial) {
    setSyncedInitial(initialData);
    setPanel(initialData);
  }

  const activeFilterCount = useMemo(
    () =>
      [
        filters.operation,
        filters.entityName,
        filters.changedBy,
        filters.search,
        filters.dateFrom,
        filters.dateTo,
      ].filter(Boolean).length,
    [filters]
  );

  function buildFilterPayload(offset = 0) {
    return {
      operation: filters.operation || undefined,
      entityName: filters.entityName || undefined,
      changedBy: filters.changedBy || undefined,
      search: filters.search || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      limit: panel.pageSize,
      offset,
    };
  }

  function applyFilterResult(
    result:
      | { success: true; data: PartyAuditHistoryPanelView }
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
            entries: [...current.entries, ...result.data.entries],
          }
        : result.data
    );
  }

  function onApplyFilters() {
    setError(null);
    setExpandedId(null);
    setDetail(null);
    startTransition(async () => {
      const result = await listPartyAuditHistoryAction(
        partyId,
        buildFilterPayload(0)
      );
      applyFilterResult(result);
    });
  }

  function onClearFilters() {
    const cleared: AuditFilters = {
      operation: "",
      entityName: "",
      changedBy: "",
      search: "",
      dateFrom: "",
      dateTo: "",
    };
    setFilters(cleared);
    setError(null);
    setExpandedId(null);
    setDetail(null);
    startTransition(async () => {
      const result = await listPartyAuditHistoryAction(partyId, {
        limit: panel.pageSize,
        offset: 0,
      });
      applyFilterResult(result);
    });
  }

  function onLoadMore() {
    setError(null);
    startTransition(async () => {
      const result = await loadMorePartyAuditHistoryAction(
        partyId,
        buildFilterPayload(panel.offset + panel.entries.length)
      );
      applyFilterResult(result, true);
    });
  }

  async function onToggleDetail(auditId: string) {
    if (expandedId === auditId) {
      setExpandedId(null);
      setDetail(null);
      return;
    }

    setExpandedId(auditId);
    setIsLoadingDetail(true);
    setError(null);

    const result = await getPartyAuditDetailAction(partyId, auditId);
    setIsLoadingDetail(false);

    if (!result.success) {
      setError(result.error.message);
      setExpandedId(null);
      return;
    }

    setDetail(result.data);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit History</CardTitle>
          <CardDescription>
            Immutable record of system changes — who changed what, when, from,
            and to. This is not the business timeline.
            {activeFilterCount > 0
              ? ` ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active.`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-1.5">
            <Label htmlFor="audit-operation">Operation</Label>
            <select
              id="audit-operation"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              value={filters.operation}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  operation: event.target.value,
                }))
              }
            >
              <option value="">All operations</option>
              {panel.filterOptions.operations.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="audit-entity">Entity</Label>
            <select
              id="audit-entity"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              value={filters.entityName}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  entityName: event.target.value,
                }))
              }
            >
              <option value="">All entities</option>
              {panel.filterOptions.entities.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="audit-user">User</Label>
            <select
              id="audit-user"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              value={filters.changedBy}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  changedBy: event.target.value,
                }))
              }
            >
              <option value="">All users</option>
              {panel.filterOptions.users.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="audit-date-from">From</Label>
            <Input
              id="audit-date-from"
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
            <Label htmlFor="audit-date-to">To</Label>
            <Input
              id="audit-date-to"
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

          <div className="space-y-1.5">
            <Label htmlFor="audit-search">Search</Label>
            <Input
              id="audit-search"
              placeholder="Field, value, entity…"
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
            />
          </div>

          <div className="flex items-end gap-2 xl:col-span-6">
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Change Log ({panel.totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {panel.entries.length === 0 ? (
            <PlatformEmptyState
              title="No Audit Records Yet"
              description="Changes to this party and related entities will appear here."
              compact
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">User</th>
                    <th className="px-3 py-2 font-medium">Operation</th>
                    <th className="px-3 py-2 font-medium">Entity</th>
                    <th className="px-3 py-2 font-medium">Field</th>
                    <th className="px-3 py-2 font-medium">Old Value</th>
                    <th className="px-3 py-2 font-medium">New Value</th>
                    <th className="px-3 py-2 font-medium">Module</th>
                    <th className="px-3 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {panel.entries.map((entry) => (
                    <AuditRow
                      key={entry.id}
                      entry={entry}
                      expandedId={expandedId}
                      detail={expandedId === entry.id ? detail : null}
                      isLoadingDetail={isLoadingDetail}
                      onToggle={onToggleDetail}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {panel.hasMore ? (
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={onLoadMore}
              >
                {isPending ? "Loading…" : "Load more"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
