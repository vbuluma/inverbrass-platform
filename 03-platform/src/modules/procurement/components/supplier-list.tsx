"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState, PlatformSearchState } from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { listProcurementSuppliersAction } from "@/modules/procurement/actions/procurement-actions";
import type { SupplierListFilter, SupplierListView } from "@/modules/procurement/types";

type SupplierListProps = {
  initialRows: SupplierListView[];
};

const FILTERS: { id: SupplierListFilter["status"]; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "preferred", label: "Preferred" },
  { id: "pending", label: "Pending" },
  { id: "restricted", label: "Restricted" },
];

export function SupplierList({ initialRows }: SupplierListProps) {
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SupplierListFilter["status"]>("all");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const counts = useMemo(
    () => ({
      active: initialRows.filter((row) => row.statusCode === "ACTIVE").length,
      preferred: initialRows.filter((row) => row.isPreferred).length,
      pending: initialRows.filter((row) => row.qualificationStatusCode === "PENDING").length,
      restricted: initialRows.filter(
        (row) => row.statusCode === "SUSPENDED" || row.statusCode === "BLACKLISTED"
      ).length,
    }),
    [initialRows]
  );

  function refresh(nextQuery: string, nextStatus: SupplierListFilter["status"]) {
    startTransition(async () => {
      const result = await listProcurementSuppliersAction({
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
            <h1 className="text-2xl font-semibold">Suppliers</h1>
            <p className="text-sm text-muted-foreground">
              Search parties that already have a procurement profile.
            </p>
          </div>
          <Link href="/procurement/suppliers/new" className={cn(buttonVariants(), "h-10")}>
            Add supplier
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-muted px-3 py-1">Active {counts.active}</span>
        <span className="rounded-full bg-muted px-3 py-1">Preferred {counts.preferred}</span>
        <span className="rounded-full bg-muted px-3 py-1">Pending {counts.pending}</span>
        <span className="rounded-full bg-muted px-3 py-1">Restricted {counts.restricted}</span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={query}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            refresh(value, status);
          }}
          placeholder="Search suppliers..."
          aria-label="Search suppliers"
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={cn(
                buttonVariants({ variant: status === filter.id ? "default" : "outline" }),
                "h-9"
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

      <PlatformSearchState
        status={isPending ? "searching" : error ? "error" : rows.length === 0 ? "empty" : "success"}
        errorMessage={error ?? undefined}
        emptyTitle="No suppliers found"
        emptyHints={["A different name or number", "Clearing filters", "Add a supplier"]}
        createLabel="Add supplier"
        onCreate={() => {
          window.location.href = "/procurement/suppliers/new";
        }}
        onRetry={() => refresh(query, status)}
      >
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Supplier</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Qualification</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-3">
                    <Link
                      href={`/procurement/suppliers/${row.id}`}
                      className="font-medium hover:underline"
                    >
                      {row.partyName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{row.partyNumber}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.categories.join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">{row.displayStatusLabel}</td>
                  <td className="px-4 py-3">{row.qualificationLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PlatformSearchState>

      {initialRows.length === 0 && rows.length === 0 && !query ? (
        <PlatformEmptyState
          title="No procurement suppliers yet"
          description="Link an existing party, confirm the supplier role, and create a procurement profile."
          actionLabel="Add supplier"
          actionHref="/procurement/suppliers/new"
        />
      ) : null}
    </main>
  );
}
