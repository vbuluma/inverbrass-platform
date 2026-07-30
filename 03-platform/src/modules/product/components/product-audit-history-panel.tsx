/**
 * Purpose:
 * Product Workspace Audit History tab.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

"use client";

import { useState, useTransition } from "react";

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
import {
  getProductAuditDetailAction,
  listProductAuditHistoryAction,
  loadMoreProductAuditHistoryAction,
} from "@/modules/product/actions/product-audit-actions";
import type { ProductAuditHistoryPanelView } from "@/modules/product/types";

type ProductAuditHistoryPanelProps = {
  productId: string;
  initialData: ProductAuditHistoryPanelView;
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

export function ProductAuditHistoryPanel({
  productId,
  initialData,
}: ProductAuditHistoryPanelProps) {
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailText, setDetailText] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function applyFilters(nextOffset = 0, append = false) {
    startTransition(async () => {
      setError(null);
      const action =
        nextOffset > 0
          ? loadMoreProductAuditHistoryAction
          : listProductAuditHistoryAction;
      const result = await action(productId, {
        search: search || undefined,
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
              entries: [...current.entries, ...result.data.entries],
            }
          : result.data
      );
    });
  }

  function loadDetail(auditId: string) {
    startTransition(async () => {
      const result = await getProductAuditDetailAction(auditId);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setDetailId(auditId);
      setDetailText(
        [
          result.data.operationLabel,
          result.data.fieldName ?? "Record",
          result.data.oldValue ?? "—",
          result.data.newValue ?? "—",
        ].join(" · ")
      );
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit History</CardTitle>
        <CardDescription>
          Immutable record of product changes and lifecycle events.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1 space-y-1">
            <Label htmlFor="audit-search">Search</Label>
            <Input
              id="audit-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Button type="button" onClick={() => applyFilters()} disabled={isPending}>
            Apply
          </Button>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {detailId && detailText ? (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <p>{detailText}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDetailId(null);
                  setDetailText(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        ) : null}

        {data.entries.length === 0 ? (
          <PlatformEmptyState
            title="No Audit Entries"
            description="Create, update, and lifecycle actions will be recorded here."
          />
        ) : (
          <div className="space-y-2">
            {data.entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
                onClick={() => loadDetail(entry.id)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">
                    {formatDateTime(entry.changedDateTime)}
                  </span>
                  <span className="text-xs font-medium">{entry.operationLabel}</span>
                </div>
                <p className="mt-1 font-medium">
                  {entry.fieldName
                    ? `${entry.fieldName}: ${entry.oldValue ?? "—"} → ${entry.newValue ?? "—"}`
                    : entry.entityLabel}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {entry.changedByName ?? "System"} · {entry.sourceModuleLabel}
                </p>
              </button>
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
