"use client";

/**
 * Purpose:
 * Purchase order list — filter by status and supplier.
 */

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState } from "@/components/platform";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { listPurchaseOrdersAction } from "@/modules/procurement/actions/purchase-order-actions";
import type {
  PurchaseOrderListFilter,
  PurchaseOrderListView,
} from "@/modules/procurement/types";

type PurchaseOrderListProps = {
  initialRows: PurchaseOrderListView[];
  initialStatus?: PurchaseOrderListFilter["status"];
};

const FILTERS: { id: PurchaseOrderListFilter["status"]; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "pending-approval", label: "Pending approval" },
  { id: "issued", label: "Issued" },
  { id: "accepted", label: "Accepted" },
  { id: "closed", label: "Closed" },
  { id: "cancelled", label: "Cancelled" },
];

export function PurchaseOrderList({
  initialRows,
  initialStatus = "all",
}: PurchaseOrderListProps) {
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PurchaseOrderListFilter["status"]>(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const counts = useMemo(
    () => ({
      draft: initialRows.filter((row) => row.status === "DRAFT").length,
      pending: initialRows.filter((row) => row.status === "PENDING_APPROVAL").length,
      issued: initialRows.filter((row) => row.status === "ISSUED").length,
    }),
    [initialRows]
  );

  function refresh(nextQuery: string, nextStatus: PurchaseOrderListFilter["status"]) {
    startTransition(async () => {
      const result = await listPurchaseOrdersAction({
        query: nextQuery,
        status: nextStatus,
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setError(null);
      setRows(result.data);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/procurement" label="Procurement" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Purchase orders</h1>
            <p className="text-sm text-muted-foreground">
              Issue and track commercial orders to suppliers.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        <span>{counts.draft} draft</span>
        <span>·</span>
        <span>{counts.pending} pending approval</span>
        <span>·</span>
        <span>{counts.issued} issued</span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search by PO number or supplier"
          value={query}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            refresh(next, status);
          }}
          disabled={isPending}
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                status === filter.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              )}
              onClick={() => {
                setStatus(filter.id);
                refresh(query, filter.id);
              }}
              disabled={isPending}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {rows.length === 0 ? (
        <PlatformEmptyState
          title="No purchase orders yet"
          description="Purchase orders appear here after award or approved request generation."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="min-w-full divide-y text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium">PO number</th>
                <th className="px-4 py-3 text-left font-medium">Supplier</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y bg-background">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link
                      href={`/procurement/orders/${row.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {row.poNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{row.supplierName}</td>
                  <td className="px-4 py-3">{row.statusLabel}</td>
                  <td className="px-4 py-3 text-right">
                    {row.currencyCode} {row.totalAmount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
