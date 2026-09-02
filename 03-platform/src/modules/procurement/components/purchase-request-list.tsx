"use client";

/**
 * Purpose:
 * Purchase request list — my requests, pending approval, approved.
 */

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState } from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { listPurchaseRequestsAction } from "@/modules/procurement/actions/purchase-request-actions";
import type {
  PurchaseRequestListFilter,
  PurchaseRequestListView,
} from "@/modules/procurement/types";

type PurchaseRequestListProps = {
  initialRows: PurchaseRequestListView[];
  initialStatus?: PurchaseRequestListFilter["status"];
};

const FILTERS: { id: PurchaseRequestListFilter["status"]; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "pending-approval", label: "Pending approval" },
  { id: "approved", label: "Approved" },
  { id: "returned", label: "Returned" },
  { id: "rejected", label: "Rejected" },
];

export function PurchaseRequestList({
  initialRows,
  initialStatus = "all",
}: PurchaseRequestListProps) {
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<PurchaseRequestListFilter["status"]>(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const counts = useMemo(
    () => ({
      draft: initialRows.filter((row) => row.status === "DRAFT").length,
      pending: initialRows.filter(
        (row) => row.status === "IN_APPROVAL" || row.status === "SUBMITTED"
      ).length,
      approved: initialRows.filter((row) => row.status === "APPROVED").length,
    }),
    [initialRows]
  );

  function refresh(nextQuery: string, nextStatus: PurchaseRequestListFilter["status"]) {
    startTransition(async () => {
      const result = await listPurchaseRequestsAction({
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
            <h1 className="text-2xl font-semibold">Purchase requests</h1>
            <p className="text-sm text-muted-foreground">
              Capture what the business needs and send it for approval.
            </p>
          </div>
          <Link href="/procurement/requests/new" className={cn(buttonVariants(), "h-10")}>
            New request
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-muted px-3 py-1">Draft {counts.draft}</span>
        <span className="rounded-full bg-muted px-3 py-1">Pending approval {counts.pending}</span>
        <span className="rounded-full bg-muted px-3 py-1">Approved {counts.approved}</span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={query}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            refresh(value, status);
          }}
          placeholder="Search requests..."
          aria-label="Search purchase requests"
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                status === filter.id ? "border-sky-600 bg-sky-50 text-sky-900" : "bg-background"
              )}
              onClick={() => {
                setStatus(filter.id);
                refresh(query, filter.id);
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {rows.length === 0 ? (
        <PlatformEmptyState
          title={isPending ? "Loading requests..." : "No purchase requests"}
          description="Create a request to start a controlled purchase."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Request</th>
                <th className="px-4 py-3 font-medium">Need</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Origin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-3">
                    <Link
                      href={`/procurement/requests/${row.id}`}
                      className="font-medium text-sky-800 hover:underline"
                    >
                      {row.requestNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{row.need}</td>
                  <td className="px-4 py-3">
                    {row.currencyCode} {row.estimatedValue}
                  </td>
                  <td className="px-4 py-3">{row.statusLabel}</td>
                  <td className="px-4 py-3">{row.originLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
